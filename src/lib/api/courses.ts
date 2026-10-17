import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { CourseAdminDetailResponse, CourseListItemResponse, CourseListParams, CourseRequest, PagedResult } from './types'

export function listCourses(params: CourseListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return adminFetch<PagedResult<CourseListItemResponse>>(`/api/v1/admins/courses${query ? `?${query}` : ''}`)
}

export type ThumbnailInput = { kind: 'none' } | { kind: 'url'; url: string }

export interface CourseInput extends Omit<CourseRequest, 'thumbnailUrl'> {
  thumbnail: ThumbnailInput
}

function toJson({ thumbnail, ...fields }: CourseInput): CourseRequest {
  return { ...fields, thumbnailUrl: thumbnail.kind === 'url' ? thumbnail.url : null }
}

export function getCourse(id: number) {
  return adminFetch<CourseAdminDetailResponse>(`/api/v1/admins/courses/${id}`)
}

export async function createCourse(input: CourseInput) {
  const course = await adminFetch<CourseAdminDetailResponse>('/api/v1/admins/courses', { method: 'POST', body: toJson(input) })
  await queryClient.invalidateQueries({ queryKey: ['courses'] })
  queryClient.setQueryData(['course', course.id], course)
  return course
}

export async function updateCourse(id: number, input: CourseInput) {
  const course = await adminFetch<CourseAdminDetailResponse>(`/api/v1/admins/courses/${id}`, {
    method: 'PUT',
    body: toJson(input),
  })
  await queryClient.invalidateQueries({ queryKey: ['courses'] })
  queryClient.setQueryData(['course', id], course)
  return course
}

async function afterStatusChange(id: number) {
  await queryClient.invalidateQueries({ queryKey: ['courses'] })
  await queryClient.invalidateQueries({ queryKey: ['course', id] })
}

export async function publishCourse(id: number) {
  await adminFetch(`/api/v1/admins/courses/${id}/publish`, { method: 'POST' })
  await afterStatusChange(id)
}

export async function unpublishCourse(id: number) {
  await adminFetch(`/api/v1/admins/courses/${id}/unpublish`, { method: 'POST' })
  await afterStatusChange(id)
}

export async function deleteCourse(id: number) {
  await adminFetch(`/api/v1/admins/courses/${id}`, { method: 'DELETE' })
  queryClient.removeQueries({ queryKey: ['course', id] })
  await queryClient.invalidateQueries({ queryKey: ['courses'] })
}
