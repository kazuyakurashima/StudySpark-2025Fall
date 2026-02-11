'use client'

import { cn } from '@/lib/utils'
import { sanitizeNumericInput } from '@/lib/math-grading'

interface MultiPartInputProps {
  questionNumber: string
  template: string
  slots: { label: string; unit: string }[]
  values: Record<string, string>
  onChange: (label: string, value: string) => void
  disabled?: boolean
  className?: string
}

export function MultiPartInput({
  questionNumber,
  template,
  slots,
  values,
  onChange,
  disabled = false,
  className,
}: MultiPartInputProps) {
  // テンプレートを {label} で分割してUI要素に変換
  const parts = parseTemplate(template, slots)

  return (
    <div data-slot="multi-part-input" className={cn('flex items-start gap-2', className)}>
      <span className="text-sm font-bold text-blue-700 min-w-[2.5rem] mt-3">
        {questionNumber}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <span key={i} className="text-sm text-foreground whitespace-nowrap">
                {part.text}
              </span>
            )
          }

          const slot = slots.find(s => s.label === part.label)
          return (
            <span key={i} className="inline-flex items-center gap-0.5">
              <input
                type="text"
                inputMode="decimal"
                value={values[part.label] || ''}
                onChange={(e) => onChange(part.label, sanitizeNumericInput(e.target.value))}
                disabled={disabled}
                className={cn(
                  'border-input flex h-10 w-20 rounded-md border bg-transparent px-2 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none',
                  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                  'text-center'
                )}
                placeholder={part.label}
                aria-label={part.label}
              />
              {slot?.unit && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {slot.unit}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

type TemplatePart =
  | { type: 'text'; text: string }
  | { type: 'slot'; label: string }

function parseTemplate(
  template: string,
  slots: { label: string }[]
): TemplatePart[] {
  const parts: TemplatePart[] = []
  // {label} パターンで分割
  const regex = /\{([^}]+)\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: template.slice(lastIndex, match.index) })
    }
    // スロットが存在するか確認
    const label = match[1]
    if (slots.some(s => s.label === label)) {
      parts.push({ type: 'slot', label })
    } else {
      parts.push({ type: 'text', text: match[0] })
    }
    lastIndex = regex.lastIndex
  }

  // 残りのテキスト
  if (lastIndex < template.length) {
    parts.push({ type: 'text', text: template.slice(lastIndex) })
  }

  return parts
}
