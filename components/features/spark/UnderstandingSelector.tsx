"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  understandingLevels, 
  getUnderstandingLevelLabel, 
  type UnderstandingLevel 
} from '@/lib/schemas/study-record'

interface UnderstandingSelectorProps {
  value?: UnderstandingLevel
  onChange: (level: UnderstandingLevel) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function UnderstandingSelector({
  value,
  onChange,
  disabled = false,
  size = 'md'
}: UnderstandingSelectorProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'h-12 text-sm px-3',
          emoji: 'text-lg',
          label: 'text-xs'
        }
      case 'lg':
        return {
          button: 'h-16 text-base px-4',
          emoji: 'text-3xl',
          label: 'text-sm'
        }
      default:
        return {
          button: 'h-14 text-sm px-3',
          emoji: 'text-2xl', 
          label: 'text-xs'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  const getLevelConfig = (level: UnderstandingLevel) => {
    const configs = {
      excellent: {
        emoji: '😄',
        label: 'バッチリ理解',
        color: 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100',
        selectedColor: 'bg-green-200 border-green-500 text-green-900 ring-2 ring-green-300'
      },
      good: {
        emoji: '😊',
        label: 'できた',
        color: 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100',
        selectedColor: 'bg-blue-200 border-blue-500 text-blue-900 ring-2 ring-blue-300'
      },
      normal: {
        emoji: '😐',
        label: 'ふつう',
        color: 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100',
        selectedColor: 'bg-yellow-200 border-yellow-500 text-yellow-900 ring-2 ring-yellow-300'
      },
      struggling: {
        emoji: '😟',
        label: 'ちょっと不安',
        color: 'bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100',
        selectedColor: 'bg-orange-200 border-orange-500 text-orange-900 ring-2 ring-orange-300'
      },
      difficult: {
        emoji: '😥',
        label: 'むずかしかった',
        color: 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100',
        selectedColor: 'bg-red-200 border-red-500 text-red-900 ring-2 ring-red-300'
      }
    }
    return configs[level]
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700">
        理解度を選択してください
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {understandingLevels.map((level) => {
          const config = getLevelConfig(level)
          const isSelected = value === level
          
          return (
            <Button
              key={level}
              type="button"
              variant="outline"
              onClick={() => onChange(level)}
              disabled={disabled}
              data-testid={`understanding-${level}`}
              className={`
                ${sizeClasses.button}
                flex flex-col items-center justify-center border-2 transition-all duration-200
                ${isSelected ? config.selectedColor : config.color}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`${sizeClasses.emoji} mb-1`}>
                {config.emoji}
              </div>
              <div className={`${sizeClasses.label} font-medium text-center leading-tight`}>
                {config.label}
              </div>
            </Button>
          )
        })}
      </div>
      
      {value && (
        <Card className="p-3 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">選択中:</span>
            <span>{getLevelConfig(value).emoji}</span>
            <span>{getLevelConfig(value).label}</span>
          </div>
        </Card>
      )}
    </div>
  )
}