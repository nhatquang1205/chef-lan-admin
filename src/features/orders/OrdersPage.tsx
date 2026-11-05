import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listOrders } from '@/lib/api/orders'
import type { OrderListParams, OrderPaymentMethod, OrderStatus } from '@/lib/api/types'
import { ORDER_METHOD_LABEL, ORDER_STATUS_LABEL } from '@/lib/format'
import OrdersTable from './OrdersTable'

const PAGE_SIZE = 20
const ALL = 'all'
const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]
const METHODS = Object.keys(ORDER_METHOD_LABEL) as OrderPaymentMethod[]

function parseParams(search: URLSearchParams): OrderListParams {
  const page = Number(search.get('page'))
  const status = search.get('status')
  const method = search.get('method')
  return {
    status: STATUSES.find((s) => s === status),
    paymentMethod: METHODS.find((m) => m === method),
    q: search.get('q') ?? undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseParams(searchParams)
  const urlQuery = params.q ?? ''
  const [searchText, setSearchText] = useState(urlQuery)

  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  if (syncedQuery !== urlQuery) {
    setSyncedQuery(urlQuery)
    setSearchText(urlQuery)
  }

  function update(changes: Record<string, string | undefined>, keepPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!keepPage) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    const trimmed = searchText.trim()
    if (trimmed === urlQuery) return
    const timer = setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (trimmed) next.set('q', trimmed)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText, urlQuery, setSearchParams])

  const requestParams: OrderListParams = { ...params, pageSize: PAGE_SIZE }
  const orders = useQuery({
    queryKey: ['orders', requestParams],
    queryFn: () => listOrders(requestParams),
    placeholderData: keepPreviousData,
  })

  const hasFilters = Boolean(params.status || params.paymentMethod || params.q)
  const data = orders.data
  function clearFilters() {
    setSearchText('')
    setSearchParams({}, { replace: true })
  }

  return (
    <>
      <PageHeader title="Đơn hàng" description="Theo dõi và duyệt đơn mua khóa học, bài học." />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Mã đơn, tên, email, SĐT…"
            aria-label="Tìm đơn hàng"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={params.status ?? ALL} onValueChange={(v) => update({ status: v === ALL ? undefined : v })}>
          <SelectTrigger aria-label="Trạng thái" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {ORDER_STATUS_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.paymentMethod ?? ALL}
          onValueChange={(v) => update({ method: v === ALL ? undefined : v })}
        >
          <SelectTrigger aria-label="Hình thức" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi hình thức</SelectItem>
            {METHODS.map((value) => (
              <SelectItem key={value} value={value}>
                {ORDER_METHOD_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.isPending ? (
        <LoadingState />
      ) : orders.isError && !data ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      ) : data && data.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Không có đơn hàng phù hợp"
            description="Thử đổi hoặc bỏ bớt bộ lọc."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState title="Chưa có đơn hàng nào" description="Đơn hàng sẽ xuất hiện khi khách bấm mua." />
        )
      ) : (
        data && (
          <div className="flex flex-col gap-4">
            <OrdersTable orders={data.items} dimmed={orders.isPlaceholderData} />

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Trang {data.page} / {Math.max(data.totalPages, 1)} · {data.totalCount} đơn hàng
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasPrevious}
                  onClick={() => update({ page: String(data.page - 1) }, true)}
                >
                  <ChevronLeft data-icon="inline-start" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasNext}
                  onClick={() => update({ page: String(data.page + 1) }, true)}
                >
                  Sau
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </>
  )
}
