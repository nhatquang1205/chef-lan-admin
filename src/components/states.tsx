import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { messageFor } from '@/lib/api/errors'

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm text-destructive">{messageFor(error)}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

interface EmptyProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
