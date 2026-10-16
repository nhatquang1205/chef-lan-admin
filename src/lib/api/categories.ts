import { adminFetch } from './admin'
import type { CategoryAdminResponse } from './types'

export function listCategories() {
  return adminFetch<CategoryAdminResponse[]>('/api/v1/admins/categories')
}
