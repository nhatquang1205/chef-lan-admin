import { apiFetch, ApiError, type ApiFetchOptions } from './client'
import { forceRefresh, getAccessToken, signOutLocally } from '@/lib/auth/token'

const SIGNED_OUT = { title: 'Unauthorized', status: 401, code: 'identity.invalid_refresh_token' }

export async function adminFetch<T = void>(path: string, options: Omit<ApiFetchOptions, 'token'> = {}): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new ApiError(401, SIGNED_OUT)

  try {
    return await apiFetch<T>(path, { ...options, token })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const session = await forceRefresh(token)
    if (!session) throw error

    try {
      return await apiFetch<T>(path, { ...options, token: session.accessToken })
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) signOutLocally()
      throw retryError
    }
  }
}
