import PageHeader from '@/components/PageHeader'
import { EmptyState } from '@/components/states'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} breadcrumb={[{ label: 'Khóa học', to: '/courses' }, { label: title }]} />
      <EmptyState title="Sắp có" description="Màn hình này sẽ được hoàn thiện ở các bước sau." />
    </>
  )
}
