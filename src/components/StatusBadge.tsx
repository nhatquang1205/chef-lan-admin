import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Badge sized like a default Button (h-8), for page headers where it sits next to action buttons.
export default function StatusBadge({ className, ...props }: ComponentProps<typeof Badge>) {
  return <Badge className={cn('h-8 px-3 text-sm', className)} {...props} />
}
