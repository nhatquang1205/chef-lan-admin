export type CourseStatus = 'Draft' | 'Published' | 'Archived'
export type CourseLevel = 'Unspecified' | 'Beginner' | 'Intermediate' | 'Advanced'
export type CourseSortOrder = 'Newest' | 'PriceAsc' | 'PriceDesc' | 'Title'
export type VideoProvider = 'None' | 'YouTube' | 'Vimeo' | 'Cdn' | 'Facebook' | 'Bunny'
export type CategoryStatus = 'Active' | 'InActive'

export interface ProblemDetails {
  title?: string
  status?: number
  detail?: string | null
  code?: string | null
  errors?: Record<string, string[]> | null
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface StaffResponse {
  id: number
  email: string
  displayName: string
  role: string
  jobTitle?: string | null
  mustChangePassword: boolean
}

export interface StaffAuthResponse {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  user: StaffResponse
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface CategoryResponse {
  id: number
  name: string
  slug: string
  description?: string | null
  thumbnailUrl?: string | null
}

export interface CategoryAdminResponse extends CategoryResponse {
  displayOrder: number
  status: CategoryStatus
}

export interface CategoryRequest {
  name: string
  description?: string | null
  thumbnailUrl?: string | null
  displayOrder?: number | null
  status: CategoryStatus
}

export interface CourseListItemResponse {
  id: number
  slug: string
  title: string
  subtitle?: string | null
  thumbnailUrl?: string | null
  level: CourseLevel
  status: CourseStatus
  publishedAt?: string | null
  priceVnd: number
  compareAtPriceVnd?: number | null
  priceDisplay: string
  lessonCount: number
  totalDurationSeconds: number
  accessDurationDays?: number | null
  categories: CategoryResponse[]
}

export interface CourseAdminDetailResponse {
  id: number
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  whatYouWillLearn?: string | null
  metaDescription?: string | null
  thumbnailUrl?: string | null
  promoVideoUrl?: string | null
  level: CourseLevel
  status: CourseStatus
  publishedAt?: string | null
  priceVnd: number
  compareAtPriceVnd?: number | null
  currency: string
  accessDurationDays?: number | null
  lessonCount: number
  totalDurationSeconds: number
  enrollmentCount: number
  legacyFacebookGroupUrl?: string | null
  includesCount?: number
  includedInCount?: number
  categories: CategoryResponse[]
}

export interface CourseIncludeResponse {
  includedCourseId: number
  slug: string
  title: string
  status: CourseStatus
  priceVnd: number
  lessonCount: number
  discountVnd: number
  sortOrder: number
}

export interface IncludedInResponse {
  id: number
  slug: string
  title: string
}

export interface CourseRequest {
  title: string
  subtitle?: string | null
  description?: string | null
  whatYouWillLearn?: string | null
  metaDescription?: string | null
  thumbnailUrl?: string | null
  promoVideoUrl?: string | null
  priceVnd: number
  compareAtPriceVnd?: number | null
  accessDurationDays?: number | null
  legacyFacebookGroupUrl?: string | null
  categoryIds?: number[] | null
  level: CourseLevel
}

export interface CourseListParams {
  status?: CourseStatus
  q?: string
  categorySlug?: string
  level?: CourseLevel
  sort?: CourseSortOrder
  page?: number
  pageSize?: number
}

export interface LessonListItemResponse {
  id: number
  courseId: number
  slug: string
  title: string
  sortOrder: number
  isPublished: boolean
  priceVnd?: number | null
  includedInCourse: boolean
  videoCount: number
  durationSeconds: number
}

export interface LessonDetailResponse extends LessonListItemResponse {
  description?: string | null
  recipes?: string | null
  resourcesUrl?: string | null
}

export interface LessonRequest {
  title: string
  description?: string | null
  recipes?: string | null
  resourcesUrl?: string | null
  isPublished: boolean
  priceVnd?: number | null
  includedInCourse: boolean
}

export interface LessonOrderRequest {
  lessonIds: number[]
}

export interface LessonVideoResponse {
  id: number
  lessonId: number
  publicId: string
  sortOrder: number
  title: string
  description?: string | null
  provider: VideoProvider
  externalId?: string | null
  url?: string | null
  thumbnailUrl?: string | null
  durationSeconds: number
  isFree: boolean
  freeTillSeconds?: number | null
  isPublished: boolean
}

export interface LessonVideoRequest {
  title: string
  description?: string | null
  externalId?: string | null
  url?: string | null
  thumbnailUrl?: string | null
  durationSeconds: number
  isFree: boolean
  freeTillSeconds?: number | null
  provider: VideoProvider
  isPublished: boolean
}

export interface VideoOrderRequest {
  videoIds: number[]
}

export interface ImageUploadResponse {
  url: string
}

export interface VideoUploadResponse {
  videoId: string
  title: string
}

export type CustomerStatus = 'Active' | 'Invited' | 'InviteExpired' | 'NotInvited' | 'Inactive'

export interface CustomerListParams {
  q?: string
  status?: CustomerStatus
  page?: number
  pageSize?: number
}

export interface CustomerListItemResponse {
  id: number
  fullName: string
  email?: string | null
  phone?: string | null
  facebookName?: string | null
  status: CustomerStatus
  invitedAt?: string | null
  activatedAt?: string | null
  lastLoginAt?: string | null
  createdAt: string
  courseCount: number
  lessonCount: number
}

export interface CustomerDetailResponse {
  id: number
  fullName: string
  email?: string | null
  phone?: string | null
  facebookName?: string | null
  facebookProfileUrl?: string | null
  note?: string | null
  isActive: boolean
  status: CustomerStatus
  invitedAt?: string | null
  inviteExpiresAt?: string | null
  inviteError?: string | null
  activatedAt?: string | null
  lastLoginAt?: string | null
  createdAt: string
}

export interface CustomerRequest {
  fullName: string
  email: string | null
  phone: string | null
  facebookName: string | null
  facebookProfileUrl: string | null
  note: string | null
  sendInvite?: boolean
}

export interface InviteResponse {
  invitedAt: string
  inviteExpiresAt: string
}

export type EnrollmentStatus = 'Pending' | 'Active' | 'Expired' | 'Revoked'

interface EnrollmentBase {
  id: number
  customerId: number
  status: EnrollmentStatus
  source: string
  accessGrantedAt?: string | null
  expiresAt?: string | null
  isPaid: boolean
  amountPaidVnd?: number | null
  paymentNote?: string | null
  paymentReference?: string | null
}

export interface CourseEnrollmentResponse extends EnrollmentBase {
  courseId: number
  courseTitle?: string | null
}

export interface LessonEnrollmentResponse extends EnrollmentBase {
  lessonId: number
  courseId?: number | null
  lessonTitle?: string | null
}

export interface CustomerAccessResponse {
  customerId: number
  courses: CourseEnrollmentResponse[]
  lessons: LessonEnrollmentResponse[]
}

export interface GrantAccessFields {
  customerId: number
  isPaid: boolean
  amountPaidVnd?: number | null
  paymentNote?: string | null
  paymentReference?: string | null
}
