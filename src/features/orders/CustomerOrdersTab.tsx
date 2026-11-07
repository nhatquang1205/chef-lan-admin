import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { listOrders } from '@/lib/api/orders'
import OrdersTable from './OrdersTable'

const PAGE_SIZE = 20

export default function CustomerOrdersTab({ customerId, isActive }: { customerId: number; isActive: boolean }) {
  const [page, setPage] = useState(1)
  const openId = Number(useSearchParams()[0].get('order')) || undefined
  const params = { customerId, page, pageSize: PAGE_SIZE }
  const orders = useQuery({
    queryKey: ['orders', params],
    queryFn: () => listOrders(params),
    placeholderData: keepPreviousData,
  })
  const data = orders.data

  if (orders.isPending) return <LoadingState rows={3} />
  if (orders.isError && !data) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
  const create = (
    <span title={isActive ? undefined : 'Tài khoản đang bị khóa'}>
      <Button disabled={!isActive} asChild={isActive}>
        {isActive ? (
          <Link to={`/orders/new?customerId=${customerId}`}>
            <Plus />
            Tạo đơn hàng
          </Link>
        ) : (
          <>
            <Plus />
            Tạo đơn hàng
          </>
        )}
      </Button>
    </span>
  )

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="Khách chưa có đơn hàng nào"
        description="Đơn hàng sẽ xuất hiện khi khách bấm mua, hoặc khi bạn tạo đơn cho khách."
        action={create}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{create}</div>
      <OrdersTable orders={data.items} showCustomer={false} dimmed={orders.isPlaceholderData} openId={openId} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Trang {data.page} / {Math.max(data.totalPages, 1)} · {data.totalCount} đơn hàng
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!data.hasPrevious} onClick={() => setPage(data.page - 1)}>
            <ChevronLeft data-icon="inline-start" />
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled={!data.hasNext} onClick={() => setPage(data.page + 1)}>
            Sau
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  )
}
