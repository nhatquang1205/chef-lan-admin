import { adminFetch } from './admin'
import { queryClient } from '@/lib/query'
import type {
  CourseEnrollmentResponse,
  CourseQuoteResponse,
  CustomerAccessResponse,
  GrantAccessFields,
  LessonEnrollmentResponse,
} from './types'

const BASE = '/api/v1/admins'

export function getCustomerAccess(customerId: number) {
  return adminFetch<CustomerAccessResponse>(`${BASE}/customers/${customerId}/access`)
}

export function getCourseQuote(customerId: number, courseId: number) {
  return adminFetch<CourseQuoteResponse>(`${BASE}/customers/${customerId}/quote?courseId=${courseId}`)
}

async function afterChange(customerId: number, courseId?: number | null) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customer-access', customerId] }),
    queryClient.invalidateQueries({ queryKey: ['courses'] }),
    courseId ? queryClient.invalidateQueries({ queryKey: ['course', courseId] }) : undefined,
  ])
}

export async function grantCourseAccess(courseId: number, fields: GrantAccessFields) {
  const result = await adminFetch<CourseEnrollmentResponse>(`${BASE}/enrollments`, {
    method: 'POST',
    body: { courseId, ...fields },
  })
  await afterChange(fields.customerId, courseId)
  return result
}

export async function grantLessonAccess(lessonId: number, courseId: number, fields: GrantAccessFields) {
  const result = await adminFetch<LessonEnrollmentResponse>(`${BASE}/lesson-enrollments`, {
    method: 'POST',
    body: { lessonId, ...fields },
  })
  await afterChange(fields.customerId, courseId)
  return result
}

export async function revokeCourseAccess(enrollment: CourseEnrollmentResponse) {
  await adminFetch(`${BASE}/enrollments/${enrollment.id}/revoke`, { method: 'POST' })
  await afterChange(enrollment.customerId, enrollment.courseId)
}

export async function revokeLessonAccess(enrollment: LessonEnrollmentResponse) {
  await adminFetch(`${BASE}/lesson-enrollments/${enrollment.id}/revoke`, { method: 'POST' })
  await afterChange(enrollment.customerId, enrollment.courseId)
}
