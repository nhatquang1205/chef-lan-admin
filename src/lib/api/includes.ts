import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { CourseIncludeResponse, IncludedInResponse } from './types'

const base = (courseId: number) => `/api/v1/admins/courses/${courseId}`

export function listIncludes(courseId: number) {
  return adminFetch<CourseIncludeResponse[]>(`${base(courseId)}/includes`)
}

export function listIncludedIn(courseId: number) {
  return adminFetch<IncludedInResponse[]>(`${base(courseId)}/included-in`)
}

async function afterChange(courseId: number, includedCourseId?: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['course-includes', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
    includedCourseId !== undefined
      ? queryClient.invalidateQueries({ queryKey: ['course-included-in', includedCourseId] })
      : queryClient.invalidateQueries({ queryKey: ['course-included-in'] }),
    includedCourseId !== undefined
      ? queryClient.invalidateQueries({ queryKey: ['course', includedCourseId] })
      : Promise.resolve(),
  ])
}

export async function upsertInclude(courseId: number, includedCourseId: number, discountVnd: number) {
  const result = await adminFetch<CourseIncludeResponse>(`${base(courseId)}/includes/${includedCourseId}`, {
    method: 'PUT',
    body: { discountVnd },
  })
  await afterChange(courseId, includedCourseId)
  return result
}

export async function removeInclude(courseId: number, includedCourseId: number) {
  await adminFetch(`${base(courseId)}/includes/${includedCourseId}`, { method: 'DELETE' })
  await afterChange(courseId, includedCourseId)
}

export async function reorderIncludes(courseId: number, includedCourseIds: number[]) {
  await adminFetch(`${base(courseId)}/includes/order`, { method: 'PUT', body: { includedCourseIds } })
}
