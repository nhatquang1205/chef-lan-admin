import type { ChangeEvent, ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

const grouping = new Intl.NumberFormat('vi-VN')

interface Props extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: number | null
  onChange: (value: number | null) => void
}

export default function VndInput({ value, onChange, className, ...rest }: Props) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
    onChange(digits === '' ? null : Number(digits))
  }

  return (
    <div className="relative">
      <Input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`pr-8 ${className ?? ''}`}
        value={value === null ? '' : grouping.format(value)}
        onChange={handle}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">₫</span>
    </div>
  )
}
