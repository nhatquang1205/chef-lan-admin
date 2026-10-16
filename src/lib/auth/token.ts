import { apiFetch, ApiError } from '@/lib/api/client'
import type { StaffAuthResponse } from '@/lib/api/types'
import { loadSession, saveSession, type Session } from './session'

const LOCK_NAME = 'cheflan-admin-refresh'
const FRESH_MARGIN_MS = 60_000

function isFresh(session: Session | null): session is Session {
  return !!session && Date.parse(session.accessTokenExpiresAt) - Date.now() > FRESH_MARGIN_MS
}

function inLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, task)
  }
  return task()
}

let inFlight: Promise<Session | null> | null = null

/**
 * Returns a session with a usable access token, refreshing it at most once per tab and once across tabs.
 * `rejectedToken` is the access token the server just refused: a stored token different from it,
 * and still fresh, means another tab already refreshed.
 */
function refreshSession(rejectedToken?: string): Promise<Session | null> {
  inFlight ??= inLock(async () => {
    const stored = loadSession()
    if (!stored) return null
    if (isFresh(stored) && stored.accessToken !== rejectedToken) return stored

    try {
      const response = await apiFetch<StaffAuthResponse>('/api/v1/admins/auth/refresh', {
        method: 'POST',
        body: { refreshToken: stored.refreshToken },
      })
      saveSession(response)
      return response
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.code === 'identity.invalid_refresh_token')) {
        saveSession(null)
        return null
      }
      throw error
    }
  }).finally(() => {
    inFlight = null
  })
  return inFlight
}

export async function getAccessToken(): Promise<string | null> {
  const session = loadSession()
  if (isFresh(session)) return session.accessToken
  return (await refreshSession())?.accessToken ?? null
}

export function forceRefresh(rejectedToken: string): Promise<Session | null> {
  return refreshSession(rejectedToken)
}

export function signOutLocally() {
  saveSession(null)
}
