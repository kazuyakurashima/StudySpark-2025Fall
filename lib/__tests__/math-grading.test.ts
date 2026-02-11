// ============================================================================
// 算数自動採点 — 採点ロジック単体テスト
// ============================================================================
// 計画書: docs/poc-auto-grading/01_Math-AutoGrading-Plan.md Section 9 Step 3

import { describe, it, expect } from 'vitest'
import {
  normalizeNumeric,
  gradeAnswer,
  sanitizeNumericInput,
  shuffleWithSeed,
} from '@/lib/math-grading'

// ============================================================
// normalizeNumeric
// ============================================================
describe('normalizeNumeric', () => {
  it('整数をそのまま返す', () => {
    expect(normalizeNumeric('42')).toBe('42')
  })

  it('先頭ゼロを除去する', () => {
    expect(normalizeNumeric('042')).toBe('42')
  })

  it('末尾ゼロを除去する', () => {
    expect(normalizeNumeric('3.50')).toBe('3.5')
  })

  it('小数をそのまま返す', () => {
    expect(normalizeNumeric('3.14')).toBe('3.14')
  })

  it('負数を処理する', () => {
    expect(normalizeNumeric('-7')).toBe('-7')
  })

  it('負の小数を処理する', () => {
    expect(normalizeNumeric('-3.14')).toBe('-3.14')
  })

  it('ゼロをそのまま返す', () => {
    expect(normalizeNumeric('0')).toBe('0')
  })

  it('"0.0" を "0" に正規化する', () => {
    expect(normalizeNumeric('0.0')).toBe('0')
  })

  it('前後の空白をトリムする', () => {
    expect(normalizeNumeric('  42  ')).toBe('42')
  })

  it('科学記数法を拒否する', () => {
    expect(normalizeNumeric('1e2')).toBeNull()
  })

  it('空文字を拒否する', () => {
    expect(normalizeNumeric('')).toBeNull()
  })

  it('空白のみを拒否する', () => {
    expect(normalizeNumeric('   ')).toBeNull()
  })

  it('非数値文字列を拒否する', () => {
    expect(normalizeNumeric('abc')).toBeNull()
  })

  it('数字混じりの文字列を拒否する', () => {
    expect(normalizeNumeric('12abc')).toBeNull()
  })

  it('複数ピリオドを拒否する', () => {
    expect(normalizeNumeric('3.1.4')).toBeNull()
  })

  it('"42.0" を "42" に正規化する', () => {
    expect(normalizeNumeric('42.0')).toBe('42')
  })

  it('"00042" を "42" に正規化する', () => {
    expect(normalizeNumeric('00042')).toBe('42')
  })

  it('".5" を "0.5" に正規化する', () => {
    expect(normalizeNumeric('.5')).toBe('0.5')
  })
})

// ============================================================
// gradeAnswer — numeric
// ============================================================
describe('gradeAnswer (numeric)', () => {
  it('正解を判定する', () => {
    const result = gradeAnswer('numeric', '42', '42', null)
    expect(result).toEqual({ answerValue: '42', isCorrect: true })
  })

  it('不正解を判定する', () => {
    const result = gradeAnswer('numeric', '43', '42', null)
    expect(result).toEqual({ answerValue: '43', isCorrect: false })
  })

  it('表記ゆれ: "42.0" vs "42" → 正解', () => {
    const result = gradeAnswer('numeric', '42.0', '42', null)
    expect(result).toEqual({ answerValue: '42', isCorrect: true })
  })

  it('表記ゆれ: "042" vs "42" → 正解', () => {
    const result = gradeAnswer('numeric', '042', '42', null)
    expect(result).toEqual({ answerValue: '42', isCorrect: true })
  })

  it('非数値入力 → 不正解（rawInputをtrimして返す）', () => {
    const result = gradeAnswer('numeric', 'abc', '42', null)
    expect(result).toEqual({ answerValue: 'abc', isCorrect: false })
  })

  it('小数の正解を判定する', () => {
    const result = gradeAnswer('numeric', '3.14', '3.14', null)
    expect(result).toEqual({ answerValue: '3.14', isCorrect: true })
  })

  it('負数の正解を判定する', () => {
    const result = gradeAnswer('numeric', '-7', '-7', null)
    expect(result).toEqual({ answerValue: '-7', isCorrect: true })
  })
})

