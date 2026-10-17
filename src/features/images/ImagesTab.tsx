import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Loader2, RotateCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState, LoadingState } from '@/components/states'
import SortableList from '@/components/SortableList'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ApiError } from '@/lib/api/client'
import { attachCourseImage, listCourseImages, reorderCourseImages } from '@/lib/api/courseImages'
import { messageFor } from '@/lib/api/errors'
import { uploadImage, UploadAbortedError, validateImage } from '@/lib/api/uploads'
import { queryClient } from '@/lib/query'
import type { CourseImageResponse } from '@/lib/api/types'
import ImageCard from './ImageCard'

const MAX_IMAGES = 20
const PARALLEL = 3

interface UploadItem {
  key: number
  file: File
  preview: string
  percent: number
  status: 'queued' | 'uploading' | 'error'
  error?: string
}

export default function ImagesTab({ courseId }: { courseId: number }) {
  const queryKey = ['course-images', courseId]
  const { data, error, isPending, refetch } = useQuery({ queryKey, queryFn: () => listCourseImages(courseId) })
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const nextKey = useRef(1)
  const queue = useRef<number[]>([])
  const active = useRef(0)
  const items = useRef(new Map<number, UploadItem>())
  const aborts = useRef(new Map<number, AbortController>())

  const patch = (key: number, changes: Partial<UploadItem>) => {
    const current = items.current.get(key)
    if (!current) return
    const next = { ...current, ...changes }
    items.current.set(key, next)
    setUploads((list) => list.map((u) => (u.key === key ? next : u)))
  }

  const drop = (key: number) => {
    const item = items.current.get(key)
    if (item) URL.revokeObjectURL(item.preview)
    items.current.delete(key)
    queue.current = queue.current.filter((k) => k !== key)
    setUploads((list) => list.filter((u) => u.key !== key))
  }

  const pump = () => {
    while (active.current < PARALLEL && queue.current.length > 0) {
      const key = queue.current.shift() as number
      const item = items.current.get(key)
      if (!item) continue
      active.current += 1
      void run(item).finally(() => {
        active.current -= 1
        pump()
      })
    }
  }

  const run = async (item: UploadItem) => {
    const controller = new AbortController()
    aborts.current.set(item.key, controller)
    patch(item.key, { status: 'uploading', percent: 0, error: undefined })
    try {
      const uploaded = await uploadImage(item.file, {
        signal: controller.signal,
        onProgress: (percent) => patch(item.key, { percent }),
      })
      await attachCourseImage(courseId, { url: uploaded.url, width: uploaded.width, height: uploaded.height })
      drop(item.key)
    } catch (err) {
      if (err instanceof UploadAbortedError) return
      if (err instanceof ApiError && err.code === 'course.too_many_images') await queryClient.invalidateQueries({ queryKey })
      patch(item.key, { status: 'error', error: messageFor(err) })
    } finally {
      aborts.current.delete(item.key)
    }
  }

  useEffect(() => {
    const controllers = aborts.current
    const pending = items.current
    return () => {
      queue.current = []
      controllers.forEach((c) => c.abort())
      pending.forEach((u) => URL.revokeObjectURL(u.preview))
    }
  }, [])

  useEffect(() => {
    const busy = uploads.some((u) => u.status !== 'error')
    if (!busy) return
    const guard = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [uploads])

  if (isPending) return <LoadingState rows={3} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  const images = data
  // Failed uploads are not images (yet): they only count again once retried.
  const used = images.length + uploads.filter((u) => u.status !== 'error').length
  const full = used >= MAX_IMAGES

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list)
    let room = MAX_IMAGES - used
    const accepted: UploadItem[] = []
    let skipped = 0
    for (const file of files) {
      const problem = validateImage(file)
      if (problem) {
        toast.error(`${file.name}: ${problem}`)
        continue
      }
      if (room <= 0) {
        skipped += 1
        continue
      }
      room -= 1
      const item: UploadItem = {
        key: nextKey.current++,
        file,
        preview: URL.createObjectURL(file),
        percent: 0,
        status: 'queued',
      }
      items.current.set(item.key, item)
      accepted.push(item)
    }
    if (skipped > 0) toast.error(`Chỉ được tối đa ${MAX_IMAGES} ảnh, đã bỏ qua ${skipped} ảnh.`)
    if (accepted.length === 0) return
    setUploads((current) => [...current, ...accepted])
    queue.current.push(...accepted.map((u) => u.key))
    pump()
  }

  const retry = (key: number) => {
    if (used >= MAX_IMAGES) {
      toast.error(`Chỉ được tối đa ${MAX_IMAGES} ảnh.`)
      return
    }
    patch(key, { status: 'queued', percent: 0, error: undefined })
    queue.current.push(key)
    pump()
  }

  const cancel = (key: number) => {
    aborts.current.get(key)?.abort()
    drop(key)
  }

  const handleReorder = async (next: CourseImageResponse[]) => {
    queryClient.setQueryData(queryKey, next)
    try {
      await reorderCourseImages(courseId, next.map((image) => image.id))
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.code === 'order.mismatch'
          ? 'Danh sách ảnh đã thay đổi, đã tải lại.'
          : messageFor(err),
      )
    }
    await queryClient.invalidateQueries({ queryKey })
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : ''
        }`}
        onDragOver={(e) => {
          if (full) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!full) addFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <p className="text-sm text-muted-foreground">
          Kéo thả ảnh vào đây hoặc chọn từ máy. JPEG, PNG hoặc WebP, tối đa 15 MB mỗi ảnh.
        </p>
        <Button type="button" disabled={full} onClick={() => fileInput.current?.click()}>
          <ImagePlus />
          Chọn ảnh
        </Button>
        <p className="text-sm font-medium">
          {used}/{MAX_IMAGES} ảnh{full && ' (đã đủ số lượng tối đa)'}
        </p>
      </div>

      {uploads.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
          {uploads.map((u) => (
            <li key={u.key} className="flex flex-col gap-2 rounded-lg border bg-card p-2">
              <div className="aspect-video overflow-hidden rounded-md bg-muted">
                <img src={u.preview} alt="" className="size-full object-cover" />
              </div>
              <p className="truncate text-xs text-muted-foreground">{u.file.name}</p>
              {u.status === 'error' ? (
                <>
                  <p role="alert" className="text-sm text-destructive">{u.error}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => retry(u.key)}>
                      <RotateCw />
                      Thử lại
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => drop(u.key)}>
                      <X />
                      Bỏ qua
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {u.status === 'queued' ? (
                    <span className="flex-1 text-xs text-muted-foreground">Đang chờ...</span>
                  ) : (
                    <Progress value={u.percent} className="flex-1" />
                  )}
                  {u.status === 'uploading' && u.percent >= 100 && <Loader2 className="size-4 animate-spin" />}
                  <Button type="button" variant="ghost" size="sm" onClick={() => cancel(u.key)}>
                    Hủy
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {images.length === 0 && uploads.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Chưa có ảnh. Thẻ khóa học và trang chi tiết đang dùng ảnh bìa.
        </p>
      ) : (
        <SortableList
          grid
          items={images}
          onReorder={(next) => void handleReorder(next)}
          renderItem={(image, index, handle) => (
            <ImageCard courseId={courseId} image={image} isFirst={index === 0} handle={handle} />
          )}
        />
      )}
    </div>
  )
}
