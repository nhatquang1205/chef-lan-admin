import PageHeader from '@/components/PageHeader'
import CourseForm from './CourseForm'

export default function CourseCreatePage() {
  return (
    <>
      <PageHeader
        title="Thêm khóa học"
        breadcrumb={[{ label: 'Khóa học', to: '/courses' }, { label: 'Thêm khóa học' }]}
      />
      <div className="max-w-3xl">
        <CourseForm />
      </div>
    </>
  )
}
