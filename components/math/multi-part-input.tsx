'use client'

import { cn } from '@/lib/utils'
import { sanitizeNumericInput } from '@/lib/math-grading'

interface MultiPartInputProps {
  questionNumber: string
  template: string
  slots: { label: string; unit?: string }[]
  values: Record<string, string>
  onChange: (label: string, value: string) => void
  disabled?: boolean
  className?: string
  /** 頂点番号対応表。存在する場合、入力欄の上に「1=A / 2=B / 3=C」形式で表示 */
  vertex_map?: Record<string, string>
}

export function MultiPartInput({
  questionNumber,
  template,
  slots,
  values,
  onChange,
  disabled = false,
  className,
  vertex_map,
}: MultiPartInputProps) {
  // テンプレートを {label} で分割してUI要素に変換
  const parts = parseTemplate(template, slots)
  const vertexEntries = vertex_map
    ? Object.entries(vertex_map).sort(([a], [b]) => Number(a) - Number(b))
    : []

  return (
    <div data-slot="multi-part-input" className={cn('flex items-start gap-2', className)}>
      <span className="text-sm font-bold text-blue-700 min-w-[2.5rem] mt-3">
        {questionNumber}
      </span>
      <div className="flex flex-col gap-1">
        {vertexEntries.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-bold">数字で入力してください</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {vertexEntries.map(([num, letter]) => (
                <span
                  key={num}
                  className="inline-flex items-center rounded-full bg-white px-2 py-1 font-medium text-amber-900 ring-1 ring-amber-200"
                >
                  頂点{letter}なら{num}
                </span>
              ))}
            </div>
          </div>
        )}
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
                  inputMode={vertexEntries.length > 0 ? 'numeric' : 'decimal'}
                  value={values[part.label] || ''}
                  onChange={(e) => onChange(part.label, sanitizeNumericInput(e.target.value))}
                  disabled={disabled}
                  className={cn(
                    'flex h-10 w-20 rounded-lg border-2 border-gray-300 bg-white px-2 py-1 text-base shadow-sm transition-all outline-none',
                    'focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-[3px]',
                    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
                    'text-center'
                  )}
                  placeholder={getSlotPlaceholder(template, part.label, vertexEntries.length > 0)}
                  aria-label={part.label}
                />
                {shouldRenderSlotUnit(template, part.label, slot?.unit) && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {slot.unit}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getSlotPlaceholder(template: string, label: string, hasVertexMap: boolean): string {
  if (hasVertexMap) {
    return '数字'
  }

  if (template.includes(`${label}{${label}}`)) {
    return ''
  }

  if (/^[①-⑳]+$/.test(label)) {
    return ''
  }

  return label
}

function shouldRenderSlotUnit(template: string, label: string, unit?: string): boolean {
  if (!unit) {
    return false
  }

  return !template.includes(`{${label}}${unit}`)
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
