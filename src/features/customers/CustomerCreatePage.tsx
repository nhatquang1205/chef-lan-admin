import PageHeader from '@/components/PageHeader'
import CustomerForm from './CustomerForm'

export default function CustomerCreatePage() {
  return (
    <>
      <PageHeader
        title="Thêm khách hàng"
        breadcrumb={[{ label: 'Khách hàng', to: '/customers' }, { label: 'Thêm khách hàng' }]}
      />
      <div className="max-w-3xl">
        <CustomerForm />
      </div>
    </>
  )
}
