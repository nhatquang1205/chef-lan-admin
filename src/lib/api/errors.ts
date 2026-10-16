import { ApiError } from './client'

const MESSAGES: Record<string, string> = {
  'identity.invalid_credentials': 'Email hoặc mật khẩu không đúng.',
  'identity.account_locked': 'Tài khoản đang bị khóa tạm thời do nhập sai nhiều lần. Vui lòng thử lại sau.',
  'identity.account_inactive': 'Tài khoản đã bị vô hiệu hóa.',
  'identity.invalid_refresh_token': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'identity.current_password_incorrect': 'Mật khẩu hiện tại không đúng.',
  'category.not_found': 'Không tìm thấy danh mục.',
  'category.in_use': 'Danh mục đang được dùng bởi khóa học. Hãy ẩn danh mục thay vì xóa.',
  'customer.not_found': 'Không tìm thấy khách hàng.',
  'customer.email_already_used': 'Email này đã được dùng cho khách hàng khác.',
  'course.not_found': 'Không tìm thấy khóa học.',
  'course.no_published_lesson': 'Khóa học cần ít nhất một bài học (nằm trong khóa học) đã xuất bản.',
  'course.no_playable_video': 'Khóa học cần ít nhất một video có thể phát.',
  'course.thumbnail_conflict': 'Chỉ chọn một trong hai: tải ảnh lên hoặc nhập đường dẫn ảnh.',
  'course.unknown_categories': 'Có danh mục không tồn tại.',
  'lesson.not_found': 'Không tìm thấy bài học.',
  'lesson_video.not_found': 'Không tìm thấy video.',
  'order.mismatch': 'Danh sách sắp xếp không khớp với dữ liệu hiện tại. Vui lòng tải lại trang.',
  'upload.no_file': 'Chưa chọn tệp.',
  'upload.empty_file': 'Tệp rỗng.',
  'upload.not_multipart': 'Yêu cầu tải lên không hợp lệ.',
  'upload.unsupported_image': 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.',
  'upload.image_too_large': 'Ảnh quá lớn (tối đa 5 MB).',
  'upload.image_storage_not_configured': 'Máy chủ chưa cấu hình nơi lưu ảnh.',
  'upload.storage_failed': 'Không lưu được ảnh. Vui lòng thử lại.',
  'upload.video_host_not_configured': 'Máy chủ chưa cấu hình Bunny.',
  'upload.video_host_failed': 'Tải video lên thất bại. Vui lòng thử lại.',
}

const FALLBACK = 'Đã có lỗi xảy ra. Vui lòng thử lại.'

export function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK
  if (error.status === 0) return 'Không kết nối được máy chủ.'
  if (error.status === 429) return 'Thử quá nhiều lần, vui lòng đợi một phút.'
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]
  if (error.status === 409) return 'Dữ liệu vừa được người khác thay đổi. Vui lòng tải lại trang.'
  return error.problem.detail ?? error.problem.title ?? FALLBACK
}

const camelCase = (key: string) => key.charAt(0).toLowerCase() + key.slice(1)

export function fieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!(error instanceof ApiError) || !error.problem.errors) return result
  for (const [key, messages] of Object.entries(error.problem.errors)) {
    if (messages.length > 0) result[camelCase(key)] = messages[0]
  }
  return result
}
