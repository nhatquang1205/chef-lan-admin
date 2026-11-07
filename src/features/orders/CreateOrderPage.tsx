import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import FieldLabel from '@/components/FieldLabel'
import PageHeader from '@/components/PageHeader'
import { ErrorState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import VndInput from '@/components/VndInput'
import { listCourses } from '@/lib/api/courses'
import { getCustomer, listCustomers } from '@/lib/api/customers'
import { ApiError } from '@/lib/api/client'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { createOrder, quoteOrder } from '@/lib/api/orders'
import type { CourseListItemResponse, StaffQuoteItem } from '@/lib/api/types'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'

const NOTE_MAX = 300
const MAX_ITEMS = 20
const DEFAULT_NOTE = 'Khách nhắn fanpage'

interface PickedCustomer {
  id: number
  fullName: string
  email?: string | null
  phone?: string | null
  isActive: boolean
}

type PickedCourse = Pick<CourseListItemResponse, 'id' | 'title' | 'status' | 'isSharedModule' | 'priceVnd'>

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlCustomerId = Number(searchParams.get('customerId')) || null
  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const [courses, setCourses] = useState<PickedCourse[]>([])
  const [edited, setEdited] = useState<Record<number, number | null>>({})
  const [discount, setDiscount] = useState<number | null>(null)
  const [discountReason, setDiscountReason] = useState('')
  const [note, setNote] = useState(DEFAULT_NOTE)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  const fixedCustomer = useQuery({
    queryKey: ['customer', urlCustomerId],
    queryFn: () => getCustomer(urlCustomerId!),
    enabled: urlCustomerId !== null,
  })
  const chosen: PickedCustomer | null =
    urlCustomerId !== null
      ? (fixedCustomer.data ?? null)
      : customer

  const courseIds = courses.map((c) => c.id)
  const idsKey = [...courseIds].sort((a, b) => a - b).join(',')
  const debouncedIdsKey = useDebounced(idsKey)
  const quoteReady = chosen !== null && debouncedIdsKey !== ''
  const quote = useQuery({
    queryKey: ['order-quote', chosen?.id, debouncedIdsKey],
    queryFn: () => quoteOrder(chosen!.id, debouncedIdsKey.split(',').map(Number)),
    enabled: quoteReady,
    placeholderData: keepPreviousData,
    gcTime: 0,
  })
  const quoteCurrent = quoteReady && debouncedIdsKey === idsKey && !quote.isPlaceholderData && quote.isSuccess
  const quoteById = new Map<number, StaffQuoteItem>((quote.data?.items ?? []).map((i) => [i.courseId, i]))

  const rows = courses.map((course) => {
    const q = quoteById.get(course.id)
    const owned = q?.alreadyOwned ?? false
    const systemPrice = q?.systemPriceVnd ?? null
    const listPrice = q?.listPriceVnd ?? course.priceVnd
    const hasEdit = course.id in edited
    const price = owned ? 0 : hasEdit ? edited[course.id] : systemPrice
    const outOfRange = !owned && price !== null && price > listPrice
    return { course, q, owned, systemPrice, listPrice, hasEdit, price, outOfRange }
  })
  const payable = rows.filter((r) => !r.owned)
  const subtotal = payable.reduce((sum, r) => sum + (r.price ?? 0), 0)
  const orderDiscount = discount ?? 0
  const total = subtotal - orderDiscount
  const hasOwned = rows.some((r) => r.owned)
  const missingPrice = payable.some((r) => r.price === null)

  const problems: string[] = []
  if (!chosen) problems.push('Chọn khách hàng.')
  else if (!chosen.isActive) problems.push('Tài khoản khách đang bị khóa. Hãy mở khóa trước khi tạo đơn.')
  if (courses.length === 0) problems.push('Thêm ít nhất một khóa học.')
  if (hasOwned) problems.push('Bỏ các khóa khách đã có khỏi đơn.')
  if (rows.some((r) => r.outOfRange)) problems.push('Giá một khóa không được lớn hơn giá gốc.')
  if (missingPrice) problems.push('Nhập giá cho mọi khóa.')
  if (orderDiscount > 0 && !discountReason.trim()) problems.push('Nhập lý do giảm thêm.')
  if (orderDiscount > subtotal) problems.push('Giảm thêm không được lớn hơn tạm tính.')
  if (!note.trim()) problems.push('Nhập ghi chú thanh toán.')
  else if (note.trim().length > NOTE_MAX) problems.push(`Ghi chú tối đa ${NOTE_MAX} ký tự.`)
  if (chosen && courses.length > 0 && !hasOwned && !missingPrice && orderDiscount <= subtotal && total <= 0) {
    problems.push('Thành tiền phải lớn hơn 0.')
  }
  if (chosen && courses.length > 0 && !quoteCurrent) problems.push('Đang tính giá…')
  const blocked = problems.length > 0

  const addCourse = (course: PickedCourse) => {
    setCourses((current) => (current.some((c) => c.id === course.id) ? current : [...current, course]))
  }
  const removeCourse = (id: number) => {
    setCourses((current) => current.filter((c) => c.id !== id))
    setEdited(({ [id]: _removed, ...rest }) => rest)
  }

  const submit = async () => {
    setServerErrors({})
    try {
      const order = await createOrder({
        customerId: chosen!.id,
        items: payable.map((r) => ({
          courseId: r.course.id,
          ...(r.hasEdit && r.price !== null ? { unitPriceVnd: r.price } : {}),
        })),
        ...(orderDiscount > 0 ? { orderDiscountVnd: orderDiscount, orderDiscountReason: discountReason.trim() } : {}),
        note: note.trim(),
      })
      toast.success(`Đã tạo đơn ${order.code}, khách được mở quyền học.`)
      navigate(`/customers/${order.customerId}?tab=orders&order=${order.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) void quote.refetch()
      const mapped = fieldErrors(error)
      if (Object.keys(mapped).length > 0) setServerErrors(mapped)
      throw error
    }
  }

  const backTo = urlCustomerId !== null ? `/customers/${urlCustomerId}?tab=orders` : '/orders'
  const disabledByCustomer = !chosen

  return (
    <>
      <PageHeader
        title="Tạo đơn hàng"
        description="Đơn do nhân viên tạo được ghi nhận đã thanh toán và mở quyền học cho khách ngay."
        breadcrumb={[
          { label: 'Đơn hàng', to: '/orders' },
          { label: 'Tạo đơn hàng' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-3 p-4">
            <h2 className="font-semibold">1. Khách hàng</h2>
            {urlCustomerId !== null ? (
              fixedCustomer.isPending ? (
                <p className="text-sm text-muted-foreground">Đang tải…</p>
              ) : fixedCustomer.error ? (
                <ErrorState error={fixedCustomer.error} onRetry={() => fixedCustomer.refetch()} />
              ) : (
                <CustomerSummary customer={chosen!} />
              )
            ) : chosen ? (
              <CustomerSummary customer={chosen} onChange={() => setCustomer(null)} />
            ) : (
              <CustomerPicker onPick={setCustomer} />
            )}
            <p className="text-sm text-muted-foreground">
              Khách mới? Tạo ở màn hình{' '}
              <Link to="/customers/new" className="underline">
                Khách hàng
              </Link>{' '}
              trước.
            </p>
          </Card>

          <Card className={cn('gap-3 p-4', disabledByCustomer && 'pointer-events-none opacity-50')} aria-disabled={disabledByCustomer}>
            <h2 className="font-semibold">2. Khóa học</h2>
            <CoursePicker disabled={disabledByCustomer} picked={courseIds} onPick={addCourse} full={courses.length >= MAX_ITEMS} />

            {courses.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Bảng giá</h3>
                {quote.error && !quote.isPlaceholderData && (
                  <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
                )}
                <div className={cn('flex flex-col gap-3 transition-opacity', quote.isFetching && 'opacity-70')}>
                  {rows.map((row) => (
                    <PriceRow
                      key={row.course.id}
                      row={row}
                      error={serverErrors[`items[${payable.indexOf(row)}].UnitPriceVnd`]}
                      onEdit={(value) => setEdited((current) => ({ ...current, [row.course.id]: value }))}
                      onReset={() =>
                        setEdited(({ [row.course.id]: _removed, ...rest }) => rest)
                      }
                      onRemove={() => removeCourse(row.course.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className={cn('gap-4 p-4', disabledByCustomer && 'pointer-events-none opacity-50')}>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="order-discount">Giảm thêm cho cả đơn</FieldLabel>
              <VndInput
                id="order-discount"
                value={discount}
                disabled={disabledByCustomer}
                aria-invalid={!!serverErrors.orderDiscountVnd}
                onChange={setDiscount}
              />
              {serverErrors.orderDiscountVnd && <p className="text-sm text-destructive">{serverErrors.orderDiscountVnd}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="order-discount-reason" required={orderDiscount > 0}>
                Lý do giảm thêm
              </FieldLabel>
              <Input
                id="order-discount-reason"
                maxLength={NOTE_MAX}
                value={discountReason}
                disabled={disabledByCustomer}
                aria-invalid={!!serverErrors.orderDiscountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
              {serverErrors.orderDiscountReason && (
                <p className="text-sm text-destructive">{serverErrors.orderDiscountReason}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="order-note" required>
                Ghi chú thanh toán
              </FieldLabel>
              <Input
                id="order-note"
                maxLength={NOTE_MAX}
                value={note}
                disabled={disabledByCustomer}
                aria-invalid={!!serverErrors.note}
                onChange={(e) => setNote(e.target.value)}
              />
              {serverErrors.note && <p className="text-sm text-destructive">{serverErrors.note}</p>}
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card className="gap-3 p-4">
            <h2 className="font-semibold">Tổng kết</h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tạm tính</dt>
                <dd>{formatVnd(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Giảm thêm</dt>
                <dd>{orderDiscount > 0 ? `−${formatVnd(orderDiscount)}` : formatVnd(0)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
                <dt>Thành tiền</dt>
                <dd data-testid="order-total">{formatVnd(Math.max(total, 0))}</dd>
              </div>
            </dl>
            {submitted && blocked && (
              <ul className="list-disc pl-4 text-sm text-destructive">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!chosen || courses.length === 0}
                onClick={() => {
                  setSubmitted(true)
                  if (!blocked) setConfirmOpen(true)
                }}
              >
                {quote.isFetching && <Loader2 className="animate-spin" />}
                Tạo đơn và cấp quyền
              </Button>
              <Button variant="outline" asChild>
                <Link to={backTo}>Hủy</Link>
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tạo đơn và cấp quyền?"
        description={
          <span className="flex flex-col gap-2">
            <span>
              Khách: <strong>{chosen?.fullName}</strong>
            </span>
            <span>
              Khóa học:
              <span className="block">
                {payable.map((r) => (
                  <span key={r.course.id} className="block">
                    • {r.course.title} · {formatVnd(r.price ?? 0)}
                  </span>
                ))}
              </span>
            </span>
            <span>
              Thành tiền: <strong>{formatVnd(Math.max(total, 0))}</strong>
            </span>
            <span>Khách sẽ được mở quyền học ngay.</span>
          </span>
        }
        confirmLabel="Tạo đơn"
        onConfirm={submit}
      />
    </>
  )
}

function CustomerSummary({ customer, onChange }: { customer: PickedCustomer; onChange?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{customer.fullName}</p>
        <p className="break-words text-muted-foreground">
          {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'Chưa có email, số điện thoại'}
        </p>
        {!customer.isActive && <p className="mt-1 text-destructive">Tài khoản đang bị khóa.</p>}
      </div>
      {onChange && (
        <Button variant="outline" size="sm" onClick={onChange}>
          Đổi khách
        </Button>
      )}
    </div>
  )
}

function CustomerPicker({ onPick }: { onPick: (customer: PickedCustomer) => void }) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim())
  const customers = useQuery({
    queryKey: ['customers', { q, pageSize: 8, picker: true }],
    queryFn: () => listCustomers({ q, pageSize: 8 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor="order-customer-search" required>
        Tìm khách hàng
      </FieldLabel>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="order-customer-search"
          className="pl-8"
          placeholder="Tên, email, số điện thoại…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {customers.isPending ? (
          <p className="p-3 text-sm text-muted-foreground">Đang tải…</p>
        ) : customers.error ? (
          <p className="p-3 text-sm text-destructive">{messageFor(customers.error)}</p>
        ) : customers.data.items.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Không có khách hàng nào.</p>
        ) : (
          customers.data.items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.status === 'Inactive'}
              onClick={() =>
                onPick({
                  id: item.id,
                  fullName: item.fullName,
                  email: item.email,
                  phone: item.phone,
                  isActive: item.status !== 'Inactive',
                })
              }
              className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[item.email, item.phone].filter(Boolean).join(' · ') || '—'}
                </span>
              </span>
              {item.status === 'Inactive' && <Badge variant="destructive">Đã khóa</Badge>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function CoursePicker({
  disabled,
  picked,
  full,
  onPick,
}: {
  disabled: boolean
  picked: number[]
  full: boolean
  onPick: (course: PickedCourse) => void
}) {
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim())
  const courses = useQuery({
    queryKey: ['courses', { q, pageSize: 8, picker: true }],
    queryFn: () => listCourses({ q, pageSize: 8 }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor="order-course-search" required>
        Thêm khóa học
      </FieldLabel>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="order-course-search"
          className="pl-8"
          placeholder="Tìm khóa học…"
          disabled={disabled}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {courses.isPending ? (
          <p className="p-3 text-sm text-muted-foreground">Đang tải…</p>
        ) : courses.error ? (
          <p className="p-3 text-sm text-destructive">{messageFor(courses.error)}</p>
        ) : courses.data.items.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Không có khóa học nào.</p>
        ) : (
          courses.data.items.map((item) => {
            const added = picked.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled || added || full}
                onClick={() => onPick(item)}
                className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate">{item.title}</span>
                  {item.isSharedModule && <Badge variant="outline">Học phần chung</Badge>}
                  {item.status === 'Draft' && <Badge variant="secondary">Nháp</Badge>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {added ? 'Đã thêm' : formatVnd(item.priceVnd)}
                </span>
              </button>
            )
          })
        )}
      </div>
      {full && <p className="text-sm text-muted-foreground">Mỗi đơn tối đa {MAX_ITEMS} khóa học.</p>}
    </div>
  )
}

interface Row {
  course: PickedCourse
  q?: StaffQuoteItem
  owned: boolean
  systemPrice: number | null
  listPrice: number
  hasEdit: boolean
  price: number | null
  outOfRange: boolean
}

function PriceRow({
  row,
  error,
  onEdit,
  onReset,
  onRemove,
}: {
  row: Row
  error?: string
  onEdit: (value: number | null) => void
  onReset: () => void
  onRemove: () => void
}) {
  const { course, q, owned } = row
  return (
    <div className={cn('flex flex-col gap-2 rounded-md border p-3', owned && 'border-destructive/50 bg-destructive/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="font-medium">{course.title}</span>
          {course.isSharedModule && <Badge variant="outline">Học phần chung</Badge>}
          {course.status === 'Draft' && <Badge variant="secondary">Nháp</Badge>}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Bỏ ${course.title}`} onClick={onRemove}>
          <X />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Giá gốc {formatVnd(row.listPrice)}</p>
      {owned ? (
        <p className="text-sm font-medium text-destructive">Khách đã có khóa này. Bỏ khóa này khỏi đơn để tiếp tục.</p>
      ) : (
        <>
          {q && q.discounts.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-sm">
              {q.discounts.map((d) => (
                <li key={d.includedCourseId} className="flex justify-between gap-3 text-muted-foreground">
                  <span>{d.reason}</span>
                  <span className="shrink-0">−{formatVnd(d.discountVnd)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={`price-${course.id}`}>Giá bán</FieldLabel>
              {row.hasEdit && row.systemPrice !== null && (
                <button type="button" className="text-xs text-muted-foreground underline" onClick={onReset}>
                  Khôi phục {formatVnd(row.systemPrice)}
                </button>
              )}
            </div>
            <VndInput
              id={`price-${course.id}`}
              value={row.price}
              disabled={row.systemPrice === null && !row.hasEdit}
              aria-invalid={row.outOfRange || !!error}
              onChange={onEdit}
            />
            {row.outOfRange && (
              <p className="text-sm text-destructive">Không được lớn hơn giá gốc {formatVnd(row.listPrice)}.</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}
