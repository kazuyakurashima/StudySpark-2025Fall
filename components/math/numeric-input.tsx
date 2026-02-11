'use client'

import { cn } from '@/lib/utils'
import { sanitizeNumericInput } from '@/lib/math-grading'

interface NumericInputProps {
  questionNumber: string
  unitLabel?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function NumericInput({
  questionNumber,
  unitLabel,
  value,
  onChange,
  disabled = false,
  className,
}: NumericInputProps) {
  return (
    <div data-slot="numeric-input" className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted-foreground min-w-[2.5rem]">
        {questionNumber}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(sanitizeNumericInput(e.target.value))}
        disabled={disabled}
        className={cn(
          'border-input flex h-12 w-full max-w-[200px] rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'text-center'
        )}
        placeholder=""
      />
      {unitLabel && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {unitLabel}
        </span>
      )}
    </div>
  )
}
