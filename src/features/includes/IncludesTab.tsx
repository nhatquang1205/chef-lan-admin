import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import SortableList from '@/components/SortableList'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { messageFor } from '@/lib/api/errors'
import { listIncludedIn, listIncludes, reorderIncludes } from '@/lib/api/includes'
import { queryClient } from '@/lib/query'
import type { CourseIncludeResponse } from '@/lib/api/types'
import AddIncludeDialog from './AddIncludeDialog'
import IncludeRow from './IncludeRow'

export default function IncludesTab({ courseId, priceVnd }: { courseId: number; priceVnd: number }) {
  const queryKey = ['course-includes', courseId]
  const [adding, setAdding] = useState(false)
  const includedIn = useQuery({
    queryKey: ['course-included-in', courseId],
    queryFn: () => listIncludedIn(courseId),
  })
  const includes = useQuery({ queryKey, queryFn: () => listIncludes(courseId) })

  if (includedIn.isPending || includes.isPending) return <LoadingState rows={3} />
  if (includedIn.error) return <ErrorState error={includedIn.error} onRetry={() => void includedIn.refetch()} />
  if (includes.error) return <ErrorState error={includes.error} onRetry={() => void includes.refetch()} />

  if (includedIn.data.length > 0) {
    return (
      <div className="flex max-w-4xl flex-col gap-3 rounded-lg border bg-card p-4 text-sm">
        <p>
          Khóa này là học phần của:{' '}
          {includedIn.data.map((parent, index) => (
            <span key={parent.id}>
              {index > 0 && ', '}
              <Link to={`/courses/${parent.id}`} className="font-medium underline-offset-4 hover:underline">
                {parent.title}
              </Link>
            </span>
          ))}
        </p>
        <p className="text-muted-foreground">
          Chỉ hỗ trợ một cấp nên khóa này không thể chứa học phần khác.
        </p>
      </div>
    )
  }

  const items = includes.data

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <Plus />
      Thêm học phần
    </Button>
  )

  const handleReorder = async (next: CourseIncludeResponse[]) => {
    queryClient.setQueryData(queryKey, next)
    try {
      await reorderIncludes(courseId, next.map((item) => item.includedCourseId))
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === 'order.mismatch'
          ? 'Danh sách học phần đã thay đổi, đã tải lại.'
          : messageFor(err),
      )
    }
    await queryClient.invalidateQueries({ queryKey })
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Khóa học này bao gồm toàn bộ bài học của các khóa dưới đây. Khách đã có khóa đó sẽ được giảm giá.
        </p>
        {items.length > 0 && addButton}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Chưa có học phần nào" action={addButton} />
      ) : (
        <SortableList
          items={items.map((item) => ({ ...item, id: item.includedCourseId }))}
          onReorder={(next) => void handleReorder(next)}
          renderItem={(item, _index, handle) => <IncludeRow courseId={courseId} item={item} handle={handle} />}
        />
      )}
      <AddIncludeDialog
        open={adding}
        onOpenChange={setAdding}
        courseId={courseId}
        priceVnd={priceVnd}
        existingIds={items.map((item) => item.includedCourseId)}
      />
    </div>
  )
}
