import { Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { messageFor } from '@/lib/api/errors'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<unknown>
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Xác nhận',
  destructive,
  onConfirm,
}: Props) {
  const [pending, setPending] = useState(false)

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      toast.error(messageFor(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={() => void handleConfirm()} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
