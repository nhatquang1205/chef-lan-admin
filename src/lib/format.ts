import type { CourseLevel, CourseStatus, CustomerStatus, VideoProvider } from '@/lib/api/types'

const vndFormat = new Intl.NumberFormat('vi-VN')

export function formatVnd(amount: number): string {
  return `${vndFormat.format(amount)} ₫`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
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

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Accepts "mm:ss" or "h:mm:ss"; returns null when malformed. Empty is 0.
export function parseClock(value: string): number | null {
  const text = value.trim()
  if (text === '') return 0
  const match = /^(?:(\d+):)?(\d+):([0-5]?\d)$/.exec(text)
  if (!match) return null
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = {
  Bunny: 'Bunny',
  YouTube: 'YouTube',
  Vimeo: 'Vimeo',
  Cdn: 'CDN',
  Facebook: 'Facebook',
  None: 'Không có',
}

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  Active: 'Đã kích hoạt',
  Invited: 'Đã mời',
  InviteExpired: 'Lời mời hết hạn',
  NotInvited: 'Chưa mời',
  Inactive: 'Đã khóa',
}

export const CUSTOMER_STATUS_VARIANT: Record<CustomerStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Active: 'default',
  Invited: 'secondary',
  InviteExpired: 'outline',
  NotInvited: 'outline',
  Inactive: 'destructive',
}
