import type { StaffResponse } from '@/lib/api/types'

export interface Session {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  user: StaffResponse
}

const KEY = 'cheflan-admin-session'

type Listener = (session: Session | null) => void
const listeners = new Set<Listener>()

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable (private mode): the session lives only in memory of this call
  }
  listeners.forEach((listener) => listener(session))
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== KEY) return
  const session = loadSession()
  listeners.forEach((listener) => listener(session))
})
