import { z } from 'zod'

// Understanding levels (理解度5段階)
export const understandingLevels = [
  'excellent',      // 😄 バッチリ理解
  'good',          // 😊 できた
  'normal',        // 😐 ふつう
  'struggling',    // 😟 ちょっと不安
  'difficult'      // 😥 むずかしかった
] as const

export type UnderstandingLevel = typeof understandingLevels[number]

// Spark levels (記録レベル)
export const sparkLevels = [
  'spark',   // Spark - 簡単入力
  'flame',   // Flame - 詳細入力
  'blaze'    // Blaze - 最詳細入力
] as const

export type SparkLevel = typeof sparkLevels[number]

// Study types
export const studyTypes = [
  'lesson',        // 授業
  'homework',      // 宿題
  'practice',      // 問題集
  'review',        // 復習
  'test',          // テスト
  'other'          // その他
] as const

export type StudyType = typeof studyTypes[number]

// Subjects
export const subjects = [
  'math',          // 算数・数学
  'japanese',      // 国語
  'science',       // 理科
  'social',        // 社会
  'english',       // 英語
  'other'          // その他
] as const

export type Subject = typeof subjects[number]

// Base study record schema
export const studyRecordBaseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません (YYYY-MM-DD)'),
  subject: z.enum(subjects, { errorMap: () => ({ message: '有効な科目を選択してください' }) }),
  study_type: z.enum(studyTypes, { errorMap: () => ({ message: '有効な学習タイプを選択してください' }) }),
  understanding_level: z.enum(understandingLevels, { errorMap: () => ({ message: '理解度を選択してください' }) }),
  level_type: z.enum(sparkLevels, { errorMap: () => ({ message: '記録レベルを選択してください' }) }),
})

// Spark level (basic input)
export const sparkRecordSchema = studyRecordBaseSchema.extend({
  level_type: z.literal('spark'),
  study_time_minutes: z.number().min(1, '学習時間は1分以上にしてください').max(600, '学習時間は600分以下にしてください').optional(),
})

// Flame level (detailed input)
export const flameRecordSchema = studyRecordBaseSchema.extend({
  level_type: z.literal('flame'),
  study_time_minutes: z.number().min(1, '学習時間は1分以上にしてください').max(600, '学習時間は600分以下にしてください'),
  total_problems: z.number().min(0, '問題数は0以上にしてください').max(999, '問題数は999以下にしてください').optional(),
  correct_problems: z.number().min(0, '正答数は0以上にしてください').optional(),
  reflection: z.string().max(500, '振り返りは500文字以内にしてください').optional(),
})

// Blaze level (most detailed input)
export const blazeRecordSchema = studyRecordBaseSchema.extend({
  level_type: z.literal('blaze'),
  study_time_minutes: z.number().min(1, '学習時間は1分以上にしてください').max(600, '学習時間は600分以下にしてください'),
  total_problems: z.number().min(0, '問題数は0以上にしてください').max(999, '問題数は999以下にしてください'),
  correct_problems: z.number().min(0, '正答数は0以上にしてください'),
  reflection: z.string().min(10, '振り返りは10文字以上入力してください').max(500, '振り返りは500文字以内にしてください'),
  difficulty_areas: z.string().max(300, '苦手な分野は300文字以内にしてください').optional(),
  next_goals: z.string().max(300, '次回の目標は300文字以内にしてください').optional(),
})

// Union schema for all levels
export const studyRecordSchema = z.discriminatedUnion('level_type', [
  sparkRecordSchema,
  flameRecordSchema,
  blazeRecordSchema,
])

// API request schema (excludes generated fields)
export const createStudyRecordSchema = studyRecordSchema

export const updateStudyRecordSchema = studyRecordSchema.partial().extend({
  id: z.string().uuid('有効なUUIDを指定してください'),
})

// API response schema (includes generated fields)
export const studyRecordResponseSchema = studyRecordSchema.extend({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
})

// Validation for correct_problems <= total_problems
export const validateCorrectProblems = (data: any) => {
  if (data.total_problems && data.correct_problems && data.correct_problems > data.total_problems) {
    return { isValid: false, message: '正答数は総問題数以下にしてください' }
  }
  return { isValid: true }
}

// Type exports
export type StudyRecord = z.infer<typeof studyRecordSchema>
export type StudyRecordResponse = z.infer<typeof studyRecordResponseSchema>
export type CreateStudyRecord = z.infer<typeof createStudyRecordSchema>
export type UpdateStudyRecord = z.infer<typeof updateStudyRecordSchema>

// Helper functions
export const getUnderstandingLevelLabel = (level: UnderstandingLevel): string => {
  const labels = {
    excellent: '😄 バッチリ理解',
    good: '😊 できた', 
    normal: '😐 ふつう',
    struggling: '😟 ちょっと不安',
    difficult: '😥 むずかしかった'
  }
  return labels[level]
}

export const getSubjectLabel = (subject: Subject): string => {
  const labels = {
    math: '算数・数学',
    japanese: '国語',
    science: '理科',
    social: '社会',
    english: '英語',
    other: 'その他'
  }
  return labels[subject]
}

export const getStudyTypeLabel = (type: StudyType): string => {
  const labels = {
    lesson: '授業',
    homework: '宿題', 
    practice: '問題集',
    review: '復習',
    test: 'テスト',
    other: 'その他'
  }
  return labels[type]
}