import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
import FieldLabel from '@/components/FieldLabel'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VndInput from '@/components/VndInput'
import { getCourseQuote, grantCourseAccess, grantLessonAccess } from '@/lib/api/access'
import { listCourses } from '@/lib/api/courses'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { listLessons } from '@/lib/api/lessons'
import type { CourseQuoteResponse } from '@/lib/api/types'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'

type Mode = 'course' | 'lesson'

interface Props {
  customerId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GrantAccessDialog({ customerId, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
  const [course, setCourse] = useState<{ id: number; title: string; price: number } | null>(null)
  const [lesson, setLesson] = useState<{ id: number; price: number | null } | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [reference, setReference] = useState('')
  const pickedCourse = useRef<number | null>(null)
  const isPaidRef = useRef(false)
  const [quoteData, setQuoteData] = useState<CourseQuoteResponse | null>(null)
  const [discountDropped, setDiscountDropped] = useState(false)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const courses = useQuery({
    queryKey: ['courses', { q: debounced, pageSize: 8, picker: true }],
    queryFn: () => listCourses({ q: debounced, pageSize: 8 }),
  })
  const lessons = useQuery({
    queryKey: ['lessons', course?.id],
    queryFn: () => listLessons(course!.id),
    enabled: mode === 'lesson' && course !== null,
  })

  const activeQuote =
    mode === 'course' && quoteData && quoteData.discounts.length > 0 && !discountDropped ? quoteData : null
  const quoteReason = quoteData ? quoteData.discounts.map((d) => d.reason).join('; ') : ''

  const defaultPrice =
    mode === 'course' ? (activeQuote?.finalPriceVnd ?? course?.price ?? null) : (lesson?.price ?? null)

  const dropDiscount = () => {
    setDiscountDropped(true)
    if (isPaid) setAmount(quoteData?.listPriceVnd ?? course?.price ?? null)
    setNote((current) => (current === quoteReason ? '' : current))
  }

  const switchMode = (next: string) => {
    setMode(next as Mode)
    setLesson(null)
    setAmount(isPaid && next === 'course' ? (course?.price ?? null) : null)
    setErrors({})
  }

  const pickCourse = (next: { id: number; title: string; price: number }) => {
    setCourse(next)
    pickedCourse.current = next.id
    setLesson(null)
    setDiscountDropped(false)
    setQuoteData(null)
    setAmount(isPaid && mode === 'course' ? next.price : null)
    if (mode !== 'course') return
    getCourseQuote(customerId, next.id)
      .then((result) => {
        if (pickedCourse.current !== next.id || result.discounts.length === 0) return
        setQuoteData(result)
        setAmount((current) => (isPaidRef.current ? result.finalPriceVnd : current))
        setNote((current) => current || result.discounts.map((d) => d.reason).join('; '))
      })
      .catch(() => {})
  }

  const pickLesson = (next: { id: number; price: number | null }) => {
    setLesson(next)
    setAmount(isPaid ? next.price : null)
  }

  const togglePaid = (next: boolean) => {
    setIsPaid(next)
    isPaidRef.current = next
    setAmount(next ? defaultPrice : null)
  }

  const target = mode === 'course' ? course?.id : lesson?.id

  const submit = async () => {
    if (!course || !target) {
      setErrors({ target: mode === 'course' ? 'Vui lòng chọn khóa học.' : 'Vui lòng chọn khóa học và bài học.' })
      return
    }
    const fields = {
      customerId,
      isPaid,
      amountPaidVnd: isPaid ? amount : null,
      paymentNote: note.trim() || null,
      paymentReference: reference.trim() || null,
      ...(mode === 'course' && activeQuote
        ? {
            listPriceVnd: activeQuote.listPriceVnd,
            discountVnd: activeQuote.listPriceVnd - activeQuote.finalPriceVnd,
            discountReason: quoteReason,
          }
        : {}),
    }
    setPending(true)
    setErrors({})
    try {
      if (mode === 'course') await grantCourseAccess(course.id, fields)
      else await grantLessonAccess(lesson!.id, course.id, fields)
      toast.success('Đã cấp quyền học.')
      onDone()
    } catch (error) {
      const mapped = fieldErrors(error)
      const next: Record<string, string> = {}
      for (const key of ['amountPaidVnd', 'paymentNote', 'paymentReference']) if (mapped[key]) next[key] = mapped[key]
      if (Object.keys(next).length > 0) setErrors(next)
      else toast.error(messageFor(error))
    } finally {
      setPending(false)
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
        <FieldLabel htmlFor="grant-course-search" required>Khóa học</FieldLabel>
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
          ) : courses.data.items.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Không có khóa học nào.</p>
          ) : (
            courses.data.items.map((item) => (
              <PickRow
                key={item.id}
                selected={course?.id === item.id}
                onClick={() => pickCourse({ id: item.id, title: item.title, price: item.priceVnd })}
                title={item.title}
                meta={formatVnd(item.priceVnd)}
              />
            ))
          )}
        </div>
        {course && <p className="text-sm text-muted-foreground">Đã chọn: {course.title}</p>}
      </div>

      {mode === 'lesson' && course && (
        <div className="flex flex-col gap-2">
          <FieldLabel required>Bài học</FieldLabel>
          <div className="max-h-44 overflow-y-auto rounded-md border">
            {lessons.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">Đang tải...</p>
            ) : lessons.error ? (
              <p className="p-3 text-sm text-destructive">{messageFor(lessons.error)}</p>
            ) : lessons.data.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Khóa học chưa có bài học.</p>
            ) : (
              lessons.data.map((item) => (
                <PickRow
                  key={item.id}
                  selected={lesson?.id === item.id}
                  onClick={() => pickLesson({ id: item.id, price: item.priceVnd ?? null })}
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

      {activeQuote && (
        <div className="flex flex-col gap-1 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Giá niêm yết</span>
            <span className="text-muted-foreground line-through">{formatVnd(activeQuote.listPriceVnd)}</span>
          </div>
          {activeQuote.discounts.map((d) => (
            <div key={d.includedCourseId} className="flex justify-between gap-3">
              <span>{d.reason}</span>
              <span className="shrink-0">−{formatVnd(d.discountVnd)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 font-medium">
            <span>Giá sau giảm</span>
            <span>{formatVnd(activeQuote.finalPriceVnd)}</span>
          </div>
          <button type="button" className="self-start text-xs text-muted-foreground underline" onClick={dropDiscount}>
            Bỏ giảm giá
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch id="grant-paid" checked={isPaid} onCheckedChange={togglePaid} />
        <FieldLabel htmlFor="grant-paid">Đã thanh toán</FieldLabel>
      </div>

      {isPaid && (
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="grant-amount">Số tiền đã thanh toán</FieldLabel>
          <VndInput id="grant-amount" value={amount} onChange={setAmount} aria-invalid={!!errors.amountPaidVnd} />
          {errors.amountPaidVnd && <p className="text-sm text-destructive">{errors.amountPaidVnd}</p>}
        </div>
      )}

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

      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onDone}>
          Hủy
        </Button>
        <Button disabled={pending} onClick={() => void submit()}>
          {pending && <Loader2 className="animate-spin" />}
          Cấp quyền
        </Button>
      </DialogFooter>
    </div>
  )
}

function PickRow({ selected, onClick, title, meta }: { selected: boolean; onClick: () => void; title: string; meta: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted',
        selected && 'bg-muted font-medium',
      )}
    >
      <span className="truncate">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
    </button>
  )
}
