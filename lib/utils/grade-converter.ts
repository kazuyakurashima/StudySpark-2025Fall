/**
 * 学年表記の変換ユーティリティ
 *
 * students テーブルの grade (数値: 5 | 6) と
 * assessment_masters テーブルの grade (文字列: '5年' | '6年') の
 * 相互変換を行います。
 *
 * 不正な値が渡された場合は null を返し、コンソールに警告を出力します。
 * システムがクラッシュせず、graceful degradation できるようにするための設計です。
 */

/**
 * 数値学年を文字列学年に変換
 *
 * @param grade - 学年 (5 | 6 | null | undefined)
 * @returns '5年' | '6年' | null
 *
 * @example
 * gradeToString(5) // => '5年'
 * gradeToString(6) // => '6年'
 * gradeToString(null) // => null (警告あり)
 * gradeToString(7) // => null (警告あり)
 */
export function gradeToString(
  grade: number | null | undefined
): '5年' | '6年' | null {
  if (grade === 5) return '5年'
  if (grade === 6) return '6年'

  console.warn(
    `[gradeToString] Invalid grade: ${grade}. Expected 5 or 6. Returning null.`
  )
  return null
}

/**
 * 文字列学年を数値学年に変換
 *
 * @param gradeStr - 学年文字列 ('5年' | '6年' | null | undefined)
 * @returns 5 | 6 | null
 *
 * @example
 * gradeToNumber('5年') // => 5
 * gradeToNumber('6年') // => 6
 * gradeToNumber(null) // => null (警告あり)
 * gradeToNumber('7年') // => null (警告あり)
 */
export function gradeToNumber(
  gradeStr: string | null | undefined
): 5 | 6 | null {
  if (gradeStr === '5年') return 5
  if (gradeStr === '6年') return 6

  console.warn(
    `[gradeToNumber] Invalid grade string: ${gradeStr}. Expected '5年' or '6年'. Returning null.`
  )
  return null
}

/**
 * テスト種別と回数から表示用タイトルを生成
 *
 * @param assessmentType - テスト種別 ('math_print' | 'kanji_test')
 * @param attemptNumber - 回数 (1 | 2)
 * @returns 表示用タイトル
 *
 * @example
 * getAssessmentTitle('math_print', 1) // => '算数プリント 1回目'
 * getAssessmentTitle('math_print', 2) // => '算数プリント 2回目'
 * getAssessmentTitle('kanji_test', 1) // => '漢字テスト'
 */
export function getAssessmentTitle(
  assessmentType: 'math_print' | 'kanji_test',
  attemptNumber: number
): string {
  if (assessmentType === 'math_print') {
    return `算数プリント ${attemptNumber}回目`
  }
  return '漢字テスト'
}