// ============================================================
// gradeAnswer — fraction
// ============================================================
describe('gradeAnswer (fraction)', () => {
  it('正解を判定する', () => {
    const result = gradeAnswer('fraction', '3/4', '3/4', null)
    expect(result).toEqual({ answerValue: '3/4', isCorrect: true })
  })

  it('不正解を判定する', () => {
    const result = gradeAnswer('fraction', '3/5', '3/4', null)
    expect(result).toEqual({ answerValue: '3/5', isCorrect: false })
  })

  it('分母ゼロ → 不正解', () => {
    const result = gradeAnswer('fraction', '3/0', '3/4', null)
    expect(result).toEqual({ answerValue: '3/0', isCorrect: false })
  })

  it('前後の空白をトリムして比較する', () => {
    const result = gradeAnswer('fraction', '  3/4  ', '3/4', null)
    expect(result).toEqual({ answerValue: '3/4', isCorrect: true })
  })

  it('通分なし: "2/4" vs "1/2" → 不正解（完全一致比較）', () => {
    const result = gradeAnswer('fraction', '2/4', '1/2', null)
    expect(result).toEqual({ answerValue: '2/4', isCorrect: false })
  })
})

// ============================================================
// gradeAnswer — multi_part
// ============================================================
describe('gradeAnswer (multi_part)', () => {
  const config = {
    correct_values: { A: '14', B: '11' },
    slots: [{ label: 'A' }, { label: 'B' }],
    template: 'Aは{A}個、Bは{B}個',
  }

  it('全正解を判定する', () => {
    const result = gradeAnswer(
      'multi_part',
      '{"A":"14","B":"11"}',
      null,
      config
    )
    expect(result.isCorrect).toBe(true)
    expect(JSON.parse(result.answerValue)).toEqual({ A: '14', B: '11' })
  })

  it('部分正解 → 不正解（all-or-nothing）', () => {
    const result = gradeAnswer(
      'multi_part',
      '{"A":"14","B":"99"}',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('全不正解 → 不正解', () => {
    const result = gradeAnswer(
      'multi_part',
      '{"A":"99","B":"88"}',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('JSON不正 → 不正解', () => {
    const result = gradeAnswer('multi_part', 'invalid json', null, config)
    expect(result.isCorrect).toBe(false)
    expect(result.answerValue).toBe('invalid json')
  })

  it('表記ゆれ: "014" vs "14" → 正解（normalizeNumericで正規化）', () => {
    const result = gradeAnswer(
      'multi_part',
      '{"A":"014","B":"11"}',
      null,
      config
    )
    expect(result.isCorrect).toBe(true)
  })

  it('スロット欠損 → 不正解', () => {
    const result = gradeAnswer(
      'multi_part',
      '{"A":"14"}',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('正規化済みのanswerValueを返す', () => {
    const result = gradeAnswer(
      'multi_part',
      '{"A":"014","B":"011.0"}',
      null,
      config
    )
    const parsed = JSON.parse(result.answerValue)
    expect(parsed.A).toBe('14')
    expect(parsed.B).toBe('11')
  })
})

// ============================================================
// gradeAnswer — selection
// ============================================================
describe('gradeAnswer (selection)', () => {
  const config = {
    correct_values: ['3', '7', '11'],
    dummy_values: ['5', '9', '13'],
  }

  it('完全一致 → 正解', () => {
    const result = gradeAnswer(
      'selection',
      '["3","7","11"]',
      null,
      config
    )
    expect(result.isCorrect).toBe(true)
  })

  it('順序違い → 正解（ソートして比較）', () => {
    const result = gradeAnswer(
      'selection',
      '["11","3","7"]',
      null,
      config
    )
    expect(result.isCorrect).toBe(true)
  })

  it('過剰選択 → 不正解', () => {
    const result = gradeAnswer(
      'selection',
      '["3","7","11","5"]',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('不足選択 → 不正解', () => {
    const result = gradeAnswer(
      'selection',
      '["3","7"]',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('空選択 → 不正解', () => {
    const result = gradeAnswer(
      'selection',
      '[]',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('重複値 → 重複除去して判定', () => {
    const result = gradeAnswer(
      'selection',
      '["3","7","11","3"]',
      null,
      config
    )
    expect(result.isCorrect).toBe(true)
  })

  it('JSON不正 → 不正解', () => {
    const result = gradeAnswer(
      'selection',
      'not json',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('配列でないJSON → 不正解', () => {
    const result = gradeAnswer(
      'selection',
      '{"a":"b"}',
      null,
      config
    )
    expect(result.isCorrect).toBe(false)
  })

  it('正規化済みのanswerValueはソート済み配列', () => {
    const result = gradeAnswer(
      'selection',
      '["11","3","7"]',
      null,
      config
    )
    expect(JSON.parse(result.answerValue)).toEqual(['11', '3', '7'])
  })

  it('テキスト選択: 正解を判定する', () => {
    const textConfig = {
      correct_values: ['金曜日'],
      dummy_values: ['月曜日', '火曜日', '水曜日', '木曜日', '土曜日', '日曜日'],
    }
    const result = gradeAnswer(
      'selection',
      '["金曜日"]',
      null,
      textConfig
    )
    expect(result.isCorrect).toBe(true)
  })
})

// ============================================================
// sanitizeNumericInput
// ============================================================
describe('sanitizeNumericInput', () => {
  it('全角数字を半角に変換する', () => {
    expect(sanitizeNumericInput('１２３')).toBe('123')
  })

  it('全角マイナスを半角に変換する', () => {
    expect(sanitizeNumericInput('−7')).toBe('-7')
  })

  it('長音記号(ー)を半角マイナスに変換する', () => {
    expect(sanitizeNumericInput('ー7')).toBe('-7')
  })

  it('全角ピリオドを半角に変換する', () => {
    expect(sanitizeNumericInput('３．１４')).toBe('3.14')
  })

  it('全角句点(。)を半角ピリオドに変換する', () => {
    expect(sanitizeNumericInput('3。14')).toBe('3.14')
  })

  it('不正文字を除去する', () => {
    expect(sanitizeNumericInput('12abc34')).toBe('1234')
  })

  it('先頭以外のマイナスを除去する', () => {
    expect(sanitizeNumericInput('-3-4')).toBe('-34')
  })

  it('2つ目以降のピリオドを除去する', () => {
    expect(sanitizeNumericInput('3.1.4')).toBe('3.14')
  })

  it('空白を除去する', () => {
    expect(sanitizeNumericInput('1 2 3')).toBe('123')
  })

  it('複合ケース: 全角+不正文字', () => {
    expect(sanitizeNumericInput('−１２．３abc')).toBe('-12.3')
  })

  it('空文字をそのまま返す', () => {
    expect(sanitizeNumericInput('')).toBe('')
  })
})

// ============================================================
// shuffleWithSeed
// ============================================================
describe('shuffleWithSeed', () => {
  const input = ['a', 'b', 'c', 'd', 'e']

  it('同一seedで同一結果を返す', () => {
    const result1 = shuffleWithSeed(input, 42)
    const result2 = shuffleWithSeed(input, 42)
    expect(result1).toEqual(result2)
  })

  it('異なるseedで異なる結果を返す', () => {
    const result1 = shuffleWithSeed(input, 42)
    const result2 = shuffleWithSeed(input, 99)
    expect(result1).not.toEqual(result2)
  })

  it('元の配列を変更しない', () => {
    const original = [...input]
    shuffleWithSeed(input, 42)
    expect(input).toEqual(original)
  })

  it('同じ要素数を返す', () => {
    const result = shuffleWithSeed(input, 42)
    expect(result).toHaveLength(input.length)
  })

  it('同じ要素を含む', () => {
    const result = shuffleWithSeed(input, 42)
    expect(result.sort()).toEqual([...input].sort())
  })

  it('空配列を処理できる', () => {
    expect(shuffleWithSeed([], 42)).toEqual([])
  })

  it('1要素配列をそのまま返す', () => {
    expect(shuffleWithSeed(['a'], 42)).toEqual(['a'])
  })

  it('question_id をシードに使って確定的な順序を返す', () => {
    const options = ['3', '5', '7', '9', '11', '13']
    const questionId = 123
    const result1 = shuffleWithSeed(options, questionId)
    const result2 = shuffleWithSeed(options, questionId)
    expect(result1).toEqual(result2)
  })
})
