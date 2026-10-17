import { API_BASE, ApiError } from './client'
import type { ProblemDetails } from './types'
import { getAccessToken } from '@/lib/auth/token'

export interface UploadedVideo {
  videoId: string
  title: string
}

export interface UploadedImage {
  url: string
  width: number
  height: number
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024

export class UploadAbortedError extends Error {
  constructor() {
    super('Upload aborted')
    this.name = 'UploadAbortedError'
  }
}

interface UploadOptions {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

function parseProblem(xhr: XMLHttpRequest): ProblemDetails {
  try {
    return JSON.parse(xhr.responseText) as ProblemDetails
  } catch {
    return { title: xhr.statusText, status: xhr.status }
  }
}

function xhrUpload<T>(path: string, form: FormData, options: UploadOptions): Promise<T> {
  const { onProgress, signal } = options
  return (async () => {
    if (signal?.aborted) throw new UploadAbortedError()

    const token = await getAccessToken()
    if (!token) {
      throw new ApiError(401, { title: 'Unauthorized', status: 401, code: 'identity.invalid_refresh_token' })
    }
    if (signal?.aborted) throw new UploadAbortedError()

    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const onAbort = () => xhr.abort()
      const finish = () => signal?.removeEventListener('abort', onAbort)

      xhr.open('POST', `${API_BASE}${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)))
      }
      xhr.onload = () => {
        finish()
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as T)
          } catch {
            reject(new ApiError(xhr.status, { title: 'Invalid response', status: xhr.status }))
          }
        } else {
          reject(new ApiError(xhr.status, parseProblem(xhr)))
        }
      }
      xhr.onerror = () => {
        finish()
        reject(new ApiError(0, { title: 'Network error', status: 0, code: 'network' }))
      }
      xhr.onabort = () => {
        finish()
        reject(new UploadAbortedError())
      }

      signal?.addEventListener('abort', onAbort)
      xhr.send(form)
    })
  })()
}

export function uploadVideo(file: File, title: string, options: UploadOptions = {}): Promise<UploadedVideo> {
  const form = new FormData()
  form.append('title', title)
  form.append('file', file)
  return xhrUpload<UploadedVideo>('/api/v1/admins/uploads/videos', form, options)
}

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh quá lớn (tối đa 15 MB).'
  return null
}

export function uploadImage(file: File, options: UploadOptions = {}): Promise<UploadedImage> {
  const form = new FormData()
  form.append('file', file)
  return xhrUpload<UploadedImage>('/api/v1/admins/uploads/images', form, options)
}

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
      resolve(value)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration) : null)
    video.onerror = () => done(null)
    video.src = url
  })
}
