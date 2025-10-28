"use client"

import { Check } from "lucide-react"
import { THEME_COLORS } from "@/lib/constants/theme-colors"

interface ColorPaletteProps {
  selectedColor: string
  onSelect: (color: string) => void
}

export function ColorPalette({ selectedColor, onSelect }: ColorPaletteProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">テーマカラー</label>
      <div className="flex gap-3 flex-wrap">
        {THEME_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => onSelect(color.value)}
            className={`
              relative w-10 h-10 rounded-full transition-all duration-200
              hover:scale-110
              ${selectedColor === color.value ? "ring-2 ring-offset-2 ring-gray-400" : ""}
            `}
            style={{ backgroundColor: color.value }}
            title={color.name}
          >
            {selectedColor === color.value && <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />}
            <span className="sr-only">{color.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
