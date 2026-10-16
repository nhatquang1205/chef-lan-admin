import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type {
  CustomerDetailResponse,
  CustomerListItemResponse,
  CustomerListParams,
  CustomerRequest,
  InviteResponse,
  PagedResult,
} from './types'

const BASE = '/api/v1/admins/customers'

export function invalidateCustomers(id?: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customers'] }),
    id !== undefined ? queryClient.invalidateQueries({ queryKey: ['customer', id] }) : undefined,
  ])
}

export function listCustomers(params: CustomerListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return adminFetch<PagedResult<CustomerListItemResponse>>(query ? `${BASE}?${query}` : BASE)
}

export function getCustomer(id: number) {
  return adminFetch<CustomerDetailResponse>(`${BASE}/${id}`)
}

export async function createCustomer(input: CustomerRequest) {
  const created = await adminFetch<CustomerDetailResponse>(BASE, { method: 'POST', body: input })
  queryClient.setQueryData(['customer', created.id], created)
  await invalidateCustomers()
  return created
}

export async function updateCustomer(id: number, input: CustomerRequest) {
  const updated = await adminFetch<CustomerDetailResponse>(`${BASE}/${id}`, { method: 'PUT', body: input })
  queryClient.setQueryData(['customer', id], updated)
  await invalidateCustomers()
  return updated
}

export async function deactivateCustomer(id: number) {
  await adminFetch(`${BASE}/${id}/deactivate`, { method: 'POST' })
  await invalidateCustomers(id)
}

export async function reactivateCustomer(id: number) {
  await adminFetch(`${BASE}/${id}/reactivate`, { method: 'POST' })
  await invalidateCustomers(id)
}

export async function inviteCustomer(id: number) {
  const result = await adminFetch<InviteResponse>(`${BASE}/${id}/invite`, { method: 'POST' })
  await invalidateCustomers(id)
  return result
}
