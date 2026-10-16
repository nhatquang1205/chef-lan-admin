import { createContext, useContext } from 'react'
import type { LoginRequest, StaffResponse } from '@/lib/api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: StaffResponse | null
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
  getAccessToken: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
