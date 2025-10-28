"use client"

import { Check, X } from "lucide-react"
import { THEME_COLORS } from "@/lib/constants/theme-colors"

interface ColorPaletteProps {
  selectedColor: string
  onSelect: (color: string) => void
}

export function ColorPalette({ selectedColor, onSelect }: ColorPaletteProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        テーマカラー
        <span className="ml-2 text-xs text-gray-500">（効果を比較できます）</span>
      </label>
      <div className="flex gap-3 flex-wrap">
        {THEME_COLORS.map((color) => {
          const isDefault = color.value === "default"
          const isSelected = selectedColor === color.value

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color.value)}
              className={`
                relative w-10 h-10 rounded-full transition-all duration-200
                hover:scale-110
                ${isSelected ? "ring-2 ring-offset-2 ring-gray-400" : ""}
                ${isDefault ? "border-2 border-dashed border-gray-300 bg-white" : ""}
              `}
              style={!isDefault ? { backgroundColor: color.value } : {}}
              title={color.name}
            >
              {isDefault && (
                <X className="w-5 h-5 text-gray-400 absolute inset-0 m-auto" />
              )}
              {isSelected && !isDefault && (
                <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
              )}
              {isSelected && isDefault && (
                <Check className="w-5 h-5 text-gray-600 absolute inset-0 m-auto" />
              )}
              <span className="sr-only">{color.name}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        💡 「デフォルト」を選ぶと、テーマカラーなしの状態に戻せます
      </p>
    </div>
  )
}
