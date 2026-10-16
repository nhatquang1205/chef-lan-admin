import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/FieldLabel'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { createCustomer, updateCustomer } from '@/lib/api/customers'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import type { CustomerDetailResponse, CustomerRequest } from '@/lib/api/types'
import { useUnsavedChangesPrompt } from '@/lib/useUnsavedChangesPrompt'

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const schema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(200, 'Tối đa 200 ký tự.'),
  email: z
    .string()
    .trim()
    .max(254, 'Tối đa 254 ký tự.')
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email không hợp lệ.'),
  phone: z.string().trim().max(20, 'Tối đa 20 ký tự.'),
  facebookName: z.string().trim().max(200, 'Tối đa 200 ký tự.'),
  facebookProfileUrl: z
    .string()
    .trim()
    .max(500, 'Tối đa 500 ký tự.')
    .refine((v) => v === '' || isHttpUrl(v), 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.'),
  note: z.string().max(2000, 'Tối đa 2000 ký tự.'),
  sendInvite: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function toValues(customer?: CustomerDetailResponse): FormValues {
  return {
    fullName: customer?.fullName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    facebookName: customer?.facebookName ?? '',
    facebookProfileUrl: customer?.facebookProfileUrl ?? '',
    note: customer?.note ?? '',
    sendInvite: !customer,
  }
}

const orNull = (value: string) => (value.trim() === '' ? null : value.trim())

function toRequest(values: FormValues, isNew: boolean): CustomerRequest {
  return {
    fullName: values.fullName.trim(),
    email: orNull(values.email),
    phone: orNull(values.phone),
    facebookName: orNull(values.facebookName),
    facebookProfileUrl: orNull(values.facebookProfileUrl),
    note: orNull(values.note),
    ...(isNew && { sendInvite: values.sendInvite && values.email.trim() !== '' }),
  }
}

function Field({ label, htmlFor, error, required, children }: {
  required?: boolean
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={htmlFor} required={required}>{label}</FieldLabel>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// Returns the confirmation text when saving would change a sign-in email or cancel a pending invite.
function emailChangeWarning(customer: CustomerDetailResponse | undefined, nextEmail: string | null): string | null {
  if (!customer?.email) return null
  if (customer.email.toLowerCase() === (nextEmail ?? '').toLowerCase()) return null
  if (customer.status === 'Active') {
    return 'Email này là tài khoản đăng nhập của khách. Đổi email sẽ đổi tên đăng nhập. Tiếp tục?'
  }
  if (customer.status === 'Invited') return 'Lời mời đang chờ sẽ bị hủy khi đổi email. Tiếp tục?'
  return null
}

export default function CustomerForm({ customer }: { customer?: CustomerDetailResponse }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<CustomerRequest | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(customer) })

  const hasEmail = (useWatch({ control, name: 'email' }) ?? '').trim() !== ''

  useUnsavedChangesPrompt(isDirty)

  const save = useMutation({
    mutationFn: (input: CustomerRequest) => (customer ? updateCustomer(customer.id, input) : createCustomer(input)),
  })

  const submit = async (input: CustomerRequest) => {
    let saved: CustomerDetailResponse
    try {
      saved = await save.mutateAsync(input)
    } catch (error) {
      const fields = fieldErrors(error)
      const known = Object.keys(toValues()) as (keyof FormValues)[]
      let mapped = false
      for (const [key, message] of Object.entries(fields)) {
        if (known.includes(key as keyof FormValues)) {
          setError(key as keyof FormValues, { message })
          mapped = true
        }
      }
      if (!mapped && error instanceof ApiError && error.code === 'customer.email_already_used') {
        setError('email', { message: messageFor(error) })
        mapped = true
      }
      if (!mapped) toast.error(messageFor(error))
      return
    }
    if (saved.inviteError) toast.warning('Đã tạo khách hàng nhưng chưa gửi được email mời')
    else if (!customer && input.sendInvite) toast.success('Đã tạo khách hàng và gửi email mời')
    else toast.success('Đã lưu')
    reset(toValues(saved))
    if (!customer) navigate(`/customers/${saved.id}`, { replace: true })
  }

  const onSubmit = async (values: FormValues) => {
    const input = toRequest(values, !customer)
    if (emailChangeWarning(customer, input.email)) {
      setPending(input)
      return
    }
    await submit(input)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Thông tin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Họ tên" required htmlFor="fullName" error={errors.fullName?.message}>
            <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
            </Field>
            <Field label="Điện thoại" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên Facebook" htmlFor="facebookName" error={errors.facebookName?.message}>
              <Input id="facebookName" aria-invalid={!!errors.facebookName} {...register('facebookName')} />
            </Field>
            <Field label="Link Facebook" htmlFor="facebookProfileUrl" error={errors.facebookProfileUrl?.message}>
              <Input
                id="facebookProfileUrl"
                placeholder="https://facebook.com/…"
                aria-invalid={!!errors.facebookProfileUrl}
                {...register('facebookProfileUrl')}
              />
            </Field>
          </div>
          <Field label="Ghi chú" htmlFor="note" error={errors.note?.message}>
            <Textarea id="note" rows={4} aria-invalid={!!errors.note} {...register('note')} />
          </Field>
          {!customer && (
            <Controller
              control={control}
              name="sendInvite"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendInvite"
                    checked={field.value && hasEmail}
                    disabled={!hasEmail}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <FieldLabel htmlFor="sendInvite">Gửi email mời ngay</FieldLabel>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {customer && isDirty && (
          <Button type="button" variant="outline" disabled={save.isPending} onClick={() => reset(toValues(customer))}>
            Hủy thay đổi
          </Button>
        )}
        <Button type="submit" disabled={save.isPending || (!!customer && !isDirty)}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {customer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
        </Button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title="Đổi email?"
        description={emailChangeWarning(customer, pending?.email ?? null) ?? undefined}
        confirmLabel="Tiếp tục"
        onConfirm={async () => {
          if (pending) await submit(pending)
        }}
      />
    </form>
  )
}
