import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import ConfirmDialog from '@/components/ConfirmDialog'
import Markdown from '@/components/Markdown'
import VndInput from '@/components/VndInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { createLesson, updateLesson } from '@/lib/api/lessons'
import type { LessonDetailResponse, LessonRequest } from '@/lib/api/types'
import { useUnsavedChangesPrompt } from '@/lib/useUnsavedChangesPrompt'

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const schema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên bài học.').max(200, 'Tối đa 200 ký tự.'),
    description: z.string(),
    recipes: z.string().max(100_000, 'Tối đa 100.000 ký tự.'),
    resourcesUrl: z
      .string()
      .max(1000, 'Tối đa 1000 ký tự.')
      .refine((v) => v.trim() === '' || isHttpUrl(v.trim()), 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.'),
    isPublished: z.boolean(),
    includedInCourse: z.boolean(),
    priceVnd: z.number().nullable(),
  })
  .refine((v) => v.includedInCourse || v.priceVnd !== null, {
    path: ['priceVnd'],
    message: 'Bài mua thêm cần có giá.',
  })

type FormValues = z.infer<typeof schema>

function toValues(lesson?: LessonDetailResponse): FormValues {
  return {
    title: lesson?.title ?? '',
    description: lesson?.description ?? '',
    recipes: lesson?.recipes ?? '',
    resourcesUrl: lesson?.resourcesUrl ?? '',
    isPublished: lesson?.isPublished ?? true,
    includedInCourse: lesson?.includedInCourse ?? true,
    priceVnd: lesson?.priceVnd ?? null,
  }
}

const orNull = (value: string) => (value.trim() === '' ? null : value)

function toRequest(values: FormValues): LessonRequest {
  return {
    title: values.title.trim(),
    description: orNull(values.description),
    recipes: orNull(values.recipes),
    resourcesUrl: orNull(values.resourcesUrl)?.trim() ?? null,
    isPublished: values.isPublished,
    includedInCourse: values.includedInCourse,
    priceVnd: values.priceVnd,
  }
}

function Field({ label, htmlFor, hint, error, children }: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface Props {
  courseId: number
  lesson?: LessonDetailResponse
}

export default function LessonForm({ courseId, lesson }: Props) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState(false)
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(lesson) })

  useUnsavedChangesPrompt(isDirty)

  const included = useWatch({ control, name: 'includedInCourse' })
  const recipes = useWatch({ control, name: 'recipes' })

  const save = useMutation({
    mutationFn: (request: LessonRequest) =>
      lesson ? updateLesson(lesson.id, request) : createLesson(courseId, request),
  })

  const submit = async (values: FormValues) => {
    let saved: LessonDetailResponse
    try {
      saved = await save.mutateAsync(toRequest(values))
    } catch (error) {
      const known = Object.keys(toValues())
      let mapped = false
      for (const [key, message] of Object.entries(fieldErrors(error))) {
        if (known.includes(key)) {
          setError(key as keyof FormValues, { message })
          mapped = true
        }
      }
      if (!mapped) toast.error(messageFor(error))
      return
    }
    toast.success('Đã lưu')
    reset(toValues(saved))
    if (!lesson) navigate(`/courses/${courseId}/lessons/${saved.id}`, { replace: true })
  }

  const onSubmit = (values: FormValues) => {
    if (lesson?.includedInCourse && !values.includedInCourse) {
      setPendingValues(values)
      return Promise.resolve()
    }
    return submit(values)
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Thông tin bài học</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Tên bài học" htmlFor="title" error={errors.title?.message}>
              <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            </Field>
            <Field label="Mô tả" htmlFor="description" error={errors.description?.message}>
              <Textarea id="description" rows={4} {...register('description')} />
            </Field>
            <Field
              label="Công thức"
              htmlFor="recipes"
              hint="Hỗ trợ Markdown, bao gồm bảng."
              error={errors.recipes?.message}
            >
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
                  {preview ? 'Soạn thảo' : 'Xem trước'}
                </Button>
              </div>
              {preview ? (
                <div className="min-h-40 rounded-md border p-4">
                  {recipes.trim() === '' ? (
                    <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>
                  ) : (
                    <Markdown>{recipes}</Markdown>
                  )}
                </div>
              ) : (
                <Textarea id="recipes" rows={14} className="font-mono" aria-invalid={!!errors.recipes} {...register('recipes')} />
              )}
            </Field>
            <Field label="Tài liệu đính kèm" htmlFor="resourcesUrl" error={errors.resourcesUrl?.message}>
              <Input id="resourcesUrl" placeholder="https://..." aria-invalid={!!errors.resourcesUrl} {...register('resourcesUrl')} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hiển thị và giá</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor="isPublished">Hiển thị</Label>
                </div>
              )}
            />
            <div className="flex flex-col gap-2">
              <Controller
                control={control}
                name="includedInCourse"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Switch id="includedInCourse" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="includedInCourse">Nằm trong giá khóa học</Label>
                  </div>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Bài mua thêm không được mở khi khách mua cả khóa; khách phải mua riêng bài này.
              </p>
            </div>
            <div className="max-w-xs">
              <Field
                label="Giá mua riêng"
                htmlFor="priceVnd"
                hint={included ? 'Để trống nếu không bán riêng bài này.' : undefined}
                error={errors.priceVnd?.message}
              >
                <Controller
                  control={control}
                  name="priceVnd"
                  render={({ field }) => (
                    <VndInput id="priceVnd" aria-invalid={!!errors.priceVnd} value={field.value} onChange={field.onChange} />
                  )}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          {lesson && isDirty && (
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => reset(toValues(lesson))}>
              Hủy thay đổi
            </Button>
          )}
          <Button type="submit" disabled={save.isPending || (!!lesson && !isDirty)}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {lesson ? 'Lưu thay đổi' : 'Tạo bài học'}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={pendingValues !== null}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Chuyển thành bài mua thêm?"
        description="Những khách đã mua khóa học sẽ mất quyền xem bài này. Tiếp tục?"
        confirmLabel="Tiếp tục"
        onConfirm={async () => {
          if (pendingValues) await submit(pendingValues)
        }}
      />
    </>
  )
}
