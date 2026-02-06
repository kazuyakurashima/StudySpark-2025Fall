#!/usr/bin/env bash
# =============================================================================
# 02-import-to-db2026.sh
# DB2026 に Identity データをインポート
#
# 前提:
#   - 01-export-db2025.sh が完了し、export/ に CSV + JSON がある
#   - DB2026 にスキーマ（マイグレーション）が適用済み
#   - DB2026 のマスタデータ（seed.sql, problem_counts）は投入済み
#
# Usage:
#   bash scripts/cutover/02-import-to-db2026.sh <DB2026_CONNECTION> <DB2026_PROJECT_REF>
# =============================================================================
set -euo pipefail

DB2026="${1:-}"
PROJECT_REF="${2:-}"

if [ -z "$DB2026" ] || [ -z "$PROJECT_REF" ]; then
  echo "Usage: bash scripts/cutover/02-import-to-db2026.sh <DB2026_CONNECTION> <DB2026_PROJECT_REF>"
  echo ""
  echo "  DB2026_CONNECTION  : PostgreSQL 接続文字列"
  echo "  DB2026_PROJECT_REF : Supabase プロジェクトID (例: maklmjcaweneykwagqbv)"
  exit 1
fi

EXPORT_DIR="export"

# ファイル存在チェック
echo "============================================="
echo " DB2026 Identity データ インポート"
echo "============================================="
echo ""
echo "接続先: $DB2026"
echo "ソース: $EXPORT_DIR/"
echo ""

REQUIRED_FILES=(auth_users.json profiles.csv students.csv parents.csv coaches.csv admins.csv invitation_codes.csv parent_child_relations.csv coach_student_relations.csv)
MISSING=0
for F in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$EXPORT_DIR/$F" ]; then
    echo "  [MISSING] $EXPORT_DIR/$F"
    MISSING=1
  fi
done
if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Error: エクスポートファイルが不足しています。先に 01-export-db2025.sh を実行してください。"
  exit 1
fi
echo "  全ファイル確認OK"

# DB2026 の現状確認
echo ""
echo "[1/6] DB2026 の現状確認..."
EXISTING_PROFILES=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM profiles")
EXISTING_STUDENTS=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM students")
EXISTING_AUTH=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM auth.users")
echo "  auth.users: ${EXISTING_AUTH} 件"
echo "  profiles: ${EXISTING_PROFILES} 件"
echo "  students: ${EXISTING_STUDENTS} 件"

if [ "$EXISTING_PROFILES" -gt 0 ] || [ "$EXISTING_STUDENTS" -gt 0 ]; then
  echo ""
  echo "  WARNING: DB2026 に既存データがあります。インポート前にクリーンアップします。"
fi

echo ""
read -r -p "DB2026 にインポートを開始しますか？（既存の Identity データは削除されます） (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "中断しました。"
  exit 0
fi

# Step 1: クリーンアップ
echo ""
echo "[2/6] DB2026 クリーンアップ..."
psql "$DB2026" -c "
  DELETE FROM public.coach_student_relations;
  DELETE FROM public.parent_child_relations;
  DELETE FROM public.invitation_codes;
  DELETE FROM public.admins;
  DELETE FROM public.coaches;
  DELETE FROM public.parents;
  DELETE FROM public.students;
  DELETE FROM public.profiles;
"
echo "  public テーブル クリーンアップ完了"

# auth.users もクリーンアップ（テストユーザーがいる場合）
if [ "$EXISTING_AUTH" -gt 0 ]; then
  echo "  auth.users クリーンアップ中..."
  psql "$DB2026" -c "DELETE FROM auth.users"
  echo "  auth.users クリーンアップ完了"
fi

# Step 2: auth.users インポート
echo ""
echo "[3/6] auth.users インポート (Supabase CLI)..."
supabase auth import --project-ref "$PROJECT_REF" < "$EXPORT_DIR/auth_users.json"
IMPORTED_AUTH=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM auth.users")
echo "  auth.users: ${IMPORTED_AUTH} 件インポート完了"

