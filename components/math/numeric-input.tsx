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
      <span className="text-sm font-bold text-blue-700 min-w-[2.5rem]">
        {questionNumber}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(sanitizeNumericInput(e.target.value))}
        disabled={disabled}
        className={cn(
          'flex h-12 w-full max-w-[200px] rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-base shadow-sm transition-all outline-none',
          'focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
          'text-center'
        )}
        placeholder="数値を入力"
      />
      {unitLabel && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {unitLabel}
        </span>
      )}
    </div>
  )
}
