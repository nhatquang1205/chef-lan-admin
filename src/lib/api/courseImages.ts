import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { CourseImageResponse } from './types'

const base = (courseId: number) => `/api/v1/admins/courses/${courseId}/images`

export function listCourseImages(courseId: number) {
  return adminFetch<CourseImageResponse[]>(base(courseId))
}

export interface AttachImageBody {
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
}

export async function attachCourseImage(courseId: number, body: AttachImageBody) {
  const image = await adminFetch<CourseImageResponse>(base(courseId), { method: 'POST', body })
  await queryClient.invalidateQueries({ queryKey: ['course-images', courseId] })
  return image
}

export function updateCourseImageAlt(imageId: number, alt: string | null) {
  return adminFetch<CourseImageResponse>(`/api/v1/admins/course-images/${imageId}`, { method: 'PUT', body: { alt } })
}

export async function deleteCourseImage(courseId: number, imageId: number) {
  await adminFetch(`/api/v1/admins/course-images/${imageId}`, { method: 'DELETE' })
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['course-images', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['courses'] }),
  ])
}

export function reorderCourseImages(courseId: number, imageIds: number[]) {
  return adminFetch(`${base(courseId)}/order`, { method: 'PUT', body: { imageIds } })
}
