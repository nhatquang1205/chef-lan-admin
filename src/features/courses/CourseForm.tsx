import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, ImageOff, Loader2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import VndInput from '@/components/VndInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import FieldLabel, { RequiredMark } from '@/components/FieldLabel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { listCategories } from '@/lib/api/categories'
import { createCourse, updateCourse, type CourseInput } from '@/lib/api/courses'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import type { CourseAdminDetailResponse } from '@/lib/api/types'
import { useUnsavedChangesPrompt } from '@/lib/useUnsavedChangesPrompt'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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

const thumbnailSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({
    kind: z.literal('url'),
    url: z
      .string()
      .max(1000, 'Tối đa 1000 ký tự.')
      .refine((v) => isHttpUrl(v.trim()), 'Nhập đường dẫn ảnh hợp lệ (http:// hoặc https://).'),
  }),
  z.object({ kind: z.literal('file'), file: z.instanceof(File) }),
])

const schema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên khóa học.').max(200, 'Tối đa 200 ký tự.'),
    subtitle: z.string().max(300, 'Tối đa 300 ký tự.'),
    description: z.string(),
    whatYouWillLearn: z.string(),
    metaDescription: z.string().max(300, 'Tối đa 300 ký tự.'),
    priceVnd: z
      .number({ error: 'Vui lòng nhập giá.' })
      .nullable()
      .refine((v): boolean => v !== null, 'Vui lòng nhập giá.')
      .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'Giá phải là số nguyên không âm.'),
    compareAtPriceVnd: z.number().nullable(),
    accessDurationDays: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Nhập số ngày nguyên dương hoặc để trống (trọn đời).'),
    level: z.enum(['Unspecified', 'Beginner', 'Intermediate', 'Advanced']),
    categoryIds: z.array(z.number()),
    promoVideoUrl: optionalUrl,
    legacyFacebookGroupUrl: optionalUrl,
    thumbnail: thumbnailSchema,
  })
  .refine((v) => v.compareAtPriceVnd === null || v.priceVnd === null || v.compareAtPriceVnd >= v.priceVnd, {
    path: ['compareAtPriceVnd'],
    message: 'Giá gốc không được thấp hơn giá bán.',
  })

type FormValues = z.infer<typeof schema>

// accessDurationDays, level and promoVideoUrl are not shown in the form for now, but they stay in the values:
// a PUT replaces the whole course, so the loaded values must be sent back unchanged.
function toValues(course?: CourseAdminDetailResponse): FormValues {
  return {
    title: course?.title ?? '',
    subtitle: course?.subtitle ?? '',
    description: course?.description ?? '',
    whatYouWillLearn: course?.whatYouWillLearn ?? '',
    metaDescription: course?.metaDescription ?? '',
    priceVnd: course?.priceVnd ?? null,
    compareAtPriceVnd: course?.compareAtPriceVnd ?? null,
    accessDurationDays: course?.accessDurationDays ? String(course.accessDurationDays) : '',
    level: course?.level ?? 'Unspecified',
    categoryIds: course?.categories.map((c) => c.id) ?? [],
    promoVideoUrl: course?.promoVideoUrl ?? '',
    legacyFacebookGroupUrl: course?.legacyFacebookGroupUrl ?? '',
    thumbnail: course?.thumbnailUrl ? { kind: 'url', url: course.thumbnailUrl } : { kind: 'none' },
  }
}

const orNull = (value: string) => (value.trim() === '' ? null : value)

