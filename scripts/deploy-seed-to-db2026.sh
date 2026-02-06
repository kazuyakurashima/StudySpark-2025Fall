#!/bin/bash

# =============================================================================
# DB2026 へのマスタデータ投入スクリプト
# 実行方法: bash scripts/deploy-seed-to-db2026.sh <DB2026_CONNECTION_STRING>
# =============================================================================

set -e  # エラー時に即座に終了

# 引数チェック
if [ $# -eq 0 ]; then
  echo "Usage: bash scripts/deploy-seed-to-db2026.sh <DB2026_CONNECTION_STRING>"
  echo ""
  echo "Example:"
  echo "  bash scripts/deploy-seed-to-db2026.sh 'postgresql://postgres.xxxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'"
  exit 1
fi

CONNECTION_STRING=$1

echo "============================================================"
echo "DB2026 マスタデータ投入"
echo "============================================================"
echo "Target: $CONNECTION_STRING"
echo ""
echo "⚠️  この操作は DB2026 にマスタデータを投入します。"
echo "⚠️  正しいデータベースに接続していることを確認してください。"
echo ""
read -p "続行しますか？ (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ 中止しました。"
  exit 0
fi

echo ""
echo "📦 supabase/seed.sql を投入します..."
echo ""

# seed.sql を実行
psql "$CONNECTION_STRING" -f supabase/seed.sql

echo ""
echo "============================================================"
echo "✅ マスタデータ投入完了"
echo "============================================================"
echo ""
echo "投入されたデータ:"
echo "  - subjects: 4件"
echo "  - test_types: 3件"
echo "  - test_schedules: 17件"
echo "  - study_sessions: 38件（5年20回、6年18回）"
echo "  - study_content_types: 約50件"
echo ""

# 確認クエリを実行
echo "📊 データ件数確認:"
echo ""

psql "$CONNECTION_STRING" -c "SELECT 'subjects' AS table_name, COUNT(*) FROM subjects UNION ALL SELECT 'test_types', COUNT(*) FROM test_types UNION ALL SELECT 'test_schedules', COUNT(*) FROM test_schedules UNION ALL SELECT 'study_sessions', COUNT(*) FROM study_sessions UNION ALL SELECT 'study_content_types', COUNT(*) FROM study_content_types ORDER BY table_name;"

echo ""
echo "============================================================"
echo "✅ 投入完了"
echo "============================================================"
