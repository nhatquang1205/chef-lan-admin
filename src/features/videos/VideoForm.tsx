import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ImagePlus, Loader2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/FieldLabel'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import type { LessonVideoRequest, LessonVideoResponse, VideoProvider } from '@/lib/api/types'
import { readVideoDuration, UploadAbortedError, uploadImage, uploadVideo, validateImage } from '@/lib/api/uploads'
import { createVideo, updateVideo } from '@/lib/api/videos'
import { formatClock, parseClock, VIDEO_PROVIDER_LABEL } from '@/lib/format'

const PROVIDERS = Object.keys(VIDEO_PROVIDER_LABEL) as VideoProvider[]

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const optionalUrl = z
  .string()
  .max(1000, 'Tối đa 1000 ký tự.')
  .refine((v) => v.trim() === '' || isHttpUrl(v.trim()), 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.')

const schema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên video.').max(200, 'Tối đa 200 ký tự.'),
    description: z.string(),
    provider: z.enum(['None', 'YouTube', 'Vimeo', 'Cdn', 'Facebook', 'Bunny']),
    externalId: z.string().trim().max(100, 'Tối đa 100 ký tự.'),
    url: optionalUrl,
    thumbnailUrl: optionalUrl,
    duration: z.string().refine((v) => parseClock(v) !== null, 'Nhập theo dạng mm:ss, ví dụ 12:30.'),
    isFree: z.boolean(),
    freeTill: z.string(),
    isPublished: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })

    if (v.isFree && v.freeTill.trim() !== '') {
      const seconds = Number(v.freeTill)
      const duration = parseClock(v.duration) ?? 0
      if (!/^\d+$/.test(v.freeTill.trim()) || seconds <= 0) {
        issue('freeTill', 'Nhập số giây lớn hơn 0.')
      } else if (duration > 0 && seconds >= duration) {
        issue('freeTill', 'Phải nhỏ hơn thời lượng video.')
      }
    }

    if (v.isPublished) {
      if (v.provider === 'Bunny' && v.externalId === '') {
        issue('externalId', 'Video đã hiển thị cần có mã video Bunny.')
      } else if (v.provider !== 'Bunny' && v.provider !== 'None' && v.url.trim() === '') {
        issue('url', 'Video đã hiển thị cần có đường dẫn.')
      }
    }
  })

type FormValues = z.infer<typeof schema>

function toValues(video?: LessonVideoResponse): FormValues {
  return {
    title: video?.title ?? '',
    description: video?.description ?? '',
    provider: video?.provider ?? 'Bunny',
    externalId: video?.externalId ?? '',
    url: video?.url ?? '',
    thumbnailUrl: video?.thumbnailUrl ?? '',
    duration: video ? formatClock(video.durationSeconds) : '',
    isFree: video?.isFree ?? false,
    freeTill: video?.freeTillSeconds != null ? String(video.freeTillSeconds) : '',
    isPublished: video?.isPublished ?? true,
  }
}

const orNull = (value: string) => (value.trim() === '' ? null : value.trim())

function toRequest(values: FormValues): LessonVideoRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim() === '' ? null : values.description,
    provider: values.provider,
    externalId: values.provider === 'Bunny' ? orNull(values.externalId) : null,
    url: values.provider === 'Bunny' || values.provider === 'None' ? null : orNull(values.url),
    thumbnailUrl: orNull(values.thumbnailUrl),
    durationSeconds: parseClock(values.duration) ?? 0,
    isFree: values.isFree,
    freeTillSeconds: values.isFree && values.freeTill.trim() !== '' ? Number(values.freeTill) : null,
    isPublished: values.isPublished,
  }
}

