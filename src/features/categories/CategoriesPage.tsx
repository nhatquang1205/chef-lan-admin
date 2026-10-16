import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, ImageOff, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api/client'
import { deleteCategory, listCategories, updateCategory } from '@/lib/api/categories'
import { messageFor } from '@/lib/api/errors'
import type { CategoryAdminResponse, CategoryStatus } from '@/lib/api/types'
import CategoryDialog from './CategoryDialog'

const ALL = 'all'

const STATUS_LABEL: Record<CategoryStatus, string> = { Active: 'Đang hiện', InActive: 'Đang ẩn' }

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

function toRequest(category: CategoryAdminResponse, status: CategoryStatus) {
  return {
    name: category.name,
    description: category.description ?? null,
    thumbnailUrl: category.thumbnailUrl ?? null,
    displayOrder: category.displayOrder,
    status,
  }
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [editing, setEditing] = useState<CategoryAdminResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<CategoryAdminResponse | null>(null)
  const [inUse, setInUse] = useState<CategoryAdminResponse | null>(null)

  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const setStatusMutation = useMutation({
    mutationFn: ({ category, next }: { category: CategoryAdminResponse; next: CategoryStatus }) =>
      updateCategory(category.id, toRequest(category, next)),
    onSuccess: (_, { next }) => toast.success(next === 'Active' ? 'Đã hiện danh mục' : 'Đã ẩn danh mục'),
    onError: (error) => toast.error(messageFor(error)),
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (categories.data ?? [])
      .filter((c) => (status === ALL || c.status === status) && (q === '' || `${c.name} ${c.slug}`.toLowerCase().includes(q)))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'vi'))
  }, [categories.data, search, status])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (category: CategoryAdminResponse) => {
    setEditing(category)
    setDialogOpen(true)
  }

  const addButton = (
    <Button onClick={openCreate}>
      <Plus data-icon="inline-start" />
      Thêm danh mục
    </Button>
  )

  const hasFilters = search.trim() !== '' || status !== ALL

  return (
    <>
      <PageHeader title="Danh mục" description="Nhóm các khóa học để khách dễ tìm." actions={addButton} />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm danh mục…"
            aria-label="Tìm danh mục"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Trạng thái" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categories.isPending ? (
        <LoadingState />
      ) : categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Không có danh mục phù hợp"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setStatus(ALL)
                }}
              >
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState title="Chưa có danh mục nào" description="Tạo danh mục đầu tiên để gắn vào khóa học." action={addButton} />
        )
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Danh mục</TableHead>
                <TableHead>Đường dẫn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thứ tự</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((category) => {
                const active = category.status === 'Active'
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Thumbnail url={category.thumbnailUrl} />
                        <span className="min-w-32 font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>
                      <Badge variant={active ? 'default' : 'secondary'}>{STATUS_LABEL[category.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{category.displayOrder}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Sửa" onClick={() => openEdit(category)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={active ? 'Ẩn' : 'Hiện'}
                          title={active ? 'Ẩn' : 'Hiện'}
                          disabled={setStatusMutation.isPending}
                          onClick={() => setStatusMutation.mutate({ category, next: active ? 'InActive' : 'Active' })}
                        >
                          {active ? <EyeOff /> : <Eye />}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Xóa" onClick={() => setDeleting(category)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa danh mục?"
        description={deleting && `Danh mục "${deleting.name}" sẽ bị xóa. Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa"
        destructive
        onConfirm={async () => {
          const target = deleting!
          try {
            await deleteCategory(target.id)
            toast.success('Đã xóa danh mục')
          } catch (error) {
            if (error instanceof ApiError && error.code === 'category.in_use') setInUse(target)
            else throw error
          }
        }}
      />

      <ConfirmDialog
        open={inUse !== null}
        onOpenChange={(open) => !open && setInUse(null)}
        title="Không thể xóa danh mục"
        description="Danh mục đang được dùng bởi khóa học. Hãy ẩn danh mục thay vì xóa."
        confirmLabel="Ẩn danh mục"
        onConfirm={async () => {
          await updateCategory(inUse!.id, toRequest(inUse!, 'InActive'))
          toast.success('Đã ẩn danh mục')
        }}
      />
    </>
  )
}
