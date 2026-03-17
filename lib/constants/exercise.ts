/**
 * 演習問題集の共通定数
 *
 * サーバー（exercise-reflection.ts）とクライアント（exercise-input.tsx）の
 * 両方からインポートし、値のドリフトを防止する。
 * DB トリガー（20260316000004_add_reflection_limit_trigger.sql）にも
 * 同じ値をハードコードしているため、変更時は3箇所を更新すること。
 */

/** セクションあたりの振り返り上限（question_set 横断） */
export const MAX_REFLECTIONS = 2
