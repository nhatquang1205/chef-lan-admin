import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listCustomers } from '@/lib/api/customers'
import type { CustomerListItemResponse, CustomerListParams, CustomerStatus } from '@/lib/api/types'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_VARIANT, formatDate, formatDateTime } from '@/lib/format'

const PAGE_SIZE = 20
const ALL = 'all'
const STATUSES = Object.keys(CUSTOMER_STATUS_LABEL) as CustomerStatus[]

function parseParams(search: URLSearchParams): CustomerListParams {
  const page = Number(search.get('page'))
  const status = search.get('status')
  return {
    status: STATUSES.find((s) => s === status),
    q: search.get('q') ?? undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

function CustomerRow({ customer }: { customer: CustomerListItemResponse }) {
  const navigate = useNavigate()
  const href = `/customers/${customer.id}`

  return (
    <TableRow className="cursor-pointer" onClick={() => navigate(href)}>
      <TableCell>
        <div className="min-w-40">
          <Link to={href} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {customer.fullName}
          </Link>
          {customer.facebookName && <p className="line-clamp-1 text-xs text-muted-foreground">{customer.facebookName}</p>}
        </div>
      </TableCell>
      <TableCell>{customer.email ?? '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{customer.phone ?? '—'}</TableCell>
      <TableCell>
        <Badge variant={CUSTOMER_STATUS_VARIANT[customer.status]}>{CUSTOMER_STATUS_LABEL[customer.status]}</Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap">{customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDate(customer.createdAt)}</TableCell>
    </TableRow>
  )
}

export default function CustomersPage() {
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

  const requestParams: CustomerListParams = { ...params, pageSize: PAGE_SIZE }
  const customers = useQuery({
    queryKey: ['customers', requestParams],
    queryFn: () => listCustomers(requestParams),
    placeholderData: keepPreviousData,
  })

  const hasFilters = Boolean(params.status || params.q)
  const data = customers.data
  const addButton = (
    <Button asChild>
      <Link to="/customers/new">
        <Plus data-icon="inline-start" />
        Thêm khách hàng
      </Link>
    </Button>
  )

  function clearFilters() {
    setSearchText('')
    setSearchParams({}, { replace: true })
  }

  return (
    <>
      <PageHeader title="Khách hàng" description="Quản lý khách hàng, lời mời và quyền truy cập." actions={addButton} />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tên, email, SĐT, Facebook…"
            aria-label="Tìm khách hàng"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={params.status ?? ALL} onValueChange={(v) => update({ status: v === ALL ? undefined : v })}>
          <SelectTrigger aria-label="Trạng thái" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {CUSTOMER_STATUS_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {customers.isPending ? (
        <LoadingState />
      ) : customers.isError && !data ? (
        <ErrorState error={customers.error} onRetry={() => customers.refetch()} />
      ) : data && data.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Không có khách hàng phù hợp"
            description="Thử đổi hoặc bỏ bớt bộ lọc."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState title="Chưa có khách hàng nào" description="Thêm khách hàng đầu tiên để bắt đầu." action={addButton} />
        )
      ) : (
        data && (
          <div className="flex flex-col gap-4">
            <Card className={`overflow-hidden p-0 transition-opacity ${customers.isPlaceholderData ? 'opacity-60' : ''}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Đăng nhập gần nhất</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Trang {data.page} / {Math.max(data.totalPages, 1)} · {data.totalCount} khách hàng
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
