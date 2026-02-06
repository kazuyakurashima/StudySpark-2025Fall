#!/usr/bin/env bash
# =============================================================================
# 03-promote-grades.sh
# 学年繰り上げ + 卒業生CSV出力
#
# 処理内容:
#   1. 卒業対象（現6年生）をCSVに出力
#   2. 5年生 → 6年生に繰り上げ
#   3. 卒業生を BAN（ban-graduated-users.ts を呼び出し）
#
# Usage:
#   bash scripts/cutover/03-promote-grades.sh <DB2026_CONNECTION>
# =============================================================================
set -euo pipefail

DB2026="${1:-}"

if [ -z "$DB2026" ]; then
  echo "Usage: bash scripts/cutover/03-promote-grades.sh <DB2026_CONNECTION>"
  exit 1
fi

EXPORT_DIR="export"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GRADUATING_CSV="$EXPORT_DIR/graduating_students_${TIMESTAMP}.csv"

echo "============================================="
echo " 学年繰り上げ + 卒業処理"
echo "============================================="
echo ""

# 現状確認
echo "[1/4] 現在の学年分布..."
psql "$DB2026" -c "SELECT grade, COUNT(*) AS student_count FROM students GROUP BY grade ORDER BY grade"
echo ""

GRADE5_COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM students WHERE grade = 5")
GRADE6_COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM students WHERE grade = 6")
echo "  5年生: ${GRADE5_COUNT} 人 → 6年生に繰り上げ"
echo "  6年生: ${GRADE6_COUNT} 人 → 卒業（BAN）"
echo ""

if [ "$GRADE6_COUNT" -eq 0 ] && [ "$GRADE5_COUNT" -eq 0 ]; then
  echo "処理対象の生徒がいません。"
  exit 0
fi

read -r -p "学年繰り上げと卒業処理を実行しますか？ (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "中断しました。"
  exit 0
fi

# 卒業対象CSV出力
echo ""
echo "[2/4] 卒業対象を CSV に出力..."
if [ "$GRADE6_COUNT" -gt 0 ]; then
  psql "$DB2026" -c "
    COPY (
      SELECT s.id, s.user_id, au.email, p.display_name
      FROM students s
      JOIN profiles p ON s.user_id = p.id
      JOIN auth.users au ON p.id = au.id
      WHERE s.grade = 6
      ORDER BY s.id
    ) TO STDOUT WITH CSV HEADER
  " > "$GRADUATING_CSV"
  LINE_COUNT=$(($(wc -l < "$GRADUATING_CSV") - 1))
  echo "  -> $GRADUATING_CSV (${LINE_COUNT} 件)"
else
  echo "  卒業対象なし（スキップ）"
fi

# 学年繰り上げ
echo ""
echo "[3/4] 学年繰り上げ..."
if [ "$GRADE5_COUNT" -gt 0 ]; then
  UPDATED=$(psql "$DB2026" -t -A -c "UPDATE students SET grade = 6 WHERE grade = 5 RETURNING id" | wc -l)
  echo "  5年生 → 6年生: ${UPDATED} 人更新"
else
  echo "  5年生なし（スキップ）"
fi

# 卒業処理（BAN）
echo ""
echo "[4/4] 卒業生 BAN 処理..."
if [ "$GRADE6_COUNT" -gt 0 ] && [ -f "$GRADUATING_CSV" ]; then
  echo "  以下のコマンドで BAN を実行してください:"
  echo ""
  echo "    npx tsx scripts/ban-graduated-users.ts $GRADUATING_CSV"
  echo ""
  echo "  (--dry-run で事前確認も可能)"
  echo "    npx tsx scripts/ban-graduated-users.ts $GRADUATING_CSV --dry-run"
else
  echo "  卒業対象なし（スキップ）"
fi

echo ""
echo "============================================="
echo " 学年繰り上げ完了。更新後の分布:"
psql "$DB2026" -c "SELECT grade, COUNT(*) AS student_count FROM students GROUP BY grade ORDER BY grade"
echo ""
echo " 次のステップ:"
echo "   1. (BAN実行) npx tsx scripts/ban-graduated-users.ts $GRADUATING_CSV"
echo "   2. (検証) bash scripts/cutover/04-verify-integrity.sh <DB2026_CONNECTION>"
echo "============================================="
