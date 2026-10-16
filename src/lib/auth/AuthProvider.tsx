import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { adminFetch } from '@/lib/api/admin'
import { apiFetch } from '@/lib/api/client'
import type { LoginRequest, StaffAuthResponse, StaffResponse } from '@/lib/api/types'
import { queryClient } from '@/lib/query'
import { loadSession, saveSession, subscribeSession, type Session } from './session'
import { AuthContext, type AuthStatus } from './context'
import { getAccessToken } from './token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadSession)
  const [status, setStatus] = useState<AuthStatus>(initial ? 'authenticated' : 'anonymous')
  const [user, setUser] = useState<StaffResponse | null>(initial?.user ?? null)
  const sessionRef = useRef<Session | null>(initial)
  const verified = useRef(false)

  const apply = useCallback((session: Session | null) => {
    sessionRef.current = session
    setUser(session?.user ?? null)
    setStatus(session ? 'authenticated' : 'anonymous')
    if (!session) queryClient.clear()
  }, [])

  useEffect(() => {
    return subscribeSession(apply)
  }, [apply])

  useEffect(() => {
    if (status !== 'authenticated' || verified.current) return
    verified.current = true
    adminFetch<StaffResponse>('/api/v1/admins/me')
      .then((me) => {
        const session = loadSession()
        if (session) saveSession({ ...session, user: me })
      })
      .catch(() => {
        // a dead session was already cleared by adminFetch; a network error keeps the stored one
      })
  }, [status])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await apiFetch<StaffAuthResponse>('/api/v1/admins/auth/login', {
      method: 'POST',
      body: credentials,
    })
    saveSession(response)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken
    if (refreshToken) {
      try {
        await adminFetch('/api/v1/admins/auth/logout', { method: 'POST', body: { refreshToken } })
      } catch {
        // signing out locally regardless
      }
    }
    saveSession(null)
  }, [])

  const clearSession = useCallback(() => saveSession(null), [])

  const value = useMemo(
    () => ({ status, user, login, logout, clearSession, getAccessToken }),
    [status, user, login, logout, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
