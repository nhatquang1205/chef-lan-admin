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
  'customer.no_email': 'Khách hàng chưa có email để gửi lời mời.',
  'customer.already_active': 'Khách đã kích hoạt tài khoản.',
  'customer.account_inactive': 'Tài khoản đang bị khóa. Hãy mở khóa trước khi gửi lời mời.',
  'enrollment.already_active': 'Khách đã có quyền này rồi.',
  'enrollment.customer_inactive': 'Tài khoản khách đang bị khóa. Hãy mở khóa trước khi cấp quyền.',
  'enrollment.customer_not_found': 'Không tìm thấy khách hàng.',
  'enrollment.not_found': 'Không tìm thấy quyền học này.',
  'email.send_failed': 'Không gửi được email. Kiểm tra cấu hình email của máy chủ rồi thử lại.',
  'course.not_found': 'Không tìm thấy khóa học.',
  'course.no_published_lesson': 'Khóa học cần ít nhất một bài học (nằm trong khóa học) đã xuất bản.',
  'course.no_playable_video': 'Khóa học cần ít nhất một video có thể phát.',
  'course.thumbnail_conflict': 'Chỉ chọn một trong hai: tải ảnh lên hoặc nhập đường dẫn ảnh.',
  'course.too_many_images': 'Mỗi khóa học chỉ có tối đa 20 ảnh.',
  'course.image_not_found': 'Không tìm thấy ảnh này.',
  'course.unknown_categories': 'Có danh mục không tồn tại.',
  'course.include_self': 'Không thể thêm chính khóa học này làm học phần.',
  'course.include_nested': 'Chỉ hỗ trợ một cấp: khóa đã là học phần của khóa khác không thể chứa học phần, và khóa đang chứa học phần không thể được thêm làm học phần.',
  'course.include_discount_too_high': 'Số tiền giảm không được lớn hơn giá của khóa học này.',
  'course.include_not_found': 'Học phần này không còn trong khóa học.',
  'course.has_includes': 'Khóa học đang chứa học phần hoặc là học phần của khóa khác. Hãy gỡ liên kết trước khi xóa.',
  'lesson.not_found': 'Không tìm thấy bài học.',
  'lesson_video.not_found': 'Không tìm thấy video.',
  'order.mismatch': 'Danh sách sắp xếp không khớp với dữ liệu hiện tại. Vui lòng tải lại trang.',
  'upload.no_file': 'Chưa chọn tệp.',
  'upload.empty_file': 'Tệp rỗng.',
  'upload.not_multipart': 'Yêu cầu tải lên không hợp lệ.',
  'upload.unsupported_image': 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.',
  'upload.image_too_large': 'Ảnh quá lớn (tối đa 15 MB).',
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
