import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminFetch } from '@/lib/api/admin'
import { fieldErrors, messageFor } from '@/lib/api/errors'
import { useAuth } from '@/lib/auth/context'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z.string().min(8, 'Mật khẩu mới cần ít nhất 8 ký tự.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp.',
  })

type FormValues = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const { user, logout, clearSession } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await adminFetch('/api/v1/admins/auth/change-password', {
        method: 'POST',
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      })
    } catch (error) {
      const fields = fieldErrors(error)
      if (fields.currentPassword) setError('currentPassword', { message: fields.currentPassword })
      if (fields.newPassword) setError('newPassword', { message: fields.newPassword })
      if (!fields.currentPassword && !fields.newPassword) setServerError(messageFor(error))
      return
    }
    clearSession()
    toast.success('Đã đổi mật khẩu, vui lòng đăng nhập lại')
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Đổi mật khẩu</CardTitle>
          <CardDescription>
            {user?.mustChangePassword
              ? 'Bạn cần đổi mật khẩu trước khi tiếp tục.'
              : 'Sau khi đổi, bạn sẽ được đăng xuất khỏi mọi thiết bị.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
              {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            {serverError && (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Đổi mật khẩu
            </Button>
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              Đăng xuất
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
