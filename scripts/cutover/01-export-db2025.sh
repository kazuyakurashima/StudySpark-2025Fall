#!/usr/bin/env bash
# =============================================================================
# 01-export-db2025.sh
# DB2025 から Identity データをエクスポート
#
# Usage:
#   bash scripts/cutover/01-export-db2025.sh <DB2025_CONNECTION> <DB2025_PROJECT_REF>
#
# Output:
#   export/ ディレクトリに CSV + JSON ファイルを出力
# =============================================================================
set -euo pipefail

DB2025="${1:-}"
PROJECT_REF="${2:-}"

if [ -z "$DB2025" ] || [ -z "$PROJECT_REF" ]; then
  echo "Usage: bash scripts/cutover/01-export-db2025.sh <DB2025_CONNECTION> <DB2025_PROJECT_REF>"
  echo ""
  echo "  DB2025_CONNECTION  : PostgreSQL 接続文字列 (例: postgresql://postgres:xxx@host:5432/postgres)"
  echo "  DB2025_PROJECT_REF : Supabase プロジェクトID (例: zlipaeanhcslhintxpej)"
  exit 1
fi

EXPORT_DIR="export"
mkdir -p "$EXPORT_DIR"

echo "============================================="
echo " DB2025 Identity データ エクスポート"
echo "============================================="
echo ""
echo "接続先: $DB2025"
echo "Project Ref: $PROJECT_REF"
echo "出力先: $EXPORT_DIR/"
echo ""

# 接続テスト
echo "[1/4] 接続テスト..."
USER_COUNT=$(psql "$DB2025" -t -A -c "SELECT COUNT(*) FROM auth.users")
echo "  auth.users: ${USER_COUNT} 件"

PROFILE_COUNT=$(psql "$DB2025" -t -A -c "SELECT COUNT(*) FROM profiles")
echo "  profiles: ${PROFILE_COUNT} 件"

echo ""
read -r -p "このデータベースからエクスポートしますか？ (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "中断しました。"
  exit 0
fi

# auth.users エクスポート
echo ""
echo "[2/4] auth.users エクスポート (Supabase CLI)..."
supabase auth export --project-ref "$PROJECT_REF" > "$EXPORT_DIR/auth_users.json"
echo "  -> $EXPORT_DIR/auth_users.json"

# テーブルエクスポート
echo ""
echo "[3/4] Identity テーブルをエクスポート..."

TABLES=(profiles students parents coaches admins invitation_codes parent_child_relations coach_student_relations)

for TABLE in "${TABLES[@]}"; do
  COUNT=$(psql "$DB2025" -t -A -c "SELECT COUNT(*) FROM public.$TABLE" 2>/dev/null || echo "0")
  psql "$DB2025" -c "COPY (SELECT * FROM public.$TABLE) TO STDOUT WITH CSV HEADER" > "$EXPORT_DIR/$TABLE.csv" 2>/dev/null || true
  echo "  $TABLE: ${COUNT} 件 -> $EXPORT_DIR/$TABLE.csv"
done

# サマリー
echo ""
echo "[4/4] エクスポート完了"
echo "============================================="
echo " 出力ファイル一覧:"
ls -la "$EXPORT_DIR/"
echo ""
echo " 次のステップ:"
echo "   bash scripts/cutover/02-import-to-db2026.sh <DB2026_CONNECTION> <DB2026_PROJECT_REF>"
echo "============================================="
