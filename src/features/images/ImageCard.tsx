import { Loader2, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteCourseImage, updateCourseImageAlt } from '@/lib/api/courseImages'
import { messageFor } from '@/lib/api/errors'
import type { CourseImageResponse } from '@/lib/api/types'

interface Props {
  courseId: number
  image: CourseImageResponse
  isFirst: boolean
  handle: ReactNode
}

export default function ImageCard({ courseId, image, isFirst, handle }: Props) {
  const [alt, setAlt] = useState(image.alt ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const saveAlt = async () => {
    const next = alt.trim()
    if (next === (image.alt ?? '')) return
    setSaving(true)
    try {
      await updateCourseImageAlt(image.id, next === '' ? null : next)
      toast.success('Đã lưu mô tả ảnh.')
    } catch (err) {
      toast.error(messageFor(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-2">
      <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
        <img src={image.url} alt={image.alt ?? ''} className="size-full object-cover" loading="lazy" />
        {isFirst && (
          <Badge className="absolute left-2 top-2 max-w-[calc(100%-1rem)] whitespace-normal">
            Ảnh đại diện trên thẻ khóa học
          </Badge>
        )}
      </div>
      <div className="relative">
        <Input
          aria-label="Mô tả ảnh"
          placeholder="Mô tả ảnh (alt)"
          maxLength={200}
          value={alt}
          disabled={saving}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => void saveAlt()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
        />
        {saving && <Loader2 className="absolute right-2 top-2 size-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex items-center justify-between gap-2">
        {handle}
        <Button type="button" variant="ghost" size="icon" aria-label="Xóa ảnh" onClick={() => setConfirmDelete(true)}>
          <Trash2 />
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa ảnh?"
        description="Ảnh sẽ bị xóa khỏi khóa học và khỏi kho lưu trữ."
        confirmLabel="Xóa"
        destructive
        onConfirm={async () => {
          await deleteCourseImage(courseId, image.id)
          toast.success('Đã xóa ảnh.')
        }}
      />
    </div>
  )
}
