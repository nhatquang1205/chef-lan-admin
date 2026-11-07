import { Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import FieldLabel from '@/components/FieldLabel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { cancelOrder, markOrderPaid } from '@/lib/api/orders'
import type { AdminOrderResponse } from '@/lib/api/types'
import {
  formatDateTime,
  formatVnd,
  ORDER_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
} from '@/lib/format'

interface Props {
  order: AdminOrderResponse | null
  onOrderChange: (order: AdminOrderResponse) => void
  onClose: () => void
}

const REASON_MAX = 300

function defaultReason(order: AdminOrderResponse) {
  return order.paymentMethod === 'ContactChef' ? 'Khách thanh toán trực tiếp với Chef Lan' : 'Đã kiểm tra chuyển khoản'
}

export default function OrderDialog({ order, onOrderChange, onClose }: Props) {
  const [approving, setApproving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const close = () => {
    setApproving(false)
    onClose()
  }

  return (
    <>
      <Dialog open={order !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {order &&
            (approving ? (
              <ApproveForm
                order={order}
                onBack={() => setApproving(false)}
                onDone={(updated) => {
                  onOrderChange(updated)
                  setApproving(false)
                }}
              />
            ) : (
              <Details
                order={order}
                onApprove={() => setApproving(true)}
                onCancel={() => setConfirmCancel(true)}
                onClose={close}
              />
            ))}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Hủy đơn hàng?"
        description={order ? `Đơn ${order.code} sẽ bị hủy và khách không thể thanh toán đơn này nữa.` : undefined}
        confirmLabel="Hủy đơn"
        destructive
        onConfirm={async () => {
          if (!order) return
          onOrderChange(await cancelOrder(order.id))
          toast.success('Đã hủy đơn hàng.')
        }}
      />
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words">{children}</dd>
    </div>
  )
}

function Details({
  order,
  onApprove,
  onCancel,
  onClose,
}: {
  order: AdminOrderResponse
  onApprove: () => void
  onCancel: () => void
  onClose: () => void
}) {
  const canApprove = order.status === 'Pending' || order.status === 'Expired'
  const canCancel = order.status === 'Pending'

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{order.code}</span>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
        </DialogTitle>
        <DialogDescription>{ORDER_METHOD_LABEL[order.paymentMethod]}</DialogDescription>
      </DialogHeader>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Khách hàng</h3>
        <dl className="divide-y">
          <Row label="Họ tên">
            <Link to={`/customers/${order.customerId}`} className="font-medium hover:underline">
              {order.customerName ?? `Khách #${order.customerId}`}
            </Link>
          </Row>
          <Row label="Email">{order.customerEmail ?? '—'}</Row>
          <Row label="Điện thoại">{order.customerPhone ?? '—'}</Row>
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Sản phẩm</h3>
        <ul className="divide-y rounded-md border">
          {order.items.map((item, index) => (
            <li key={index} className="flex flex-col gap-0.5 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{item.title}</span>
                <span className="shrink-0">{formatVnd(item.unitPriceVnd)}</span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{item.kind === 'Course' ? 'Khóa học' : 'Bài học'}</span>
                {item.discountVnd > 0 && (
                  <span>
                    Giá gốc {formatVnd(item.listPriceVnd)} · giảm {formatVnd(item.discountVnd)}
                  </span>
                )}
              </div>
              {item.discountReason && <p className="text-xs text-muted-foreground">{item.discountReason}</p>}
            </li>
          ))}
        </ul>
        {order.discountVnd != null && order.discountVnd > 0 && (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Giảm thêm cho cả đơn{order.discountReason ? ` (${order.discountReason})` : ''}
            </span>
            <span className="shrink-0">−{formatVnd(order.discountVnd)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 text-sm font-semibold">
          <span>Tổng cộng</span>
          <span>{formatVnd(order.amountVnd)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Thời gian</h3>
        <dl className="divide-y">
          <Row label="Ngày tạo">{formatDateTime(order.createdAt)}</Row>
          {order.paymentMethod !== 'StaffCreated' && (
            <Row label="Hết hạn giữ đơn">{formatDateTime(order.expiresAt)}</Row>
          )}
          {order.paidAt && <Row label="Ngày thanh toán">{formatDateTime(order.paidAt)}</Row>}
          {order.status === 'Paid' && order.paidVia && (
            <Row label="Cách xác nhận">
              {order.paidVia === 'Webhook' ? 'Tự động qua cổng thanh toán' : 'Nhân viên duyệt'}
            </Row>
          )}
          {order.paidReason && <Row label="Lý do duyệt">{order.paidReason}</Row>}
          {order.paidByStaffId != null && <Row label="Người duyệt">Nhân viên #{order.paidByStaffId}</Row>}
        </dl>
      </section>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
        {canCancel && (
          <Button variant="destructive" onClick={onCancel}>
            Hủy đơn
          </Button>
        )}
        {canApprove && <Button onClick={onApprove}>Duyệt đơn</Button>}
      </DialogFooter>
    </>
  )
}

function ApproveForm({
  order,
  onBack,
  onDone,
}: {
  order: AdminOrderResponse
  onBack: () => void
  onDone: (order: AdminOrderResponse) => void
}) {
  const [reason, setReason] = useState(() => defaultReason(order))
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const trimmed = reason.trim()
    if (!trimmed) return setError('Vui lòng nhập lý do.')
    if (trimmed.length > REASON_MAX) return setError(`Lý do tối đa ${REASON_MAX} ký tự.`)
    setPending(true)
    setError(undefined)
    try {
      onDone(await markOrderPaid(order.id, trimmed))
      toast.success('Đã duyệt đơn, khách được mở quyền học.')
    } catch (err) {
      const mapped = fieldErrors(err)
      if (mapped.reason) setError(mapped.reason)
      else toast.error(messageFor(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Duyệt đơn {order.code}</DialogTitle>
        <DialogDescription>
          Chỉ duyệt khi bạn đã xác nhận khách thanh toán {formatVnd(order.amountVnd)}. Hệ thống không chuyển tiền.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="order-reason" required>
          Lý do duyệt
        </FieldLabel>
        <Textarea
          id="order-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          aria-invalid={!!error}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-sm text-muted-foreground">Khách sẽ được mở quyền học ngay.</p>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onBack}>
          Quay lại
        </Button>
        <Button disabled={pending} onClick={() => void submit()}>
          {pending && <Loader2 className="animate-spin" />}
          Duyệt đơn
        </Button>
      </DialogFooter>
    </>
  )
}
