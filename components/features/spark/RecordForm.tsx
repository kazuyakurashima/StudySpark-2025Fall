"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import UnderstandingSelector from './UnderstandingSelector'
import { 
  type StudyRecord,
  type SparkLevel,
  type Subject,
  type StudyType,
  type UnderstandingLevel,
  subjects,
  studyTypes,
  getSubjectLabel,
  getStudyTypeLabel,
  createStudyRecordSchema
} from '@/lib/schemas/study-record'
import { Sparkles, Flame, Zap } from 'lucide-react'

interface RecordFormProps {
  studentId: string
  initialData?: Partial<StudyRecord>
  onSubmit: (data: StudyRecord) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export default function RecordForm({
  studentId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: RecordFormProps) {
  const [level, setLevel] = useState<SparkLevel>(initialData?.level_type || 'spark')
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    subject: initialData?.subject || '' as Subject,
    study_type: initialData?.study_type || '' as StudyType,
    understanding_level: initialData?.understanding_level || '' as UnderstandingLevel,
    study_time_minutes: initialData?.study_time_minutes || undefined,
    total_problems: initialData?.total_problems || undefined,
    correct_problems: initialData?.correct_problems || undefined,
    reflection: initialData?.reflection || '',
    difficulty_areas: initialData?.difficulty_areas || '',
    next_goals: initialData?.next_goals || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const recordData = {
      ...formData,
      level_type: level,
      subject: formData.subject || undefined,
      study_type: formData.study_type || undefined,
      understanding_level: formData.understanding_level || undefined
    }

    const result = createStudyRecordSchema.safeParse(recordData)
    
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.errors.forEach(error => {
        const field = error.path[0] as string
        newErrors[field] = error.message
      })
      setErrors(newErrors)
      return false
    }

    // Additional validation for correct_problems <= total_problems
    if (formData.total_problems && formData.correct_problems && 
        formData.correct_problems > formData.total_problems) {
      setErrors(prev => ({ ...prev, correct_problems: '正答数は総問題数以下にしてください' }))
      return false
    }

    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const recordData = {
      date: formData.date,
      subject: formData.subject,
      study_type: formData.study_type,
      understanding_level: formData.understanding_level,
      level_type: level,
      ...(formData.study_time_minutes && { study_time_minutes: formData.study_time_minutes }),
      ...(formData.total_problems && { total_problems: formData.total_problems }),
      ...(formData.correct_problems && { correct_problems: formData.correct_problems }),
      ...(formData.reflection && { reflection: formData.reflection }),
      ...(formData.difficulty_areas && { difficulty_areas: formData.difficulty_areas }),
      ...(formData.next_goals && { next_goals: formData.next_goals })
    } as StudyRecord

    try {
      await onSubmit(recordData)
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const getLevelConfig = (levelType: SparkLevel) => {
    const configs = {
      spark: {
        icon: Sparkles,
        title: 'Spark',
        description: 'かんたん入力',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        requirements: '科目・種類・理解度を選ぶだけ！'
      },
      flame: {
        icon: Flame,
        title: 'Flame',
        description: 'しっかり入力',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        requirements: '時間・問題数・振り返りも記録'
      },
      blaze: {
        icon: Zap,
        title: 'Blaze',
        description: 'ばっちり入力',
        color: 'text-red-600 bg-red-50 border-red-200',
        requirements: '苦手分野・次回目標まで詳しく記録'
      }
    }
    return configs[levelType]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Level Selection */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            記録レベルを選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={level} onValueChange={(value) => setLevel(value as SparkLevel)}>
            <TabsList className="grid w-full grid-cols-3">
              {(['spark', 'flame', 'blaze'] as SparkLevel[]).map((levelType) => {
                const config = getLevelConfig(levelType)
                const Icon = config.icon
                return (
                  <TabsTrigger 
                    key={levelType} 
                    value={levelType}
                    className="flex items-center gap-2"
                    data-testid={`level-${levelType}`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.title}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            
            {(['spark', 'flame', 'blaze'] as SparkLevel[]).map((levelType) => {
              const config = getLevelConfig(levelType)
              return (
                <TabsContent key={levelType} value={levelType} className="mt-4">
                  <Card className={`border-2 ${config.color}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={config.color}>
                          {config.description}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{config.requirements}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Basic Fields (All Levels) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">日付 *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateFormData('date', e.target.value)}
                data-testid="date-input"
              />
              {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">科目 *</Label>
              <Select 
                value={formData.subject} 
                onValueChange={(value) => updateFormData('subject', value)}
              >
                <SelectTrigger data-testid="subject-select">
                  <SelectValue placeholder="科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {getSubjectLabel(subject)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject && <p className="text-sm text-red-600">{errors.subject}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="study_type">学習種類 *</Label>
              <Select 
                value={formData.study_type} 
                onValueChange={(value) => updateFormData('study_type', value)}
              >
                <SelectTrigger data-testid="study-type-select">
                  <SelectValue placeholder="学習種類を選択" />
                </SelectTrigger>
                <SelectContent>
                  {studyTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getStudyTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.study_type && <p className="text-sm text-red-600">{errors.study_type}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <UnderstandingSelector
              value={formData.understanding_level}
              onChange={(value) => updateFormData('understanding_level', value)}
              disabled={isLoading}
            />
            {errors.understanding_level && <p className="text-sm text-red-600">{errors.understanding_level}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Additional Fields for Flame and Blaze */}
      {(level === 'flame' || level === 'blaze') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">詳細情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="study_time">学習時間 (分) *</Label>
                <Input
                  id="study_time"
                  type="number"
                  min="1"
                  max="600"
                  value={formData.study_time_minutes || ''}
                  onChange={(e) => updateFormData('study_time_minutes', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="30"
                  data-testid="study-time-input"
                />
                {errors.study_time_minutes && <p className="text-sm text-red-600">{errors.study_time_minutes}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_problems">総問題数</Label>
                <Input
                  id="total_problems"
                  type="number"
                  min="0"
                  max="999"
                  value={formData.total_problems || ''}
                  onChange={(e) => updateFormData('total_problems', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="10"
                  data-testid="total-problems-input"
                />
                {errors.total_problems && <p className="text-sm text-red-600">{errors.total_problems}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="correct_problems">正答数</Label>
                <Input
                  id="correct_problems"
                  type="number"
                  min="0"
                  max="999"
                  value={formData.correct_problems || ''}
                  onChange={(e) => updateFormData('correct_problems', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="8"
                  data-testid="correct-problems-input"
                />
                {errors.correct_problems && <p className="text-sm text-red-600">{errors.correct_problems}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflection">振り返り {level === 'blaze' && '*'}</Label>
              <Textarea
                id="reflection"
                value={formData.reflection}
                onChange={(e) => updateFormData('reflection', e.target.value)}
                placeholder="今日の学習はどうでしたか？"
                maxLength={500}
                rows={3}
                data-testid="reflection-input"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{level === 'blaze' ? '10文字以上入力してください' : '任意'}</span>
                <span>{formData.reflection.length}/500文字</span>
              </div>
              {errors.reflection && <p className="text-sm text-red-600">{errors.reflection}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blaze-specific fields */}
      {level === 'blaze' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">さらに詳しく (Blaze)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty_areas">苦手だった分野</Label>
              <Textarea
                id="difficulty_areas"
                value={formData.difficulty_areas}
                onChange={(e) => updateFormData('difficulty_areas', e.target.value)}
                placeholder="どの分野が難しかったですか？"
                maxLength={300}
                rows={2}
                data-testid="difficulty-areas-input"
              />
              <div className="text-right text-xs text-slate-500">
                {formData.difficulty_areas.length}/300文字
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_goals">次回の目標</Label>
              <Textarea
                id="next_goals"
                value={formData.next_goals}
                onChange={(e) => updateFormData('next_goals', e.target.value)}
                placeholder="次回はどんなことを頑張りたいですか？"
                maxLength={300}
                rows={2}
                data-testid="next-goals-input"
              />
              <div className="text-right text-xs text-slate-500">
                {formData.next_goals.length}/300文字
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            キャンセル
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isLoading}
          data-testid="submit-record"
        >
          {isLoading ? '保存中...' : '記録を保存'}
        </Button>
      </div>
    </form>
  )
}