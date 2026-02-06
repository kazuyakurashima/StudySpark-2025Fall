#!/usr/bin/env bash
# =============================================================================
# 04-verify-integrity.sh
# DB2026 の整合性チェック
#
# チェック項目:
#   1. テーブル件数の確認
#   2. FK 整合性チェック（孤立レコード検出）
#   3. マスタデータの確認
#   4. 学年分布の確認
#
# Usage:
#   bash scripts/cutover/04-verify-integrity.sh <DB2026_CONNECTION>
# =============================================================================
set -euo pipefail

DB2026="${1:-}"

if [ -z "$DB2026" ]; then
  echo "Usage: bash scripts/cutover/04-verify-integrity.sh <DB2026_CONNECTION>"
  exit 1
fi

echo "============================================="
echo " DB2026 整合性チェック"
echo "============================================="
echo ""

ERRORS=0

# 1. テーブル件数
echo "[1/5] テーブル件数..."
psql "$DB2026" -c "
  SELECT 'auth.users' AS table_name, COUNT(*) FROM auth.users
  UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
  UNION ALL SELECT 'students', COUNT(*) FROM students
  UNION ALL SELECT 'parents', COUNT(*) FROM parents
  UNION ALL SELECT 'coaches', COUNT(*) FROM coaches
  UNION ALL SELECT 'admins', COUNT(*) FROM admins
  UNION ALL SELECT 'parent_child_relations', COUNT(*) FROM parent_child_relations
  UNION ALL SELECT 'coach_student_relations', COUNT(*) FROM coach_student_relations
  ORDER BY table_name;
"

# 2. auth.users と profiles の件数一致
echo "[2/5] auth.users - profiles 整合性..."
AUTH_COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM auth.users")
PROFILE_COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM profiles")
if [ "$AUTH_COUNT" -eq "$PROFILE_COUNT" ]; then
  echo "  OK: auth.users ($AUTH_COUNT) = profiles ($PROFILE_COUNT)"
else
  echo "  ERROR: auth.users ($AUTH_COUNT) != profiles ($PROFILE_COUNT)"
  ERRORS=$((ERRORS + 1))
fi

# profiles に auth.users がないレコード
ORPHAN_PROFILES=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM profiles WHERE id NOT IN (SELECT id FROM auth.users)")
if [ "$ORPHAN_PROFILES" -gt 0 ]; then
  echo "  ERROR: 孤立 profiles: $ORPHAN_PROFILES 件 (auth.users に存在しない)"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: 孤立 profiles なし"
fi

# 3. FK 整合性チェック
echo ""
echo "[3/5] FK 整合性チェック..."

# students -> profiles
ORPHAN=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM students WHERE user_id NOT IN (SELECT id FROM profiles)")
if [ "$ORPHAN" -gt 0 ]; then
  echo "  ERROR: 孤立 students: $ORPHAN 件 (profiles に存在しない user_id)"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: students -> profiles"
fi

# parents -> profiles
ORPHAN=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM parents WHERE user_id NOT IN (SELECT id FROM profiles)")
if [ "$ORPHAN" -gt 0 ]; then
  echo "  ERROR: 孤立 parents: $ORPHAN 件"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: parents -> profiles"
fi

# parent_child_relations -> parents, students
ORPHAN_P=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM parent_child_relations WHERE parent_id NOT IN (SELECT id FROM parents)")
ORPHAN_S=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM parent_child_relations WHERE student_id NOT IN (SELECT id FROM students)")
if [ "$ORPHAN_P" -gt 0 ] || [ "$ORPHAN_S" -gt 0 ]; then
  echo "  ERROR: 孤立 parent_child_relations: parent=$ORPHAN_P, student=$ORPHAN_S"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: parent_child_relations -> parents, students"
fi

# coach_student_relations -> coaches, students
ORPHAN_C=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM coach_student_relations WHERE coach_id NOT IN (SELECT id FROM coaches)")
ORPHAN_S=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM coach_student_relations WHERE student_id NOT IN (SELECT id FROM students)")
if [ "$ORPHAN_C" -gt 0 ] || [ "$ORPHAN_S" -gt 0 ]; then
  echo "  ERROR: 孤立 coach_student_relations: coach=$ORPHAN_C, student=$ORPHAN_S"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK: coach_student_relations -> coaches, students"
fi

# 4. マスタデータ確認
echo ""
echo "[4/5] マスタデータ件数..."
psql "$DB2026" -c "
  SELECT 'subjects' AS table_name, COUNT(*) FROM subjects
  UNION ALL SELECT 'study_sessions', COUNT(*) FROM study_sessions
  UNION ALL SELECT 'study_content_types', COUNT(*) FROM study_content_types
  UNION ALL SELECT 'problem_counts', COUNT(*) FROM problem_counts
  UNION ALL SELECT 'test_types', COUNT(*) FROM test_types
  UNION ALL SELECT 'test_schedules', COUNT(*) FROM test_schedules
  ORDER BY table_name;
"

# 5. 学年分布
echo "[5/5] 学年分布..."
psql "$DB2026" -c "SELECT grade, COUNT(*) AS student_count FROM students GROUP BY grade ORDER BY grade"

# roles 分布
echo "ロール分布..."
psql "$DB2026" -c "SELECT role, COUNT(*) FROM profiles GROUP BY role ORDER BY role"

# 結果
echo ""
echo "============================================="
if [ "$ERRORS" -eq 0 ]; then
  echo " RESULT: ALL CHECKS PASSED"
else
  echo " RESULT: $ERRORS ERRORS FOUND"
  echo " 上記のエラーを確認してください。"
fi
echo "============================================="

exit "$ERRORS"
