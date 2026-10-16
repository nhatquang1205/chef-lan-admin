import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import { ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getCustomerAccess, revokeCourseAccess, revokeLessonAccess } from '@/lib/api/access'
import type { CourseEnrollmentResponse, EnrollmentStatus, LessonEnrollmentResponse } from '@/lib/api/types'
import { ENROLLMENT_STATUS_LABEL, formatDate, formatVnd } from '@/lib/format'
import GrantAccessDialog from './GrantAccessDialog'

type Row = CourseEnrollmentResponse | LessonEnrollmentResponse

function effectiveStatus(row: Row): EnrollmentStatus {
  if (row.status === 'Active' && row.expiresAt && new Date(row.expiresAt) <= new Date()) return 'Expired'
  return row.status
}

const STATUS_VARIANT: Record<EnrollmentStatus, 'default' | 'secondary' | 'outline'> = {
  Pending: 'secondary',
  Active: 'default',
  Expired: 'outline',
  Revoked: 'outline',
}

export default function AccessSection({ customerId, isActive }: { customerId: number; isActive: boolean }) {
  const [grantOpen, setGrantOpen] = useState(false)
  const [revoking, setRevoking] = useState<{ kind: 'course' | 'lesson'; row: Row } | null>(null)
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['customer-access', customerId],
    queryFn: () => getCustomerAccess(customerId),
  })

  const handleRevoke = async () => {
    if (!revoking) return
    if (revoking.kind === 'course') await revokeCourseAccess(revoking.row as CourseEnrollmentResponse)
    else await revokeLessonAccess(revoking.row as LessonEnrollmentResponse)
    toast.success('Đã thu hồi quyền.')
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Quyền học</h2>
        <span title={isActive ? undefined : 'Tài khoản đang bị khóa'}>
          <Button disabled={!isActive} onClick={() => setGrantOpen(true)}>
            <Plus />
            Cấp quyền
          </Button>
        </span>
      </div>
      {isPending ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <AccessTable
            title="Khóa học"
            empty="Chưa có khóa học nào."
            rows={data.courses}
            nameOf={(row) => (row as CourseEnrollmentResponse).courseTitle ?? `Khóa học #${(row as CourseEnrollmentResponse).courseId}`}
            onRevoke={(row) => setRevoking({ kind: 'course', row })}
          />
          <AccessTable
            title="Bài học riêng"
            empty="Chưa có bài học riêng nào."
            rows={data.lessons}
            nameOf={(row) => (row as LessonEnrollmentResponse).lessonTitle ?? `Bài học #${(row as LessonEnrollmentResponse).lessonId}`}
            onRevoke={(row) => setRevoking({ kind: 'lesson', row })}
          />
        </>
      )}
      <GrantAccessDialog customerId={customerId} open={grantOpen} onOpenChange={setGrantOpen} />
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Thu hồi quyền học?"
        description="Khách sẽ không xem được nội dung này nữa. Bạn có thể cấp lại sau."
        confirmLabel="Thu hồi"
        destructive
        onConfirm={handleRevoke}
      />
    </section>
  )
}

interface TableProps {
  title: string
  empty: string
  rows: Row[]
  nameOf: (row: Row) => string
  onRevoke: (row: Row) => void
}

function AccessTable({ title, empty, rows, nameOf, onRevoke }: TableProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày cấp</TableHead>
                <TableHead>Hết hạn</TableHead>
                <TableHead>Thanh toán</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const status = effectiveStatus(row)
                const active = status === 'Active'
                return (
                  <TableRow key={row.id} className={active ? undefined : 'text-muted-foreground'}>
                    <TableCell className="font-medium">{nameOf(row)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[status]}>{ENROLLMENT_STATUS_LABEL[status]}</Badge>
                    </TableCell>
                    <TableCell>{row.accessGrantedAt ? formatDate(row.accessGrantedAt) : '—'}</TableCell>
                    <TableCell>{row.expiresAt ? formatDate(row.expiresAt) : 'Trọn đời'}</TableCell>
                    <TableCell>
                      {!row.isPaid ? 'Miễn phí' : row.amountPaidVnd != null ? formatVnd(row.amountPaidVnd) : 'Đã thanh toán'}
                    </TableCell>
                    <TableCell className="max-w-48 whitespace-normal">
                      {[row.paymentNote, row.paymentReference].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {active && (
                        <Button variant="outline" size="sm" onClick={() => onRevoke(row)}>
                          Thu hồi
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
