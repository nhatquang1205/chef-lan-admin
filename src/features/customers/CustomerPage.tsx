import { useQuery } from '@tanstack/react-query'
import { Lock, LockOpen, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { deactivateCustomer, getCustomer, inviteCustomer, reactivateCustomer } from '@/lib/api/customers'
import { messageFor } from '@/lib/api/errors'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_VARIANT, formatDateTime } from '@/lib/format'
import AccessSection from './AccessSection'
import CustomerForm from './CustomerForm'

export default function CustomerPage() {
  const id = Number(useParams().id)
  const valid = Number.isInteger(id) && id > 0
  const [confirmLock, setConfirmLock] = useState(false)
  const [confirmInvite, setConfirmInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const { data: customer, error, isPending, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
    enabled: valid,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 3,
  })

  if (!valid) return <NotFound />
  if (isPending) return <LoadingState rows={6} />
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />
    return <ErrorState error={error} onRetry={() => refetch()} />
  }

  const handleLock = async () => {
    await deactivateCustomer(customer.id)
    toast.success('Đã khóa tài khoản.')
  }

  const sendInvite = async () => {
    await inviteCustomer(customer.id)
    toast.success('Đã gửi email mời.')
  }

  const handleInvite = async () => {
    if (customer.status === 'NotInvited') {
      setInviting(true)
      try {
        await sendInvite()
      } catch (err) {
        toast.error(messageFor(err))
      } finally {
        setInviting(false)
      }
    } else {
      setConfirmInvite(true)
    }
  }

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      await reactivateCustomer(customer.id)
      toast.success('Đã mở khóa tài khoản.')
    } catch (err) {
      toast.error(messageFor(err))
    } finally {
      setUnlocking(false)
    }
  }

  const canInvite = ['NotInvited', 'Invited', 'InviteExpired'].includes(customer.status)

  const dates = [
    customer.invitedAt && `Mời ${formatDateTime(customer.invitedAt)}`,
    customer.status === 'Invited' && customer.inviteExpiresAt && `Hết hạn ${formatDateTime(customer.inviteExpiresAt)}`,
    customer.activatedAt && `Kích hoạt ${formatDateTime(customer.activatedAt)}`,
    customer.lastLoginAt && `Đăng nhập gần nhất ${formatDateTime(customer.lastLoginAt)}`,
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        title={customer.fullName}
        breadcrumb={[{ label: 'Khách hàng', to: '/customers' }, { label: customer.fullName }]}
        description={customer.email ?? 'Chưa có email'}
        actions={
          <>
            <StatusBadge variant={CUSTOMER_STATUS_VARIANT[customer.status]}>{CUSTOMER_STATUS_LABEL[customer.status]}</StatusBadge>
            {canInvite && (
              <span title={customer.email ? undefined : 'Cần email để mời'}>
                <Button
                  variant={customer.status === 'InviteExpired' ? 'default' : 'outline'}
                  disabled={!customer.email || inviting}
                  onClick={() => void handleInvite()}
                >
                  <Mail />
                  {customer.status === 'NotInvited' ? 'Gửi lời mời' : 'Gửi lại lời mời'}
                </Button>
              </span>
            )}
            {customer.isActive ? (
              <Button variant="outline" onClick={() => setConfirmLock(true)}>
                <Lock />
                Khóa tài khoản
              </Button>
            ) : (
              <Button variant="outline" disabled={unlocking} onClick={() => void handleUnlock()}>
                <LockOpen />
                Mở khóa
              </Button>
            )}
          </>
        }
      />
      {dates.length > 0 && <p className="-mt-3 mb-6 text-sm text-muted-foreground">{dates.join(' · ')}</p>}
      <div className="flex max-w-3xl flex-col gap-6">
        <CustomerForm key={`${customer.id}:${customer.status}`} customer={customer} />
        <AccessSection customerId={customer.id} isActive={customer.isActive} />
      </div>
      <ConfirmDialog
        open={confirmInvite}
        onOpenChange={setConfirmInvite}
        title="Gửi lại lời mời?"
        description="Liên kết cũ sẽ không dùng được nữa."
        confirmLabel="Gửi lại"
        onConfirm={sendInvite}
      />
      <ConfirmDialog
        open={confirmLock}
        onOpenChange={setConfirmLock}
        title="Khóa tài khoản?"
        description="Khách sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được."
        confirmLabel="Khóa tài khoản"
        destructive
        onConfirm={handleLock}
      />
    </>
  )
}

function NotFound() {
  return (
    <EmptyState
      title="Không tìm thấy khách hàng"
      action={
        <Button variant="outline" asChild>
          <Link to="/customers">Về danh sách khách hàng</Link>
        </Button>
      }
    />
  )
}
