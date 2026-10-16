import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { CategoryAdminResponse, CategoryRequest } from './types'

const BASE = '/api/v1/admins/categories'

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] })

export function listCategories() {
  return adminFetch<CategoryAdminResponse[]>(BASE)
}

export function getCategory(id: number) {
  return adminFetch<CategoryAdminResponse>(`${BASE}/${id}`)
}

export async function createCategory(input: CategoryRequest) {
  const created = await adminFetch<CategoryAdminResponse>(BASE, { method: 'POST', body: input })
  await invalidate()
  return created
}

export async function updateCategory(id: number, input: CategoryRequest) {
  const updated = await adminFetch<CategoryAdminResponse>(`${BASE}/${id}`, { method: 'PUT', body: input })
  await invalidate()
  return updated
}

export async function deleteCategory(id: number) {
  await adminFetch(`${BASE}/${id}`, { method: 'DELETE' })
  await invalidate()
}
