import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import SortableList from '@/components/SortableList'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api/client'
import { messageFor } from '@/lib/api/errors'
import type { LessonVideoResponse } from '@/lib/api/types'
import { deleteVideo, invalidateAfterVideoChange, listVideos, reorderVideos } from '@/lib/api/videos'
import { formatClock, VIDEO_PROVIDER_LABEL } from '@/lib/format'
import { queryClient } from '@/lib/query'
import VideoForm from './VideoForm'

interface Props {
  lessonId: number
  courseId: number
}

type Editing = { video?: LessonVideoResponse } | null

export default function VideoList({ lessonId, courseId }: Props) {
  const queryKey = ['videos', lessonId]
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<LessonVideoResponse | null>(null)
  const { data: videos, error, isPending, refetch } = useQuery({
    queryKey,
    queryFn: () => listVideos(lessonId),
  })

  const reorder = useMutation({
    mutationFn: (next: LessonVideoResponse[]) => reorderVideos(lessonId, next.map((v) => v.id)),
  })

  const handleReorder = async (next: LessonVideoResponse[]) => {
    queryClient.setQueryData(queryKey, next)
    try {
      await reorder.mutateAsync(next)
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === 'order.mismatch'
          ? 'Danh sách video đã thay đổi, đã tải lại.'
          : messageFor(err),
      )
    }
    await queryClient.invalidateQueries({ queryKey })
  }

  const addButton = (
    <Button onClick={() => setEditing({})}>
      <Plus />
      Thêm video
    </Button>
  )

  let body
  if (isPending) body = <LoadingState rows={2} />
  else if (error) body = <ErrorState error={error} onRetry={() => refetch()} />
  else if (videos.length === 0) body = <EmptyState title="Chưa có video nào" action={addButton} />
  else {
    body = (
      <SortableList
        items={videos}
        onReorder={(next) => void handleReorder(next)}
        renderItem={(video, index, handle) => (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2 pr-3">
            {handle}
            <span className="w-6 shrink-0 text-center text-sm text-muted-foreground">{index + 1}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{video.title}</span>
                {video.isFree && (
                  <Badge variant="outline">
                    {video.freeTillSeconds != null ? `Miễn phí ${video.freeTillSeconds} giây đầu` : 'Miễn phí'}
                  </Badge>
                )}
                {!video.isPublished && <Badge variant="secondary">Nháp</Badge>}
              </div>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{VIDEO_PROVIDER_LABEL[video.provider]}</span>
                <span>{formatClock(video.durationSeconds)}</span>
                <CopyId value={video.publicId} />
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sửa video" onClick={() => setEditing({ video })}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Xóa video" onClick={() => setDeleting(video)}>
              <Trash2 />
            </Button>
          </div>
        )}
      />
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Video</h2>
        {videos && videos.length > 0 && addButton}
      </div>
      <p className="text-sm text-muted-foreground">
        Video không miễn phí chỉ xem được khi khách đã mua khóa học hoặc bài học.
      </p>
      {body}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.video ? 'Sửa video' : 'Thêm video'}</DialogTitle>
            <DialogDescription className="sr-only">Thông tin video của bài học.</DialogDescription>
          </DialogHeader>
          {editing && (
            <VideoForm
              key={editing.video?.id ?? 'new'}
              lessonId={lessonId}
              courseId={courseId}
              video={editing.video}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Xóa video “${deleting?.title ?? ''}”?`}
        description="Video sẽ bị gỡ khỏi bài học."
        confirmLabel="Xóa"
        destructive
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteVideo(deleting.id, lessonId, courseId)
          } catch (err) {
            await invalidateAfterVideoChange(lessonId, courseId)
            throw err
          }
          toast.success('Đã xóa video.')
        }}
      />
    </section>
  )
}

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Không sao chép được.')
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      title="Sao chép mã công khai"
      className="inline-flex items-center gap-1 font-mono hover:text-foreground"
    >
      {value}
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  )
}
