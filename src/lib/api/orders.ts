import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { AdminOrderResponse, OrderListParams, PagedResult } from './types'

const BASE = '/api/v1/admins/orders'

export function invalidateOrders(customerId?: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    customerId !== undefined ? queryClient.invalidateQueries({ queryKey: ['customer-access', customerId] }) : undefined,
  ])
}

export function listOrders(params: OrderListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return adminFetch<PagedResult<AdminOrderResponse>>(query ? `${BASE}?${query}` : BASE)
}

export async function markOrderPaid(id: number, reason: string) {
  const order = await adminFetch<AdminOrderResponse>(`${BASE}/${id}/mark-paid`, { method: 'POST', body: { reason } })
  await invalidateOrders(order.customerId)
  return order
}

export async function cancelOrder(id: number) {
  const order = await adminFetch<AdminOrderResponse>(`${BASE}/${id}/cancel`, { method: 'POST' })
  await invalidateOrders(order.customerId)
  return order
}
