import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ImageOff, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createCategory, updateCategory } from '@/lib/api/categories'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import type { CategoryAdminResponse, CategoryRequest } from '@/lib/api/types'
import { uploadImage, validateImage } from '@/lib/api/uploads'

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên danh mục.').max(120, 'Tối đa 120 ký tự.'),
  description: z.string(),
  displayOrder: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 2147483647), 'Nhập số nguyên không âm hoặc để trống.'),
  active: z.boolean(),
  thumbnailUrl: z
    .string()
    .trim()
    .max(1000, 'Tối đa 1000 ký tự.')
    .refine((v) => v === '' || isHttpUrl(v), 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.'),
})

type FormValues = z.infer<typeof schema>

function toValues(category?: CategoryAdminResponse | null): FormValues {
  return {
    name: category?.name ?? '',
    description: category?.description ?? '',
    displayOrder: category ? String(category.displayOrder) : '',
    active: category ? category.status === 'Active' : true,
    thumbnailUrl: category?.thumbnailUrl ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryAdminResponse | null
}

export default function CategoryDialog({ open, onOpenChange, category }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
          <DialogDescription>
            {category ? `Đường dẫn: ${category.slug} (không đổi khi đổi tên).` : 'Đường dẫn được tạo tự động từ tên.'}
          </DialogDescription>
        </DialogHeader>
        {open && <CategoryForm category={category} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({ category, onDone }: { category?: CategoryAdminResponse | null; onDone: () => void }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(category) })

  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const previewRef = useRef<string | null>(null)

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const replacePreview = (picked: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = picked ? URL.createObjectURL(picked) : null
    setObjectUrl(previewRef.current)
    setFile(picked)
  }

  const thumbnailUrl = useWatch({ control, name: 'thumbnailUrl' })
  const preview = file ? objectUrl : isHttpUrl(thumbnailUrl.trim()) ? thumbnailUrl.trim() : null

  const save = useMutation({
    mutationFn: (input: CategoryRequest) => (category ? updateCategory(category.id, input) : createCategory(input)),
  })

  const pick = (picked: File | undefined) => {
    if (!picked) return
    const problem = validateImage(picked)
    if (problem) {
      setFileError(problem)
      return
    }
    setFileError(null)
    replacePreview(picked)
    setShowUrlInput(false)
    setValue('thumbnailUrl', '', { shouldDirty: true })
  }

  const clearImage = () => {
    replacePreview(null)
    setFileError(null)
    setShowUrlInput(false)
    setValue('thumbnailUrl', '', { shouldDirty: true })
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const thumbnailUrl = file ? (await uploadImage(file)).url : values.thumbnailUrl.trim() || null
      const description = values.description.trim()
      await save.mutateAsync({
        name: values.name.trim(),
        description: description === '' ? null : description,
        thumbnailUrl,
        displayOrder: values.displayOrder.trim() === '' ? null : Number(values.displayOrder),
        status: values.active ? 'Active' : 'InActive',
      })
    } catch (error) {
      const fields = fieldErrors(error)
      let mapped = false
      for (const [key, message] of Object.entries(fields)) {
        if (key in toValues()) {
          setError(key as keyof FormValues, { message })
          mapped = true
        }
      }
      if (!mapped) toast.error(messageFor(error))
      return
    }
    toast.success('Đã lưu')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Tên danh mục</Label>
        <Input id="category-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-description">Mô tả</Label>
        <Textarea id="category-description" rows={3} {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-order">Thứ tự hiển thị</Label>
          <Input
            id="category-order"
            inputMode="numeric"
            placeholder="Tự động"
            aria-invalid={!!errors.displayOrder}
            {...register('displayOrder')}
          />
          {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-active">Hiển thị trên trang web</Label>
          <div className="flex h-9 items-center">
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Switch id="category-active" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Ảnh danh mục</Label>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex aspect-video w-40 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
            {preview ? <img src={preview} alt="Ảnh danh mục" className="size-full object-cover" /> : <ImageOff className="size-6" />}
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
                replacePreview(null)
                setFileError(null)
                setShowUrlInput(true)
              }}
            >
              Dùng đường dẫn
            </Button>
            {(file || thumbnailUrl.trim() !== '' || showUrlInput) && (
              <Button type="button" variant="ghost" size="sm" onClick={clearImage}>
                <X /> Xóa ảnh
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPEG, PNG hoặc WebP, tối đa 5 MB.</p>
          </div>
        </div>
        {(showUrlInput || (!file && thumbnailUrl !== '')) && (
          <Input
            aria-label="Đường dẫn ảnh"
            placeholder="https://..."
            aria-invalid={!!errors.thumbnailUrl}
            {...register('thumbnailUrl')}
          />
        )}
        {(fileError ?? errors.thumbnailUrl?.message) && (
          <p className="text-sm text-destructive">{fileError ?? errors.thumbnailUrl?.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onDone}>
          Hủy
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {category ? 'Lưu thay đổi' : 'Tạo danh mục'}
        </Button>
      </DialogFooter>
    </form>
  )
}
