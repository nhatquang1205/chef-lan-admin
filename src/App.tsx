import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '@/components/AppLayout'
import RequireAuth from '@/components/RequireAuth'
import ChangePasswordPage from '@/features/auth/ChangePasswordPage'
import LoginPage from '@/features/auth/LoginPage'
import CoursesPage from '@/features/courses/CoursesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/courses" replace />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<main className="p-6 text-2xl font-semibold">Không tìm thấy trang</main>} />
    </Routes>
  )
}
