import { Link, Route, Routes } from 'react-router'
import RequireAuth from '@/components/RequireAuth'
import { Button } from '@/components/ui/button'
import ChangePasswordPage from '@/features/auth/ChangePasswordPage'
import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/lib/auth/context'

function Home() {
  const { user, logout } = useAuth()
  return (
    <main className="flex flex-col items-start gap-3 p-6">
      <h1 className="text-2xl font-semibold">Trang chủ</h1>
      <p>Xin chào, {user?.displayName}</p>
      <Button variant="link" asChild className="px-0">
        <Link to="/change-password">Đổi mật khẩu</Link>
      </Button>
      <Button variant="outline" onClick={() => void logout()}>
        Đăng xuất
      </Button>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route path="*" element={<main className="p-6 text-2xl font-semibold">Không tìm thấy trang</main>} />
    </Routes>
  )
}
