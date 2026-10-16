import { useQuery } from '@tanstack/react-query'
import { ExternalLink, EyeOff, Loader2, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api/client'
import { deleteCourse, getCourse, publishCourse, unpublishCourse } from '@/lib/api/courses'
import { messageFor } from '@/lib/api/errors'
import { COURSE_STATUS_LABEL, COURSE_STATUS_VARIANT, formatDate, formatDuration } from '@/lib/format'
import LessonList from '@/features/lessons/LessonList'
import CourseForm from './CourseForm'

const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
const TABS = ['info', 'lessons'] as const

export default function CoursePage() {
  const id = Number(useParams().id)
  const valid = Number.isInteger(id) && id > 0
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((t) => t === searchParams.get('tab')) ?? 'info'
  const [publishing, setPublishing] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: course, error, isPending, refetch } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
    enabled: valid,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 3,
  })

  if (!valid) return <NotFound />
  if (isPending) return <LoadingState rows={6} />
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />
    return <ErrorState error={error} onRetry={() => refetch()} />
  }

  const published = course.status === 'Published'

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishCourse(course.id)
      toast.success('Đã xuất bản khóa học.')
    } catch (err) {
      toast.error(messageFor(err))
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    await unpublishCourse(course.id)
    toast.success('Đã ẩn khóa học.')
  }

  const handleDelete = async () => {
    await deleteCourse(course.id)
    toast.success('Đã xóa khóa học.')
    navigate('/courses', { replace: true })
  }

  return (
    <>
      <PageHeader
        title={course.title}
        breadcrumb={[{ label: 'Khóa học', to: '/courses' }, { label: course.title }]}
        description={`/${course.slug}`}
        actions={
          <>
            <Badge variant={COURSE_STATUS_VARIANT[course.status]}>{COURSE_STATUS_LABEL[course.status]}</Badge>
            {published && PUBLIC_SITE_URL && (
              <Button variant="outline" asChild>
                <a href={`${PUBLIC_SITE_URL}/courses/${course.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Xem trên trang
                </a>
              </Button>
            )}
            {published ? (
              <Button variant="outline" onClick={() => setConfirmUnpublish(true)}>
                <EyeOff />
                Ẩn khóa học
              </Button>
            ) : (
              <Button onClick={() => void handlePublish()} disabled={publishing}>
                {publishing ? <Loader2 className="animate-spin" /> : <Send />}
                Xuất bản
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Thao tác khác">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Xóa khóa học
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">
        {course.lessonCount} bài học · {formatDuration(course.totalDurationSeconds)} · {course.enrollmentCount} học viên
        {course.publishedAt && ` · Xuất bản ${formatDate(course.publishedAt)}`}
      </p>
      <Tabs
        value={tab}
        onValueChange={(next) =>
          setSearchParams(next === 'info' ? {} : { tab: next }, { replace: true })
        }
      >
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="lessons">Bài học</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="max-w-3xl pt-4">
          <CourseForm key={course.id} course={course} />
        </TabsContent>
        <TabsContent value="lessons" className="pt-4">
          <LessonList courseId={course.id} />
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title="Ẩn khóa học?"
        description="Khách hàng sẽ không thấy khóa học này nữa. Người đã mua vẫn giữ quyền truy cập."
        confirmLabel="Ẩn khóa học"
        onConfirm={handleUnpublish}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Xóa khóa học “${course.title}”?`}
        description="Thao tác này ẩn khóa học khỏi mọi danh sách."
        confirmLabel="Xóa"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}

function NotFound() {
  return (
    <EmptyState
      title="Không tìm thấy khóa học"
      action={
        <Button variant="outline" asChild>
          <Link to="/courses">Về danh sách khóa học</Link>
        </Button>
      }
    />
  )
}