function toInput(values: FormValues): CourseInput {
  const thumbnail: CourseInput['thumbnail'] =
    values.thumbnail.kind === 'url' ? { kind: 'url', url: values.thumbnail.url.trim() } : values.thumbnail
  return {
    title: values.title.trim(),
    subtitle: orNull(values.subtitle),
    description: orNull(values.description),
    whatYouWillLearn: orNull(values.whatYouWillLearn),
    metaDescription: orNull(values.metaDescription),
    promoVideoUrl: orNull(values.promoVideoUrl)?.trim() ?? null,
    priceVnd: values.priceVnd ?? 0,
    compareAtPriceVnd: values.compareAtPriceVnd,
    accessDurationDays: values.accessDurationDays.trim() === '' ? null : Number(values.accessDurationDays),
    legacyFacebookGroupUrl: orNull(values.legacyFacebookGroupUrl)?.trim() ?? null,
    categoryIds: values.categoryIds,
    level: values.level,
    thumbnail,
  }
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
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
      <FieldError message={error} />
    </div>
  )
}

function ThumbnailField({ value, onChange, error }: {
  value: FormValues['thumbnail']
  onChange: (value: FormValues['thumbnail']) => void
  error?: string
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const previewUrl = useRef<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  const preview = value.kind === 'file' ? objectUrl : value.kind === 'url' && isHttpUrl(value.url.trim()) ? value.url.trim() : null

  const pick = (picked: File | undefined) => {
    if (!picked) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      setFileError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.')
      return
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      setFileError('Ảnh quá lớn (tối đa 5 MB).')
      return
    }
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = URL.createObjectURL(picked)
    setObjectUrl(previewUrl.current)
    setFileError(null)
    setShowUrlInput(false)
    onChange({ kind: 'file', file: picked })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex aspect-video w-56 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
          {preview ? <img src={preview} alt="Ảnh bìa" className="size-full object-cover" /> : <ImageOff className="size-6" />}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Upload /> Tải ảnh lên
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowUrlInput(true)
              setFileError(null)
              if (value.kind !== 'url') onChange({ kind: 'url', url: '' })
            }}
          >
            Dùng đường dẫn
          </Button>
          {value.kind !== 'none' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowUrlInput(false)
                setFileError(null)
                onChange({ kind: 'none' })
              }}
            >
              <X /> Xóa ảnh
            </Button>
          )}
          <p className="text-xs text-muted-foreground">JPEG, PNG hoặc WebP, tối đa 5 MB.</p>
        </div>
      </div>
      {showUrlInput && value.kind === 'url' && (
        <Input
          aria-label="Đường dẫn ảnh bìa"
          placeholder="https://..."
          value={value.url}
          aria-invalid={!!error}
          onChange={(e) => onChange({ kind: 'url', url: e.target.value })}
        />
      )}
      <FieldError message={fileError ?? error} />
    </div>
  )
}

