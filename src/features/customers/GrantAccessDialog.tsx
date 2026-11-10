import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/FieldLabel'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VndInput from '@/components/VndInput'
import { getCourseQuote, getCustomerAccess, grantCourseAccess, grantLessonAccess } from '@/lib/api/access'
import { listCourses } from '@/lib/api/courses'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { listLessons } from '@/lib/api/lessons'
import type { CourseQuoteResponse, GrantAccessFields } from '@/lib/api/types'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'

type Mode = 'course' | 'lesson'

interface Item {
  key: string
  kind: Mode
  courseId: number
  lessonId?: number
  title: string
  price: number | null
  quote: CourseQuoteResponse | null
  discountDropped: boolean
  amount: number | null
  error?: string
}

const SHARED_FIELDS = ['paymentNote', 'paymentReference']

function isLive(row: { status: string; expiresAt?: string | null }) {
  return row.status === 'Active' && !(row.expiresAt && new Date(row.expiresAt) <= new Date())
}

function activeQuoteOf(item: Item) {
  return item.quote && item.quote.discounts.length > 0 && !item.discountDropped ? item.quote : null
}

interface Props {
  customerId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GrantAccessDialog({ customerId, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cấp quyền học</DialogTitle>
          <DialogDescription>Cấp thủ công cho khách này, không qua thanh toán trực tuyến.</DialogDescription>
        </DialogHeader>
        {open && <GrantForm customerId={customerId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function GrantForm({ customerId, onDone }: { customerId: number; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('course')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [pickedCourse, setPickedCourse] = useState<{ id: number; title: string } | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isPaid, setIsPaid] = useState(false)
  const [note, setNote] = useState('')
  const [reference, setReference] = useState('')
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const access = useQuery({
    queryKey: ['customer-access', customerId],
    queryFn: () => getCustomerAccess(customerId),
  })
  const courses = useInfiniteQuery({
    queryKey: ['courses', { q: debounced, picker: true, infinite: true }],
    queryFn: ({ pageParam }) => listCourses({ q: debounced, page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  })
  const lessons = useQuery({
    queryKey: ['lessons', pickedCourse?.id],
    queryFn: () => listLessons(pickedCourse!.id),
    enabled: mode === 'lesson' && pickedCourse !== null,
  })

  const ownedCourses = new Set(access.data?.courses.filter(isLive).map((row) => row.courseId))
  const ownedLessons = new Set(access.data?.lessons.filter(isLive).map((row) => row.lessonId))

  const courseItems = courses.data?.pages.flatMap((page) => page.items).filter((c) => !ownedCourses.has(c.id)) ?? []
  const visibleLessons = lessons.data?.filter((l) => !ownedLessons.has(l.id)) ?? []

  const patchItem = (key: string, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))

  const removeItem = (key: string) => setItems((current) => current.filter((item) => item.key !== key))

  const toggleCourse = (course: { id: number; title: string; priceVnd: number }) => {
    const key = `course:${course.id}`
    if (items.some((item) => item.key === key)) return removeItem(key)
    setItems((current) => [
      ...current,
      {
        key,
        kind: 'course',
        courseId: course.id,
        title: course.title,
        price: course.priceVnd,
        quote: null,
        discountDropped: false,
        amount: course.priceVnd,
      },
    ])
    getCourseQuote(customerId, course.id)
      .then((result) => {
        if (result.discounts.length === 0) return
        setItems((current) =>
          current.map((item) =>
            item.key === key
              ? { ...item, quote: result, amount: item.amount === item.price ? result.finalPriceVnd : item.amount }
              : item,
          ),
        )
      })
      .catch(() => {})
  }

  const toggleLesson = (lesson: { id: number; title: string; priceVnd?: number | null }) => {
    const key = `lesson:${lesson.id}`
    if (items.some((item) => item.key === key)) return removeItem(key)
    setItems((current) => [
      ...current,
      {
        key,
        kind: 'lesson',
        courseId: pickedCourse!.id,
        lessonId: lesson.id,
        title: `${lesson.title} (${pickedCourse!.title})`,
        price: lesson.priceVnd ?? null,
        quote: null,
        discountDropped: false,
        amount: lesson.priceVnd ?? null,
      },
    ])
  }

  const dropDiscount = (item: Item) =>
    patchItem(item.key, {
      discountDropped: true,
      amount: item.quote?.listPriceVnd ?? item.price,
    })

  const switchMode = (next: string) => {
    setMode(next as Mode)
    setErrors({})
  }

  const submit = async () => {
    if (items.length === 0) {
      setErrors({ target: 'Vui lòng chọn ít nhất một khóa học hoặc bài học.' })
      return
    }
    setPending(true)
    setErrors({})
    setItems((current) => current.map((item) => ({ ...item, error: undefined })))
    const shared: Record<string, string> = {}
    let granted = 0
    let failed = 0
    for (const item of items) {
      const quote = activeQuoteOf(item)
      const fields: GrantAccessFields = {
        customerId,
        isPaid,
        amountPaidVnd: isPaid ? item.amount : null,
        paymentNote: note.trim() || null,
        paymentReference: reference.trim() || null,
        ...(quote
          ? {
              listPriceVnd: quote.listPriceVnd,
              discountVnd: quote.listPriceVnd - quote.finalPriceVnd,
              discountReason: quote.discounts.map((d) => d.reason).join('; '),
            }
          : {}),
      }
      try {
        if (item.kind === 'course') await grantCourseAccess(item.courseId, fields)
        else await grantLessonAccess(item.lessonId!, item.courseId, fields)
        granted++
        removeItem(item.key)
      } catch (error) {
        failed++
        const mapped = fieldErrors(error)
        for (const key of SHARED_FIELDS) if (mapped[key]) shared[key] = mapped[key]
        patchItem(item.key, { error: mapped.amountPaidVnd ?? messageFor(error) })
      }
    }
    setPending(false)
    setErrors(shared)
    if (failed === 0) {
      toast.success(granted === 1 ? 'Đã cấp quyền học.' : `Đã cấp quyền học (${granted} mục).`)
      onDone()
    } else {
      toast.error(`Cấp được ${granted}/${granted + failed} mục. Các mục lỗi vẫn được giữ lại.`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={mode} onValueChange={switchMode}>
        <TabsList className="w-full">
          <TabsTrigger value="course">Cả khóa học</TabsTrigger>
          <TabsTrigger value="lesson">Một bài học</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="grant-course-search" required>
          {mode === 'course' ? 'Khóa học' : 'Chọn khóa học để xem bài học'}
        </FieldLabel>
        <Input
          id="grant-course-search"
          placeholder="Tìm khóa học..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-44 overflow-y-auto rounded-md border">
          {courses.isPending ? (
            <p className="p-3 text-sm text-muted-foreground">Đang tải...</p>
          ) : courses.error ? (
            <p className="p-3 text-sm text-destructive">{messageFor(courses.error)}</p>
          ) : (
            <>
              {courseItems.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Không có khóa học nào.</p>
              )}
              {courseItems.map((item) =>
                mode === 'course' ? (
                  <PickRow
                    key={item.id}
                    checkbox
                    selected={items.some((i) => i.key === `course:${item.id}`)}
                    onClick={() => toggleCourse(item)}
                    title={item.title}
                    meta={formatVnd(item.priceVnd)}
                  />
                ) : (
                  <PickRow
                    key={item.id}
                    selected={pickedCourse?.id === item.id}
                    onClick={() => setPickedCourse({ id: item.id, title: item.title })}
                    title={item.title}
                    meta={formatVnd(item.priceVnd)}
                  />
                ),
              )}
              {courses.hasNextPage && (
                <button
                  type="button"
                  disabled={courses.isFetchingNextPage}
                  onClick={() => void courses.fetchNextPage()}
                  className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  {courses.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
                  Xem thêm
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {mode === 'lesson' && pickedCourse && (
        <div className="flex flex-col gap-2">
          <FieldLabel required>Bài học của “{pickedCourse.title}”</FieldLabel>
          <div className="max-h-44 overflow-y-auto rounded-md border">
            {lessons.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">Đang tải...</p>
            ) : lessons.error ? (
              <p className="p-3 text-sm text-destructive">{messageFor(lessons.error)}</p>
            ) : visibleLessons.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {lessons.data.length === 0 ? 'Khóa học chưa có bài học.' : 'Khách đã có tất cả bài học này.'}
              </p>
            ) : (
              visibleLessons.map((item) => (
                <PickRow
                  key={item.id}
                  checkbox
                  selected={items.some((i) => i.key === `lesson:${item.id}`)}
                  onClick={() => toggleLesson(item)}
                  title={item.title}
                  meta={[!item.includedInCourse && 'Mua thêm', item.priceVnd != null && formatVnd(item.priceVnd)]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))
            )}
          </div>
        </div>
      )}
      {errors.target && <p className="text-sm text-destructive">{errors.target}</p>}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <FieldLabel>Đã chọn ({items.length})</FieldLabel>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <SelectedItem
                key={item.key}
                item={item}
                isPaid={isPaid}
                pending={pending}
                onRemove={() => removeItem(item.key)}
                onAmount={(amount) => patchItem(item.key, { amount })}
                onDropDiscount={() => dropDiscount(item)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch id="grant-paid" checked={isPaid} onCheckedChange={setIsPaid} />
        <FieldLabel htmlFor="grant-paid">Đã thanh toán</FieldLabel>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="grant-note">Ghi chú thanh toán</FieldLabel>
        <Input id="grant-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        {errors.paymentNote && <p className="text-sm text-destructive">{errors.paymentNote}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="grant-reference">Mã tham chiếu</FieldLabel>
        <Input id="grant-reference" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
        {errors.paymentReference && <p className="text-sm text-destructive">{errors.paymentReference}</p>}
      </div>

      <DialogFooter className="sticky -bottom-4 -mx-4 -mb-4 bg-background px-4 py-3">
        <Button variant="outline" disabled={pending} onClick={onDone}>
          Hủy
        </Button>
        <Button disabled={pending} onClick={() => void submit()}>
          {pending && <Loader2 className="animate-spin" />}
          Cấp quyền{items.length > 1 ? ` (${items.length})` : ''}
        </Button>
      </DialogFooter>
    </div>
  )
}

interface SelectedItemProps {
  item: Item
  isPaid: boolean
  pending: boolean
  onRemove: () => void
  onAmount: (amount: number | null) => void
  onDropDiscount: () => void
}

function SelectedItem({ item, isPaid, pending, onRemove, onAmount, onDropDiscount }: SelectedItemProps) {
  const quote = activeQuoteOf(item)
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words font-medium">{item.title}</span>
        <button
          type="button"
          aria-label="Bỏ chọn"
          disabled={pending}
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      {quote && (
        <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-2">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Giá niêm yết</span>
            <span className="text-muted-foreground line-through">{formatVnd(quote.listPriceVnd)}</span>
          </div>
          {quote.discounts.map((d) => (
            <div key={d.includedCourseId} className="flex justify-between gap-3">
              <span>{d.reason}</span>
              <span className="shrink-0">−{formatVnd(d.discountVnd)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 font-medium">
            <span>Giá sau giảm</span>
            <span>{formatVnd(quote.finalPriceVnd)}</span>
          </div>
          <button type="button" className="self-start text-xs text-muted-foreground underline" onClick={onDropDiscount}>
            Bỏ giảm giá
          </button>
        </div>
      )}
      {isPaid && (
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`grant-amount-${item.key}`}>Số tiền đã thanh toán</FieldLabel>
          <VndInput
            id={`grant-amount-${item.key}`}
            value={item.amount}
            onChange={onAmount}
            aria-invalid={!!item.error}
          />
        </div>
      )}
      {item.error && <p className="text-sm text-destructive">{item.error}</p>}
    </div>
  )
}

function PickRow({
  selected,
  checkbox,
  onClick,
  title,
  meta,
}: {
  selected: boolean
  checkbox?: boolean
  onClick: () => void
  title: string
  meta: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted',
        selected && 'bg-muted font-medium',
      )}
    >
      {checkbox && <Checkbox checked={selected} tabIndex={-1} className="pointer-events-none" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
    </button>
  )
}
