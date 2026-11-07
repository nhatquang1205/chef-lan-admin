import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminOrderResponse } from '@/lib/api/types'
import { formatDate, formatVnd, ORDER_METHOD_LABEL, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/lib/format'
import { cn } from '@/lib/utils'
import OrderDialog from './OrderDialog'

interface Props {
  orders: AdminOrderResponse[]
  showCustomer?: boolean
  dimmed?: boolean
  openId?: number
}

export default function OrdersTable({ orders, showCustomer = true, dimmed, openId }: Props) {
  const [picked, setPicked] = useState<AdminOrderResponse | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const selected = picked ?? (openId && !dismissed ? (orders.find((o) => o.id === openId) ?? null) : null)
  const setSelected = (order: AdminOrderResponse | null) => {
    setPicked(order)
    if (!order) setDismissed(true)
  }

  return (
    <>
      <Card className={cn('overflow-hidden p-0 transition-opacity', dimmed && 'opacity-60')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              {showCustomer && <TableHead>Khách hàng</TableHead>}
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Hình thức</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelected(order)}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{order.code}</TableCell>
                {showCustomer && (
                  <TableCell>
                    <div className="min-w-32">
                      <Link
                        to={`/customers/${order.customerId}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.customerName ?? `Khách #${order.customerId}`}
                      </Link>
                      {order.customerEmail && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{order.customerEmail}</p>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="min-w-40">
                    <p className="line-clamp-2">{order.items[0]?.title ?? '—'}</p>
                    {order.items.length > 1 && (
                      <p className="text-xs text-muted-foreground">và {order.items.length - 1} sản phẩm khác</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatVnd(order.amountVnd)}</TableCell>
                <TableCell className="whitespace-nowrap">{ORDER_METHOD_LABEL[order.paymentMethod]}</TableCell>
                <TableCell>
                  <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(order.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <OrderDialog order={selected} onOrderChange={setSelected} onClose={() => setSelected(null)} />
    </>
  )
}
