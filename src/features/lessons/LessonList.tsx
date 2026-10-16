import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import SortableList from '@/components/SortableList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { messageFor } from '@/lib/api/errors'
import { listLessons, reorderLessons } from '@/lib/api/lessons'
import { formatDuration, formatVnd } from '@/lib/format'
import { queryClient } from '@/lib/query'
import type { LessonListItemResponse } from '@/lib/api/types'

export default function LessonList({ courseId }: { courseId: number }) {
  const queryKey = ['lessons', courseId]
  const { data: lessons, error, isPending, refetch } = useQuery({
    queryKey,
    queryFn: () => listLessons(courseId),
  })

  const addButton = (
    <Button asChild>
      <Link to={`/courses/${courseId}/lessons/new`}>
        <Plus />
        Thêm bài học
      </Link>
    </Button>
  )

  if (isPending) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (lessons.length === 0) return <EmptyState title="Chưa có bài học nào" action={addButton} />

  const handleReorder = async (next: LessonListItemResponse[]) => {
    queryClient.setQueryData(queryKey, next)
    try {
      await reorderLessons(courseId, next.map((lesson) => lesson.id))
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === 'order.mismatch'
          ? 'Danh sách bài học đã thay đổi, đã tải lại.'
          : messageFor(err),
      )
    }
    await queryClient.invalidateQueries({ queryKey })
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Kéo biểu tượng bên trái để đổi thứ tự bài học.</p>
        {addButton}
      </div>
      <SortableList
        items={lessons}
        onReorder={(next) => void handleReorder(next)}
        renderItem={(lesson, index, handle) => (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2 pr-3">
            {handle}
            <Link
              to={`/courses/${courseId}/lessons/${lesson.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 hover:bg-muted/50"
            >
              <span className="w-6 shrink-0 text-center text-sm text-muted-foreground">{index + 1}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{lesson.title}</span>
                  {!lesson.isPublished && <Badge variant="secondary">Nháp</Badge>}
                  {!lesson.includedInCourse && <Badge variant="outline">Mua thêm</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lesson.priceVnd != null && `${formatVnd(lesson.priceVnd)} · `}
                  {lesson.videoCount} video · {formatDuration(lesson.durationSeconds)}
                </p>
              </div>
            </Link>
          </div>
        )}
      />
    </div>
  )
}
