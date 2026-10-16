import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '@/components/AppLayout'
import RequireAuth from '@/components/RequireAuth'
import ChangePasswordPage from '@/features/auth/ChangePasswordPage'
import LoginPage from '@/features/auth/LoginPage'
import CoursesPage from '@/features/courses/CoursesPage'
import CourseCreatePage from '@/features/courses/CourseCreatePage'
import CoursePage from '@/features/courses/CoursePage'
import LessonCreatePage from '@/features/lessons/LessonCreatePage'
import LessonPage from '@/features/lessons/LessonPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/courses" replace />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/new" element={<CourseCreatePage />} />
          <Route path="/courses/:id" element={<CoursePage />} />
          <Route path="/courses/:courseId/lessons/new" element={<LessonCreatePage />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<main className="p-6 text-2xl font-semibold">Không tìm thấy trang</main>} />
    </Routes>
  )
}
