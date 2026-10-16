import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  )
}

export default function FieldLabel({ required, children, className, ...props }: ComponentProps<typeof Label> & { required?: boolean }) {
  return (
    <Label className={cn('gap-1', className)} {...props}>
      {children}
      {required && <RequiredMark />}
    </Label>
  )
}
