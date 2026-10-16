import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { LessonDetailResponse, LessonListItemResponse, LessonRequest } from './types'

export function listLessons(courseId: number) {
  return adminFetch<LessonListItemResponse[]>(`/api/v1/admins/courses/${courseId}/lessons`)
}

export function getLesson(id: number) {
  return adminFetch<LessonDetailResponse>(`/api/v1/admins/lessons/${id}`)
}

async function afterLessonChange(courseId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lessons', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['courses'] }),
  ])
}

export async function createLesson(courseId: number, body: LessonRequest) {
  const lesson = await adminFetch<LessonDetailResponse>(`/api/v1/admins/courses/${courseId}/lessons`, {
    method: 'POST',
    body,
  })
  queryClient.setQueryData(['lesson', lesson.id], lesson)
  await afterLessonChange(courseId)
  return lesson
}

export async function updateLesson(id: number, body: LessonRequest) {
  const lesson = await adminFetch<LessonDetailResponse>(`/api/v1/admins/lessons/${id}`, { method: 'PUT', body })
  queryClient.setQueryData(['lesson', id], lesson)
  await afterLessonChange(lesson.courseId)
  return lesson
}

export async function deleteLesson(id: number, courseId: number) {
  await adminFetch(`/api/v1/admins/lessons/${id}`, { method: 'DELETE' })
  queryClient.removeQueries({ queryKey: ['lesson', id] })
  await afterLessonChange(courseId)
}

export function reorderLessons(courseId: number, lessonIds: number[]) {
  return adminFetch(`/api/v1/admins/courses/${courseId}/lessons/order`, { method: 'PUT', body: { lessonIds } })
}
