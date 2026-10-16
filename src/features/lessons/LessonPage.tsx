import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ApiError } from '@/lib/api/client'
import { getCourse } from '@/lib/api/courses'
import { deleteLesson, getLesson } from '@/lib/api/lessons'
import VideoList from '@/features/videos/VideoList'
import LessonForm from './LessonForm'

export default function LessonPage() {
  const params = useParams()
  const courseId = Number(params.courseId)
  const lessonId = Number(params.lessonId)
  const valid = Number.isInteger(courseId) && courseId > 0 && Number.isInteger(lessonId) && lessonId > 0
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: lesson, error, isPending, refetch } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => getLesson(lessonId),
    enabled: valid,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 3,
  })
  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
    enabled: valid,
  })

  if (!valid) return <NotFound courseId={courseId} />
  if (isPending) return <LoadingState rows={6} />
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound courseId={courseId} />
    return <ErrorState error={error} onRetry={() => refetch()} />
  }
  if (lesson.courseId !== courseId) return <NotFound courseId={courseId} />

  const handleDelete = async () => {
    await deleteLesson(lesson.id, courseId)
    toast.success('Đã xóa bài học.')
    navigate(`/courses/${courseId}?tab=lessons`, { replace: true })
  }

  return (
    <>
      <PageHeader
        title={lesson.title}
        breadcrumb={[
          { label: 'Khóa học', to: '/courses' },
          { label: course?.title ?? 'Khóa học', to: `/courses/${courseId}?tab=lessons` },
          { label: lesson.title },
        ]}
        description={`/${lesson.slug}`}
        actions={
          <>
            {!lesson.isPublished && <StatusBadge variant="secondary">Nháp</StatusBadge>}
            {!lesson.includedInCourse && <StatusBadge variant="outline">Mua thêm</StatusBadge>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Thao tác khác">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Xóa bài học
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <LessonForm key={lesson.id} courseId={courseId} lesson={lesson} />
        <VideoList lessonId={lesson.id} courseId={courseId} />
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Xóa bài học “${lesson.title}”?`}
        description="Bài học và các video của nó sẽ bị ẩn khỏi khóa học."
        confirmLabel="Xóa"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}

function NotFound({ courseId }: { courseId: number }) {
  return (
    <EmptyState
      title="Không tìm thấy bài học"
      action={
        <Button variant="outline" asChild>
          <Link to={Number.isInteger(courseId) && courseId > 0 ? `/courses/${courseId}?tab=lessons` : '/courses'}>
            Quay lại danh sách bài học
          </Link>
        </Button>
      }
    />
  )
}
