"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { THEME_COLORS } from "@/lib/constants/theme-colors"

interface ColorPaletteProps {
  selectedColor: string
  onSelect: (color: string) => void
}

export function ColorPalette({ selectedColor, onSelect }: ColorPaletteProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        テーマカラー
      </label>

      {/* カラー名表示エリア */}
      <div className="mb-4 h-8 flex items-center justify-center">
        {hoveredColor ? (
          <div className="animate-in fade-in-0 zoom-in-95 duration-200">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-700">
                {THEME_COLORS.find(c => c.value === hoveredColor)?.name}
              </span>
              {hoveredColor !== "default" && (
                <span
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: hoveredColor }}
                />
              )}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">
            カラーを選んでください
          </span>
        )}
      </div>

      {/* カラーパレット */}
      <div className="flex gap-3 flex-wrap justify-center">
        {THEME_COLORS.map((color) => {
          const isDefault = color.value === "default"
          const isSelected = selectedColor === color.value
          const isHovered = hoveredColor === color.value

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color.value)}
              onMouseEnter={() => setHoveredColor(color.value)}
              onMouseLeave={() => setHoveredColor(null)}
              className={`
                relative w-12 h-12 rounded-full transition-all duration-300
                ${isHovered ? "scale-125 shadow-lg" : "hover:scale-110"}
                ${isSelected ? "ring-4 ring-offset-2" : ""}
                ${isDefault ? "border-2 border-dashed border-gray-300 bg-white" : "shadow-md"}
              `}
              style={
                !isDefault
                  ? {
                      backgroundColor: color.value,
                      ...(isSelected && { ringColor: color.value + "80" })
                    }
                  : {}
              }
              aria-label={color.name}
            >
              {isDefault && (
                <X className="w-6 h-6 text-gray-400 absolute inset-0 m-auto transition-transform duration-200" />
              )}
              {isSelected && !isDefault && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                  </div>
                </div>
              )}
              {isSelected && isDefault && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-5 h-5 text-gray-600" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ヒントテキスト */}
      <p className="mt-4 text-center text-xs text-gray-500">
        💡 ×マークを選ぶと、色なしに戻せるよ
      </p>
    </div>
  )
}