# auto-created profiles を削除
AUTO_PROFILES=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM profiles")
if [ "$AUTO_PROFILES" -gt 0 ]; then
  echo "  自動生成された profiles を削除 (${AUTO_PROFILES} 件)..."
  psql "$DB2026" -c "DELETE FROM profiles"
fi

# Step 3: profiles 系テーブルインポート (FK順序を守る)
echo ""
echo "[4/6] Identity テーブルをインポート..."

# Phase A: profiles (auth.users に依存)
psql "$DB2026" -c "COPY profiles FROM STDIN WITH CSV HEADER" < "$EXPORT_DIR/profiles.csv"
COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM profiles")
echo "  profiles: ${COUNT} 件"

# Phase B: role テーブル (profiles に依存)
for TABLE in students parents coaches admins; do
  psql "$DB2026" -c "COPY $TABLE FROM STDIN WITH CSV HEADER" < "$EXPORT_DIR/$TABLE.csv"
  COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM $TABLE")
  echo "  $TABLE: ${COUNT} 件"
done

# Phase C: invitation_codes (profiles に依存)
psql "$DB2026" -c "COPY invitation_codes FROM STDIN WITH CSV HEADER" < "$EXPORT_DIR/invitation_codes.csv"
COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM invitation_codes")
echo "  invitation_codes: ${COUNT} 件"

# Phase D: リレーションテーブル (students/parents/coaches に依存)
for TABLE in parent_child_relations coach_student_relations; do
  psql "$DB2026" -c "COPY $TABLE FROM STDIN WITH CSV HEADER" < "$EXPORT_DIR/$TABLE.csv"
  COUNT=$(psql "$DB2026" -t -A -c "SELECT COUNT(*) FROM $TABLE")
  echo "  $TABLE: ${COUNT} 件"
done

# Step 4: シーケンス更新
echo ""
echo "[5/6] BIGSERIAL シーケンスを更新..."
SEQUENCES=(
  "students_id_seq:students"
  "parents_id_seq:parents"
  "coaches_id_seq:coaches"
  "admins_id_seq:admins"
  "invitation_codes_id_seq:invitation_codes"
  "parent_child_relations_id_seq:parent_child_relations"
  "coach_student_relations_id_seq:coach_student_relations"
)

for SEQ_TABLE in "${SEQUENCES[@]}"; do
  SEQ="${SEQ_TABLE%%:*}"
  TABLE="${SEQ_TABLE##*:}"
  NEXT_VAL=$(psql "$DB2026" -t -A -c "SELECT setval('${SEQ}', COALESCE((SELECT MAX(id) FROM ${TABLE}), 0), true)")
  echo "  $SEQ -> $NEXT_VAL"
done

# サマリー
echo ""
echo "[6/6] インポート完了"
echo "============================================="
echo " DB2026 データ件数:"
echo ""
psql "$DB2026" -c "
  SELECT 'auth.users' AS table_name, COUNT(*) FROM auth.users
  UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
  UNION ALL SELECT 'students', COUNT(*) FROM students
  UNION ALL SELECT 'parents', COUNT(*) FROM parents
  UNION ALL SELECT 'coaches', COUNT(*) FROM coaches
  UNION ALL SELECT 'admins', COUNT(*) FROM admins
  UNION ALL SELECT 'invitation_codes', COUNT(*) FROM invitation_codes
  UNION ALL SELECT 'parent_child_relations', COUNT(*) FROM parent_child_relations
  UNION ALL SELECT 'coach_student_relations', COUNT(*) FROM coach_student_relations
  ORDER BY table_name;
"
echo ""
echo " 次のステップ:"
echo "   bash scripts/cutover/03-promote-grades.sh <DB2026_CONNECTION>"
echo "============================================="
