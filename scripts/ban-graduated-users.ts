/**
 * 卒業生ユーザー無効化（BAN）スクリプト
 *
 * 小6の卒業生をログイン不可にする。
 * データは保持し、auth.users を BAN 状態にする。
 *
 * 実行方法:
 *   npx tsx scripts/ban-graduated-users.ts <csv_file>
 *
 * CSV形式（cutover_runbook.md Phase 2 で出力）:
 *   id,user_id,email,display_name
 *   1,abc-123,hikaru6@studyspark.local,星野 光
 *
 * オプション:
 *   --dry-run  実際にはBANせず、対象を表示するのみ
 *   --force    確認プロンプトをスキップ
 *
 * 補足:
 *   - BAN は Supabase Auth の ban_duration で実装（"100y" = 100年、公式ドキュメント例に準拠）
 *   - BAN 解除は Supabase ダッシュボードから実施（Auth > Users > 対象ユーザー > Unban）
 *   - API での解除: supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
 *     ※ 上記 API 解除は計画上「未検証」のため、本番ではダッシュボード経由を推奨
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { parse } from 'csv-parse/sync'

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing required environment variables')
  console.error('Please set:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// BAN期間: 876000時間 ≈ 100年（GoTrue は "y" 非対応、Go time.ParseDuration 形式で指定）
const BAN_DURATION = '876000h'

const REQUIRED_COLUMNS = ['user_id'] as const

interface GraduatingStudent {
  id: string
  user_id: string
  email?: string
  display_name?: string
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const flags = process.argv.slice(2).filter(a => a.startsWith('--'))
  const dryRun = flags.includes('--dry-run')
  const force = flags.includes('--force')

  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/ban-graduated-users.ts <csv_file> [--dry-run] [--force]')
    console.error('Example: npx tsx scripts/ban-graduated-users.ts graduating_students_20260201.csv')
    process.exit(1)
  }

  const csvPath = args[0]

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: File not found: ${csvPath}`)
    process.exit(1)
  }

  console.log('='.repeat(60))
  console.log('卒業生ユーザー無効化（BAN）スクリプト')
  console.log('='.repeat(60))
  console.log(`CSV: ${csvPath}`)
  console.log(`Supabase: ${supabaseUrl}`)
  console.log(`Mode: ${dryRun ? 'DRY-RUN（実際にはBANしません）' : 'EXECUTE'}`)
  console.log('='.repeat(60))

  // CSV読み込み
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records: GraduatingStudent[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  })

  console.log(`\n📋 対象: ${records.length} 名`)

  if (records.length === 0) {
    console.log('対象者がいません。終了します。')
    return
  }

  // CSVカラム検証
  if (records.length > 0) {
    const firstRecord = records[0]
    const missingColumns = REQUIRED_COLUMNS.filter(col => !(col in firstRecord))
    if (missingColumns.length > 0) {
      console.error(`\n❌ CSV に必須カラムがありません: ${missingColumns.join(', ')}`)
      console.error(`期待するカラム: ${REQUIRED_COLUMNS.join(', ')}`)
      process.exit(1)
    }

    // 空値チェック
    const invalidRecords = records.filter(r => !r.user_id)
    if (invalidRecords.length > 0) {
      console.error(`\n❌ user_id が空のレコードが ${invalidRecords.length} 件あります`)
      invalidRecords.forEach(r => console.error(`  - id: ${r.id || '(空)'}`))
      process.exit(1)
    }
  }

  // 対象者一覧表示
  console.log('\n以下のユーザーをBANします:')
  records.forEach((r, i) => {
    const label = r.display_name || r.email || r.user_id
    console.log(`  ${i + 1}. ${label} [user_id: ${r.user_id}]`)
  })

  // 確認プロンプト
  if (!force && !dryRun) {
    console.log('\n⚠️  この操作は対象ユーザーのログインを無効化します。')
    console.log('⚠️  BAN解除はSupabaseダッシュボードから可能です。')
    console.log('\n続行するには Enter キーを押してください（CTRL+C で中断）...')

    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve())
    })
  }

  // BAN実行
  let successCount = 0
  let failureCount = 0
  const failures: { email: string; error: string }[] = []

  for (const student of records) {
    const label = student.display_name || student.email || student.user_id
    process.stdout.write(`  BAN: ${label}... `)

    if (dryRun) {
      console.log('[dry-run] スキップ')
      successCount++
      continue
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(student.user_id, {
        ban_duration: BAN_DURATION
      })

      if (error) {
        console.log(`❌ ${error.message}`)
        failureCount++
        failures.push({ email: student.email || student.user_id, error: error.message })
      } else {
        console.log('✓')
        successCount++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`❌ ${message}`)
      failureCount++
      failures.push({ email: student.email || student.user_id, error: message })
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60))
  console.log('結果')
  console.log('='.repeat(60))
  console.log(`✅ BAN完了: ${successCount} 名`)
  console.log(`❌ 失敗: ${failureCount} 名`)

  if (failures.length > 0) {
    console.log('\n❌ 失敗一覧:')
    failures.forEach(f => {
      console.log(`  - ${f.email}: ${f.error}`)
    })
  }

  if (dryRun) {
    console.log('\n[dry-run] 実際にはBANされていません。')
  }

  console.log('\n✨ 完了')
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
