import { BookOpen, Tags, Users, ChevronDown, KeyRound, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/courses', label: 'Khóa học', icon: BookOpen },
  { to: '/categories', label: 'Danh mục', icon: Tags },
  { to: '/customers', label: 'Khách hàng', icon: Users },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
              isActive && 'bg-muted text-foreground',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <Link to="/courses" className="flex items-center gap-2 font-heading text-base font-semibold">
      <img src="/logo-128.png" alt="" width={32} height={32} className="size-8 rounded-md" />
      <span>
        Bon Bocon <span className="font-normal text-muted-foreground">— Quản trị</span>
      </span>
    </Link>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const name = user?.displayName ?? ''
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Avatar size="sm">
            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="max-w-40 truncate">{name}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/change-password">
            <KeyRound />
            Đổi mật khẩu
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AppLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (user?.mustChangePassword) return <Outlet />

  return (
    <div className="min-h-svh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="hidden border-r bg-card md:block">
        <div className="sticky top-0 flex flex-col gap-6 p-4">
          <Brand />
          <NavLinks />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <img src="/logo-128.png" alt="" width={32} height={32} className="size-8 rounded-md" />
                    Bon Bocon — Quản trị
                  </SheetTitle>
                  <SheetDescription className="sr-only">Menu điều hướng</SheetDescription>
                </SheetHeader>
                <div className="px-4">
                  <NavLinks onNavigate={() => setMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="md:hidden">
              <Brand />
            </span>
          </div>
          <UserMenu />
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
