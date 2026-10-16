import type { CourseLevel, CourseStatus } from '@/lib/api/types'

const vndFormat = new Intl.NumberFormat('vi-VN')

export function formatVnd(amount: number): string {
  return `${vndFormat.format(amount)} ₫`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`
  if (minutes > 0) return `${minutes} phút`
  return `${total} giây`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN')
}

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  Draft: 'Nháp',
  Published: 'Đã xuất bản',
  Archived: 'Lưu trữ',
}

export const COURSE_LEVEL_LABEL: Record<CourseLevel, string> = {
  Unspecified: 'Không xác định',
  Beginner: 'Cơ bản',
  Intermediate: 'Trung cấp',
  Advanced: 'Nâng cao',
}

export const COURSE_STATUS_VARIANT: Record<CourseStatus, 'default' | 'secondary' | 'outline'> = {
  Draft: 'secondary',
  Published: 'default',
  Archived: 'outline',
}
