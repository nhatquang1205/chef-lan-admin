import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImageOff, Plus, Search } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listCategories } from '@/lib/api/categories'
import { listCourses } from '@/lib/api/courses'
import type { CourseListItemResponse, CourseListParams, CourseSortOrder, CourseStatus } from '@/lib/api/types'
import { COURSE_STATUS_LABEL, COURSE_STATUS_VARIANT, formatDate, formatDuration, formatVnd } from '@/lib/format'

const PAGE_SIZE = 20
const ALL = 'all'

const SORT_LABEL: Record<CourseSortOrder, string> = {
  Newest: 'Mới nhất',
  PriceAsc: 'Giá tăng',
  PriceDesc: 'Giá giảm',
  Title: 'Tên',
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value)
}

function parseParams(search: URLSearchParams): CourseListParams {
  const page = Number(search.get('page'))
  return {
    status: oneOf(search.get('status'), Object.keys(COURSE_STATUS_LABEL) as CourseStatus[]),
    q: search.get('q') ?? undefined,
    categorySlug: search.get('categorySlug') ?? undefined,
    sort: oneOf(search.get('sort'), Object.keys(SORT_LABEL) as CourseSortOrder[]),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

function Thumbnail({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="flex h-[30px] w-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <ImageOff className="size-4" />
      </div>
    )
  }
  return <img src={url} alt="" className="h-[30px] w-12 shrink-0 rounded object-cover" loading="lazy" />
}

function CourseRow({ course }: { course: CourseListItemResponse }) {
  const navigate = useNavigate()
  const discounted = course.compareAtPriceVnd != null && course.compareAtPriceVnd > course.priceVnd
  const href = `/courses/${course.id}`

  return (
    <TableRow className="cursor-pointer" onClick={() => navigate(href)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Thumbnail url={course.thumbnailUrl} />
          <div className="min-w-48">
            <Link to={href} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {course.title}
            </Link>
            {course.subtitle && <p className="line-clamp-1 text-xs text-muted-foreground">{course.subtitle}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={COURSE_STATUS_VARIANT[course.status]}>{COURSE_STATUS_LABEL[course.status]}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex min-w-32 flex-wrap gap-1">
          {course.categories.map((category) => (
            <Badge key={category.id} variant="outline">
              {category.name}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div>{course.priceDisplay}</div>
        {discounted && (
          <div className="text-xs text-muted-foreground line-through">{formatVnd(course.compareAtPriceVnd!)}</div>
        )}
      </TableCell>
      <TableCell className="text-right">{course.lessonCount}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDuration(course.totalDurationSeconds)}</TableCell>
      <TableCell className="whitespace-nowrap">{course.publishedAt ? formatDate(course.publishedAt) : '—'}</TableCell>
    </TableRow>
  )
}

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseParams(searchParams)
  const urlQuery = params.q ?? ''
  const [searchText, setSearchText] = useState(urlQuery)

  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  if (syncedQuery !== urlQuery) {
    setSyncedQuery(urlQuery)
    setSearchText(urlQuery)
  }

  function update(changes: Record<string, string | undefined>, keepPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!keepPage) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    const trimmed = searchText.trim()
    if (trimmed === urlQuery) return
    const timer = setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (trimmed) next.set('q', trimmed)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText, urlQuery, setSearchParams])

  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories, staleTime: 5 * 60 * 1000 })

  const requestParams: CourseListParams = { ...params, pageSize: PAGE_SIZE }
  const courses = useQuery({
    queryKey: ['courses', requestParams],
    queryFn: () => listCourses(requestParams),
    placeholderData: keepPreviousData,
  })

  const hasFilters = Boolean(params.status || params.q || params.categorySlug || params.sort)
  const data = courses.data
  const addButton = (
    <Button asChild>
      <Link to="/courses/new">
        <Plus data-icon="inline-start" />
        Thêm khóa học
      </Link>
    </Button>
  )

  function clearFilters() {
    setSearchText('')
    setSearchParams({}, { replace: true })
  }

  function selectValue(value: string) {
    return value === ALL ? undefined : value
  }

  return (
    <>
      <PageHeader title="Khóa học" description="Quản lý các khóa học, bài học và video." actions={addButton} />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm khóa học…"
            aria-label="Tìm khóa học"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={params.status ?? ALL} onValueChange={(v) => update({ status: selectValue(v) })}>
          <SelectTrigger aria-label="Trạng thái" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
            {Object.entries(COURSE_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.categorySlug ?? ALL} onValueChange={(v) => update({ categorySlug: selectValue(v) })}>
          <SelectTrigger aria-label="Danh mục" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả danh mục</SelectItem>
            {categories.data?.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
            {params.categorySlug && !categories.data?.some((c) => c.slug === params.categorySlug) && (
              <SelectItem value={params.categorySlug}>{params.categorySlug}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={params.sort ?? 'Newest'} onValueChange={(v) => update({ sort: v === 'Newest' ? undefined : v })}>
          <SelectTrigger aria-label="Sắp xếp" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {courses.isPending ? (
        <LoadingState />
      ) : courses.isError && !data ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      ) : data && data.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Không có khóa học phù hợp"
            description="Thử đổi hoặc bỏ bớt bộ lọc."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState title="Chưa có khóa học nào" description="Tạo khóa học đầu tiên để bắt đầu." action={addButton} />
        )
      ) : (
        data && (
          <div className="flex flex-col gap-4">
            <Card className={`overflow-hidden p-0 transition-opacity ${courses.isPlaceholderData ? 'opacity-60' : ''}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead className="text-right">Bài học</TableHead>
                    <TableHead>Thời lượng</TableHead>
                    <TableHead>Xuất bản</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((course) => (
                    <CourseRow key={course.id} course={course} />
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Trang {data.page} / {Math.max(data.totalPages, 1)} · {data.totalCount} khóa học
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasPrevious}
                  onClick={() => update({ page: String(data.page - 1) }, true)}
                >
                  <ChevronLeft data-icon="inline-start" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasNext}
                  onClick={() => update({ page: String(data.page + 1) }, true)}
                >
                  Sau
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </>
  )
}
