import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import PageHeader from '@/components/PageHeader'
import { ErrorState, LoadingState } from '@/components/states'
import { getCourse } from '@/lib/api/courses'
import LessonForm from './LessonForm'

export default function LessonCreatePage() {
  const courseId = Number(useParams().courseId)
  const { data: course, error, isPending, refetch } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
    enabled: Number.isInteger(courseId) && courseId > 0,
  })

  if (isPending) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <>
      <PageHeader
        title="Thêm bài học"
        breadcrumb={[
          { label: 'Khóa học', to: '/courses' },
          { label: course.title, to: `/courses/${courseId}?tab=lessons` },
          { label: 'Thêm bài học' },
        ]}
      />
      <div className="max-w-3xl">
        <LessonForm courseId={courseId} />
      </div>
    </>
  )
}
