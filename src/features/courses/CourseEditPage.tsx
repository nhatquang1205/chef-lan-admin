import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import PageHeader from '@/components/PageHeader'
import { ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { getCourse } from '@/lib/api/courses'
import { COURSE_STATUS_LABEL, COURSE_STATUS_VARIANT, formatDate, formatDuration } from '@/lib/format'
import CourseForm from './CourseForm'

export default function CourseEditPage() {
  const id = Number(useParams().id)
  const valid = Number.isInteger(id) && id > 0
  const { data: course, error, isPending, refetch } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
    enabled: valid,
  })

  if (!valid) return <ErrorState error={null} />
  if (isPending) return <LoadingState rows={6} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <>
      <PageHeader
        title={course.title}
        breadcrumb={[{ label: 'Khóa học', to: '/courses' }, { label: course.title }]}
        description={`/${course.slug}`}
        actions={<Badge variant={COURSE_STATUS_VARIANT[course.status]}>{COURSE_STATUS_LABEL[course.status]}</Badge>}
      />
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">
        {course.lessonCount} bài học · {formatDuration(course.totalDurationSeconds)} · {course.enrollmentCount} học viên
        {course.publishedAt && ` · Xuất bản ${formatDate(course.publishedAt)}`}
      </p>
      <div className="max-w-3xl">
        <CourseForm key={course.id} course={course} />
      </div>
    </>
  )
}
