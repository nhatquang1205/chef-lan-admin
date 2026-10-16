import PageHeader from '@/components/PageHeader'
import { EmptyState } from '@/components/states'

export default function CoursesPage() {
  return (
    <>
      <PageHeader title="Khóa học" description="Quản lý các khóa học, bài học và video." />
      <EmptyState title="Chưa có dữ liệu" description="Danh sách khóa học sẽ hiển thị ở đây." />
    </>
  )
}
