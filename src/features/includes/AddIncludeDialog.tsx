import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import FieldLabel from '@/components/FieldLabel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import VndInput from '@/components/VndInput'
import { listCourses } from '@/lib/api/courses'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { upsertInclude } from '@/lib/api/includes'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: number
  priceVnd: number
  existingIds: number[]
}

export default function AddIncludeDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm học phần</DialogTitle>
          <DialogDescription>Chọn khóa học sẽ được bao gồm trong khóa này.</DialogDescription>
        </DialogHeader>
        {open && <AddForm {...rest} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function AddForm({ courseId, priceVnd, existingIds, onDone }: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [picked, setPicked] = useState<{ id: number; title: string } | null>(null)
  const [discount, setDiscount] = useState<number | null>(0)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const courses = useQuery({
    queryKey: ['courses', { q: debounced, pageSize: 10, picker: true }],
    queryFn: () => listCourses({ q: debounced, pageSize: 10 }),
  })
  const candidates = courses.data?.items.filter((item) => item.id !== courseId && !existingIds.includes(item.id))

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!picked) next.target = 'Vui lòng chọn khóa học.'
    if (discount === null) next.discountVnd = 'Vui lòng nhập số tiền giảm (có thể là 0).'
    else if (discount > priceVnd) next.discountVnd = `Số tiền giảm không được lớn hơn giá khóa này (${formatVnd(priceVnd)}).`
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setPending(true)
    try {
      await upsertInclude(courseId, picked!.id, discount!)
      toast.success('Đã thêm học phần.')
      onDone()
    } catch (error) {
      const mapped = fieldErrors(error)
      if (mapped.discountVnd) setErrors({ discountVnd: mapped.discountVnd })
      else toast.error(messageFor(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="include-search" required>Khóa học</FieldLabel>
        <Input
          id="include-search"
          placeholder="Tìm khóa học..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-52 overflow-y-auto rounded-md border">
          {courses.isPending ? (
            <p className="p-3 text-sm text-muted-foreground">Đang tải...</p>
          ) : courses.error ? (
            <p className="p-3 text-sm text-destructive">{messageFor(courses.error)}</p>
          ) : candidates!.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Không có khóa học nào.</p>
          ) : (
            candidates!.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPicked({ id: item.id, title: item.title })}
                className={cn(
                  'flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted',
                  picked?.id === item.id && 'bg-muted font-medium',
                )}
              >
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === 'Draft' && 'Nháp · '}
                  {formatVnd(item.priceVnd)}
                </span>
              </button>
            ))
          )}
        </div>
        {picked && <p className="text-sm text-muted-foreground">Đã chọn: {picked.title}</p>}
        {errors.target && <p className="text-sm text-destructive">{errors.target}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="include-discount" required>Giảm khi khách đã có khóa này</FieldLabel>
        <VndInput id="include-discount" value={discount} onChange={setDiscount} aria-invalid={!!errors.discountVnd} />
        <p className="text-xs text-muted-foreground">Tối đa {formatVnd(priceVnd)} (giá khóa học hiện tại).</p>
        {errors.discountVnd && <p className="text-sm text-destructive">{errors.discountVnd}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onDone}>
          Hủy
        </Button>
        <Button disabled={pending} onClick={() => void submit()}>
          {pending && <Loader2 className="animate-spin" />}
          Thêm
        </Button>
      </DialogFooter>
    </div>
  )
}
