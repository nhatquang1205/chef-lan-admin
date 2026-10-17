import { Loader2, Save, Trash2, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import VndInput from '@/components/VndInput'
import { messageFor } from '@/lib/api/errors'
import { removeInclude, upsertInclude } from '@/lib/api/includes'
import type { CourseIncludeResponse } from '@/lib/api/types'
import { COURSE_STATUS_LABEL, formatVnd } from '@/lib/format'

interface Props {
  courseId: number
  item: CourseIncludeResponse
  handle: ReactNode
}

export default function IncludeRow({ courseId, item, handle }: Props) {
  const [discount, setDiscount] = useState<number | null>(item.discountVnd)
  const [saving, setSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const dirty = discount !== item.discountVnd

  const save = async () => {
    if (discount === null) return
    setSaving(true)
    try {
      await upsertInclude(courseId, item.includedCourseId, discount)
      toast.success('Đã lưu số tiền giảm.')
    } catch (err) {
      toast.error(messageFor(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-2 pr-3">
      <div className="flex flex-wrap items-center gap-2">
        {handle}
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/courses/${item.includedCourseId}`}
              className="truncate font-medium underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>
            <Badge variant={item.status === 'Published' ? 'default' : 'secondary'}>{COURSE_STATUS_LABEL[item.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.lessonCount} bài học · Giá {formatVnd(item.priceVnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Giảm khi đã có</span>
          <div className="w-40">
            <VndInput
              aria-label={`Giảm khi đã có ${item.title}`}
              value={discount}
              onChange={setDiscount}
              aria-invalid={discount === null}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Lưu số tiền giảm"
            disabled={!dirty || discount === null || saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
          <Button variant="outline" size="icon" aria-label="Gỡ học phần" onClick={() => setConfirmRemove(true)}>
            <Trash2 />
          </Button>
        </div>
      </div>
      {item.status === 'Draft' && (
        <p className="flex items-center gap-1.5 pl-8 text-xs text-amber-600">
          <TriangleAlert className="size-3.5" />
          Khóa này đang Nháp, khách sẽ không thấy.
        </p>
      )}
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Gỡ “${item.title}” khỏi khóa học?`}
        description="Khóa học này sẽ không còn bao gồm các bài học của khóa đó."
        confirmLabel="Gỡ"
        destructive
        onConfirm={async () => {
          await removeInclude(courseId, item.includedCourseId)
          toast.success('Đã gỡ học phần.')
        }}
      />
    </div>
  )
}
