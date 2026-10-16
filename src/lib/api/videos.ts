import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type { LessonVideoRequest, LessonVideoResponse } from './types'

export function listVideos(lessonId: number) {
  return adminFetch<LessonVideoResponse[]>(`/api/v1/admins/lessons/${lessonId}/videos`)
}

export function getVideo(id: number) {
  return adminFetch<LessonVideoResponse>(`/api/v1/admins/lesson-videos/${id}`)
}

export async function invalidateAfterVideoChange(lessonId: number, courseId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['videos', lessonId] }),
    queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] }),
    queryClient.invalidateQueries({ queryKey: ['lessons', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
    queryClient.invalidateQueries({ queryKey: ['courses'] }),
  ])
}

export async function createVideo(lessonId: number, courseId: number, body: LessonVideoRequest) {
  const video = await adminFetch<LessonVideoResponse>(`/api/v1/admins/lessons/${lessonId}/videos`, {
    method: 'POST',
    body,
  })
  queryClient.setQueryData(['video', video.id], video)
  await invalidateAfterVideoChange(lessonId, courseId)
  return video
}

export async function updateVideo(id: number, courseId: number, body: LessonVideoRequest) {
  const video = await adminFetch<LessonVideoResponse>(`/api/v1/admins/lesson-videos/${id}`, { method: 'PUT', body })
  queryClient.setQueryData(['video', id], video)
  await invalidateAfterVideoChange(video.lessonId, courseId)
  return video
}

export async function deleteVideo(id: number, lessonId: number, courseId: number) {
  await adminFetch(`/api/v1/admins/lesson-videos/${id}`, { method: 'DELETE' })
  queryClient.removeQueries({ queryKey: ['video', id] })
  await invalidateAfterVideoChange(lessonId, courseId)
}

export function reorderVideos(lessonId: number, videoIds: number[]) {
  return adminFetch(`/api/v1/admins/lessons/${lessonId}/videos/order`, { method: 'PUT', body: { videoIds } })
}
