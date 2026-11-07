import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type {
  AdminOrderResponse,
  CreateStaffOrderRequest,
  OrderListParams,
  PagedResult,
  StaffOrderQuoteResponse,
} from './types'

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

export function quoteOrder(customerId: number, courseIds: number[]) {
  return adminFetch<StaffOrderQuoteResponse>(`${BASE}/quote`, { method: 'POST', body: { customerId, courseIds } })
}

export async function createOrder(input: CreateStaffOrderRequest) {
  const order = await adminFetch<AdminOrderResponse>(BASE, { method: 'POST', body: input })
  await Promise.all([
    invalidateOrders(order.customerId),
    queryClient.invalidateQueries({ queryKey: ['customer', order.customerId] }),
    queryClient.invalidateQueries({ queryKey: ['courses'] }),
  ])
  return order
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
