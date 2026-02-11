'use client'

import { cn } from '@/lib/utils'

interface SelectionInputProps {
  questionNumber: string
  options: string[]
  selectedValues: string[]
  unitLabel?: string
  onToggle: (value: string) => void
  disabled?: boolean
  className?: string
}

export function SelectionInput({
  questionNumber,
  options,
  selectedValues,
  unitLabel,
  onToggle,
  disabled = false,
  className,
}: SelectionInputProps) {
  return (
    <div data-slot="selection-input" className={cn('flex items-start gap-2', className)}>
      <span className="text-sm font-medium text-muted-foreground min-w-[2.5rem] mt-2">
        {questionNumber}
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                disabled={disabled}
                className={cn(
                  'inline-flex items-center justify-center min-w-[48px] min-h-[48px] px-3 py-2 rounded-md text-sm font-medium transition-all',
                  'border shadow-xs outline-none',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                    : 'bg-transparent border-input text-foreground hover:bg-accent'
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
        {unitLabel && (
          <span className="text-xs text-muted-foreground mt-1 block">
            {unitLabel}
          </span>
        )}
      </div>
    </div>
  )
}
