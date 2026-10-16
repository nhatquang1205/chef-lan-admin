import { adminFetch } from './admin'
import type { CourseListItemResponse, CourseListParams, PagedResult } from './types'

export function listCourses(params: CourseListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return adminFetch<PagedResult<CourseListItemResponse>>(`/api/v1/admins/courses${query ? `?${query}` : ''}`)
}