function Field({ label, htmlFor, hint, error, required, children }: {
  label: string
  required?: boolean
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={htmlFor} required={required}>{label}</FieldLabel>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface Props {
  lessonId: number
  courseId: number
  video?: LessonVideoResponse
  onSaved: () => void
  onCancel: () => void
  onBusyChange?: (busy: boolean) => void
}

export default function VideoForm({ lessonId, courseId, video, onSaved, onCancel, onBusyChange }: Props) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(video) })

  const provider = useWatch({ control, name: 'provider' })
  const isFree = useWatch({ control, name: 'isFree' })
  const isPublished = useWatch({ control, name: 'isPublished' })
  const thumbnailUrl = useWatch({ control, name: 'thumbnailUrl' })

  const [progress, setProgress] = useState<number | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const uploading = progress !== null
  const busy = uploading || imageUploading

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange])

  useEffect(() => {
    if (!uploading) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [uploading])

  useEffect(() => () => abortRef.current?.abort(), [])

  const startVideoUpload = async (file: File) => {
    const title = getValues('title').trim() || file.name.replace(/\.[^.]+$/, '')
    const controller = new AbortController()
    abortRef.current = controller
    setProgress(0)

    const duration = await readVideoDuration(file)
    if (duration !== null && getValues('duration').trim() === '') {
      setValue('duration', formatClock(duration), { shouldDirty: true, shouldValidate: true })
    }

    try {
      const result = await uploadVideo(file, title, { onProgress: setProgress, signal: controller.signal })
      setValue('externalId', result.videoId, { shouldDirty: true, shouldValidate: true })
      toast.success('Đã tải video lên. Bunny cần vài phút để xử lý.')
    } catch (error) {
      if (error instanceof UploadAbortedError) {
        toast.info('Đã hủy tải video lên.')
      } else if (error instanceof ApiError && error.status === 0) {
        toast.error('Tải lên bị gián đoạn.')
      } else {
        toast.error(messageFor(error))
      }
    } finally {
      abortRef.current = null
      setProgress(null)
    }
  }

  const cancelUpload = () => abortRef.current?.abort()

  const startImageUpload = async (file: File) => {
    const problem = validateImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setImageUploading(true)
    try {
      const { url } = await uploadImage(file)
      setValue('thumbnailUrl', url, { shouldDirty: true, shouldValidate: true })
    } catch (error) {
      toast.error(messageFor(error))
    } finally {
      setImageUploading(false)
    }
  }

  const takeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    return file
  }
  const onVideoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(e)
    if (file) void startVideoUpload(file)
  }
  const onImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(e)
    if (file) void startImageUpload(file)
  }

  const save = useMutation({
    mutationFn: (request: LessonVideoRequest) =>
      video ? updateVideo(video.id, courseId, request) : createVideo(lessonId, courseId, request),
  })

  const submit = async (values: FormValues) => {
    try {
      await save.mutateAsync(toRequest(values))
    } catch (error) {
      const known = Object.keys(toValues())
      const aliases: Record<string, keyof FormValues> = {
        durationSeconds: 'duration',
        freeTillSeconds: 'freeTill',
        source: provider === 'Bunny' ? 'externalId' : 'url',
      }
      let mapped = false
      for (const [key, message] of Object.entries(fieldErrors(error))) {
        const field = aliases[key] ?? (known.includes(key) ? (key as keyof FormValues) : null)
        if (field) {
          setError(field, { message })
          mapped = true
        }
      }
      if (!mapped) toast.error(messageFor(error))
      return
    }
    toast.success('Đã lưu video.')
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <Field label="Tên video" required htmlFor="video-title" error={errors.title?.message}>
        <Input id="video-title" aria-invalid={!!errors.title} {...register('title')} />
      </Field>
      <Field label="Mô tả" htmlFor="video-description" error={errors.description?.message}>
        <Textarea id="video-description" rows={3} {...register('description')} />
      </Field>
      <Field label="Nguồn video" htmlFor="video-provider">
        <Controller
          control={control}
          name="provider"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="video-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {VIDEO_PROVIDER_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      {provider === 'Bunny' && (
        <Field label="Mã video Bunny" required={isPublished} htmlFor="video-externalId" error={errors.externalId?.message}>
          <div className="flex gap-2">
            <Input id="video-externalId" className="flex-1" aria-invalid={!!errors.externalId} {...register('externalId')} />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={onVideoPicked}
            />
            <Button type="button" variant="outline" disabled={uploading || save.isPending} onClick={() => videoInputRef.current?.click()}>
              <Upload />
              Tải video lên
            </Button>
          </div>
          {uploading && (
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1" />
              <span className="w-10 text-right text-xs text-muted-foreground">{progress}%</span>
              <Button type="button" variant="outline" size="sm" onClick={cancelUpload}>
                Hủy
              </Button>
            </div>
          )}
        </Field>
      )}
      {provider !== 'Bunny' && provider !== 'None' && (
        <Field label="Đường dẫn video" required={isPublished} htmlFor="video-url" error={errors.url?.message}>
          <Input id="video-url" placeholder="https://..." aria-invalid={!!errors.url} {...register('url')} />
        </Field>
      )}
      <Field label="Ảnh bìa (URL)" htmlFor="video-thumbnailUrl" error={errors.thumbnailUrl?.message}>
        <div className="flex gap-2">
          <Input
            id="video-thumbnailUrl"
            className="flex-1"
            placeholder="https://..."
            aria-invalid={!!errors.thumbnailUrl}
            {...register('thumbnailUrl')}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onImagePicked}
          />
          <Button type="button" variant="outline" disabled={imageUploading} onClick={() => imageInputRef.current?.click()}>
            {imageUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            Tải ảnh lên
          </Button>
        </div>
        {isHttpUrl(thumbnailUrl.trim()) && (
          <img src={thumbnailUrl.trim()} alt="" className="h-24 w-auto max-w-full self-start rounded-md border object-cover" />
        )}
      </Field>
      <Field label="Thời lượng" htmlFor="video-duration" hint="Dạng mm:ss, ví dụ 12:30." error={errors.duration?.message}>
        <Input id="video-duration" className="max-w-40" placeholder="00:00" aria-invalid={!!errors.duration} {...register('duration')} />
      </Field>
      <Controller
        control={control}
        name="isFree"
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <Switch id="video-isFree" checked={field.value} onCheckedChange={field.onChange} />
            <FieldLabel htmlFor="video-isFree">Cho xem miễn phí</FieldLabel>
          </div>
        )}
      />
      {isFree && (
        <Field
          label="Miễn phí đến giây thứ"
          htmlFor="video-freeTill"
          hint="Để trống nếu cho xem miễn phí cả video."
          error={errors.freeTill?.message}
        >
          <Input
            id="video-freeTill"
            className="max-w-40"
            inputMode="numeric"
            aria-invalid={!!errors.freeTill}
            {...register('freeTill')}
          />
        </Field>
      )}
      <Controller
        control={control}
        name="isPublished"
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <Switch id="video-isPublished" checked={field.value} onCheckedChange={field.onChange} />
            <FieldLabel htmlFor="video-isPublished">Hiển thị</FieldLabel>
          </div>
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={save.isPending || uploading} onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={save.isPending || busy || (!!video && !isDirty)}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {video ? 'Lưu thay đổi' : 'Thêm video'}
        </Button>
      </div>
    </form>
  )
}