function CategoryPicker({ value, onChange }: { value: number[]; onChange: (value: number[]) => void }) {
  const [open, setOpen] = useState(false)
  const { data: categories = [], isError } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  })
  const selected = categories.filter((c) => value.includes(c.id))
  const unknown = value.filter((id) => !categories.some((c) => c.id === id)).length

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="justify-between font-normal">
            {value.length > 0 ? `Đã chọn ${value.length} danh mục` : 'Chọn danh mục'}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm danh mục..." />
            <CommandList>
              <CommandEmpty>{isError ? 'Không tải được danh mục.' : 'Không có danh mục.'}</CommandEmpty>
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem key={category.id} value={category.name} onSelect={() => toggle(category.id)}>
                    <Check className={value.includes(category.id) ? 'opacity-100' : 'opacity-0'} />
                    {category.name}
                    {category.status === 'InActive' && <span className="text-muted-foreground">(ẩn)</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {(selected.length > 0 || unknown > 0) && (
        <div className="flex flex-wrap gap-1">
          {selected.map((category) => (
            <Badge key={category.id} variant="secondary" className="gap-1">
              {category.name}
              <button type="button" aria-label={`Bỏ ${category.name}`} onClick={() => toggle(category.id)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CourseForm({ course }: { course?: CourseAdminDetailResponse }) {
  const navigate = useNavigate()
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(course) })

  useUnsavedChangesPrompt(isDirty)

  const save = useMutation({
    mutationFn: (input: CourseInput) => (course ? updateCourse(course.id, input) : createCourse(input)),
  })

  const onSubmit = async (values: FormValues) => {
    let saved: CourseAdminDetailResponse
    try {
      saved = await save.mutateAsync(toInput(values))
    } catch (error) {
      const fields = fieldErrors(error)
      const known = Object.keys(toValues()) as (keyof FormValues)[]
      let mapped = false
      for (const [key, message] of Object.entries(fields)) {
        const name = key === 'thumbnailUrl' ? 'thumbnail' : key
        if (known.includes(name as keyof FormValues)) {
          setError(name as keyof FormValues, { message })
          mapped = true
        }
      }
      if (!mapped) toast.error(messageFor(error))
      return
    }
    toast.success('Đã lưu')
    reset(toValues(saved))
    if (!course) navigate(`/courses/${saved.id}`, { replace: true })
  }

  const thumbnailErrors = errors.thumbnail as { message?: string; url?: { message?: string } } | undefined
  const thumbnailError = thumbnailErrors?.url?.message ?? thumbnailErrors?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <p className="-mb-3 text-xs text-muted-foreground">
        <RequiredMark /> bắt buộc
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Tên khóa học" required htmlFor="title" error={errors.title?.message}>
              <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            </Field>
            <Field label="Mô tả ngắn" htmlFor="subtitle" error={errors.subtitle?.message}>
              <Input id="subtitle" aria-invalid={!!errors.subtitle} {...register('subtitle')} />
            </Field>
            <Field label="Mô tả" htmlFor="description" error={errors.description?.message}>
              <Textarea id="description" rows={8} {...register('description')} />
            </Field>
            <Field
              label="Bạn sẽ học được"
              htmlFor="whatYouWillLearn"
              hint="Mỗi dòng là một ý."
              error={errors.whatYouWillLearn?.message}
            >
              <Textarea id="whatYouWillLearn" rows={5} {...register('whatYouWillLearn')} />
            </Field>
            <Field label="Mô tả SEO" htmlFor="metaDescription" error={errors.metaDescription?.message}>
              <Textarea id="metaDescription" rows={2} aria-invalid={!!errors.metaDescription} {...register('metaDescription')} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ảnh bìa</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="thumbnail"
                render={({ field }) => <ThumbnailField value={field.value} onChange={field.onChange} error={thumbnailError} />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Giá</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Giá bán" required htmlFor="priceVnd" error={errors.priceVnd?.message}>
                <Controller
                  control={control}
                  name="priceVnd"
                  render={({ field }) => (
                    <VndInput id="priceVnd" aria-invalid={!!errors.priceVnd} value={field.value} onChange={field.onChange} />
                  )}
                />
              </Field>
              <Field
                label="Giá gốc"
                htmlFor="compareAtPriceVnd"
                hint="Hiển thị gạch ngang trên website."
                error={errors.compareAtPriceVnd?.message}
              >
                <Controller
                  control={control}
                  name="compareAtPriceVnd"
                  render={({ field }) => (
                    <VndInput
                      id="compareAtPriceVnd"
                      aria-invalid={!!errors.compareAtPriceVnd}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phân loại</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Danh mục">
                <Controller
                  control={control}
                  name="categoryIds"
                  render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Nhóm Facebook cũ" htmlFor="legacyFacebookGroupUrl" error={errors.legacyFacebookGroupUrl?.message}>
                <Input
                  id="legacyFacebookGroupUrl"
                  placeholder="https://..."
                  aria-invalid={!!errors.legacyFacebookGroupUrl}
                  {...register('legacyFacebookGroupUrl')}
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {course && isDirty && (
          <Button type="button" variant="outline" disabled={save.isPending} onClick={() => reset(toValues(course))}>
            Hủy thay đổi
          </Button>
        )}
        <Button type="submit" disabled={save.isPending || (!!course && !isDirty)}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {course ? 'Lưu thay đổi' : 'Tạo khóa học'}
        </Button>
      </div>
    </form>
  )
}
