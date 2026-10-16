import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/lib/auth/context'

export default function RequireAuth() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Đang tải" />
      </div>
    )
  }

  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
