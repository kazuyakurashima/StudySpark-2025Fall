'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { sanitizeNumericInput } from '@/lib/math-grading'

interface FractionInputProps {
  questionNumber: string
  numerator: string
  denominator: string
  onNumeratorChange: (value: string) => void
  onDenominatorChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function FractionInput({
  questionNumber,
  numerator,
  denominator,
  onNumeratorChange,
  onDenominatorChange,
  disabled = false,
  className,
}: FractionInputProps) {
  const denominatorRef = useRef<HTMLInputElement>(null)

  const inputClasses = cn(
    'border-input flex h-10 w-16 rounded-md border bg-transparent px-2 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'text-center'
  )

  const handleNumeratorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.key === 'Enter') {
        e.preventDefault()
        denominatorRef.current?.focus()
      }
    }
  }

  const showDenominatorError = denominator === '0'

  return (
    <div data-slot="fraction-input" className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-bold text-blue-700 min-w-[2.5rem]">
        {questionNumber}
      </span>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-slate-400">分子</span>
        <input
          type="text"
          inputMode="numeric"
          value={numerator}
          onChange={(e) => onNumeratorChange(sanitizeNumericInput(e.target.value))}
          onKeyDown={handleNumeratorKeyDown}
          disabled={disabled}
          className={inputClasses}
          placeholder=""
          aria-label="分子"
        />
        <div className="w-16 h-0.5 bg-blue-400 rounded-full" />
        <input
          ref={denominatorRef}
          type="text"
          inputMode="numeric"
          value={denominator}
          onChange={(e) => onDenominatorChange(sanitizeNumericInput(e.target.value))}
          disabled={disabled}
          className={cn(
            inputClasses,
            showDenominatorError && 'border-destructive ring-destructive/20'
          )}
          placeholder=""
          aria-label="分母"
        />
        <span className="text-[10px] text-slate-400">分母</span>
        {showDenominatorError && (
          <span className="text-xs text-destructive mt-0.5">分母は0以外</span>
        )}
      </div>
    </div>
  )
}
