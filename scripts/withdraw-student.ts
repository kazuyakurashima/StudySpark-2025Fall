/**
 * 退塾処理スクリプト
 *
 * 退塾する生徒のリレーション（coach_student_relations / parent_child_relations）を
 * バックアップ・削除し、auth.users を BAN してログイン不可にする。
 * 学習履歴等のデータは保持される（ソフト退塾）。
 *
 * 実行方法:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/withdraw-student.ts <login_id> [--dry-run] [--force]
 *
 * 例:
 *   npx tsx scripts/withdraw-student.ts hana6 --dry-run
 *   npx tsx scripts/withdraw-student.ts hana6 --force
 *
 * オプション:
 *   --dry-run  実際には変更せず、対象を表示するのみ
 *   --force    確認プロンプトをスキップ
 *
 * 復元手順（必要な場合）:
 *   1. バックアップファイルを確認: scripts/backups/withdrawn_<login_id>_<YYYYMMDD_HHMM>.json
 *   2. ファイル内の restore_sql の INSERT 文を SQL Editor で実行
 *   3. BAN 解除: Supabase Dashboard > Auth > Users > 対象ユーザー > Unban
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

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

// BAN期間: 876000時間 ≈ 100年（GoTrue は "y" 非対応、Go time.ParseDuration 形式）
const BAN_DURATION = '876000h'

interface StudentInfo {
  id: number
  user_id: string
  login_id: string
  full_name: string
  grade: number
  course: string
}

function getTimestamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}_${h}${min}`
}

async function findStudent(loginId: string): Promise<StudentInfo | null> {
  // login_id で検索
  const { data, error } = await supabase
    .from('students')
    .select('id, user_id, login_id, full_name, grade, course')
    .eq('login_id', loginId)
    .single()

  if (error && error.code === 'PGRST116') {
    // 見つからない場合
    return null
  }
  if (error) {
    throw new Error(`生徒検索エラー: ${error.message}`)
  }
  return data
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const flags = process.argv.slice(2).filter(a => a.startsWith('--'))
  const dryRun = flags.includes('--dry-run')
  const force = flags.includes('--force')

  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/withdraw-student.ts <login_id> [--dry-run] [--force]')
    console.error('Example: npx tsx scripts/withdraw-student.ts hana6')
    process.exit(1)
  }

  const input = args[0]

  console.log('='.repeat(60))
  console.log('退塾処理スクリプト')
  console.log('='.repeat(60))
  console.log(`対象: ${input}`)
  console.log(`Supabase: ${supabaseUrl}`)
  console.log(`Mode: ${dryRun ? 'DRY-RUN（実際には変更しません）' : 'EXECUTE'}`)
  console.log('='.repeat(60))

  // ステップ1: 生徒を特定
  console.log('\n🔍 生徒を検索中...')
  const student = await findStudent(input)

  if (!student) {
    console.error(`❌ 生徒が見つかりません: ${input}`)
    console.error('   login_id を確認してください')
    process.exit(1)
  }

  console.log(`\n📋 対象生徒:`)
  console.log(`   氏名: ${student.full_name}`)
  console.log(`   ログインID: ${student.login_id}`)
  console.log(`   学年: 小学${student.grade}年`)
  console.log(`   コース: ${student.course}`)
  console.log(`   user_id: ${student.user_id}`)

  // 関連データの確認
  const { data: csrData, error: csrFetchError } = await supabase
    .from('coach_student_relations')
    .select('id, coach_id, coaches(full_name)')
    .eq('student_id', student.id)

  if (csrFetchError) {
    console.error(`❌ coach_student_relations 取得失敗: ${csrFetchError.message}`)
    console.error('   関連データを正確に把握できないため、処理を中断します')
    process.exit(1)
  }

  const { data: pcrData, error: pcrFetchError } = await supabase
    .from('parent_child_relations')
    .select('id, parent_id, parents(full_name)')
    .eq('student_id', student.id)

  if (pcrFetchError) {
    console.error(`❌ parent_child_relations 取得失敗: ${pcrFetchError.message}`)
    console.error('   関連データを正確に把握できないため、処理を中断します')
    process.exit(1)
  }

  const csrCount = csrData?.length ?? 0
  const pcrCount = pcrData?.length ?? 0

  console.log(`\n📊 関連データ:`)
  console.log(`   coach_student_relations: ${csrCount} 件`)
  if (csrData && csrData.length > 0) {
    csrData.forEach((r: any) => {
      console.log(`     - 指導者: ${r.coaches?.full_name ?? '(不明)'}`)
    })
  }
  console.log(`   parent_child_relations: ${pcrCount} 件`)
  if (pcrData && pcrData.length > 0) {
    pcrData.forEach((r: any) => {
      console.log(`     - 保護者: ${r.parents?.full_name ?? '(不明)'}`)
    })
  }

  // 確認プロンプト
  if (!force && !dryRun) {
    console.log('\n⚠️  この操作は以下を実行します:')
    console.log('   1. coach_student_relations / parent_child_relations をバックアップ')
    console.log('   2. リレーションを削除（指導者・保護者画面から非表示）')
    console.log('   3. auth.users を BAN（ログイン不可）')
    console.log('   ※ 学習履歴等のデータは保持されます')
    console.log('\n続行するには Enter キーを押してください（CTRL+C で中断）...')

    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve())
    })
  }

  const timestamp = getTimestamp()

  // ステップ2: リレーションのバックアップ（JSONファイル保存）
  const backupDir = join(process.cwd(), 'scripts', 'backups')
  const backupFile = join(backupDir, `withdrawn_${student.login_id}_${timestamp}.json`)

  if (csrCount > 0 || pcrCount > 0) {
    console.log('\n💾 リレーションをバックアップ中...')

    const backupData = {
      timestamp: new Date().toISOString(),
      student: {
        id: student.id,
        user_id: student.user_id,
        login_id: student.login_id,
        full_name: student.full_name,
        grade: student.grade,
        course: student.course,
      },
      coach_student_relations: csrData ?? [],
      parent_child_relations: pcrData ?? [],
      restore_sql: [
        ...(csrData ?? []).map((r: any) =>
          `INSERT INTO coach_student_relations (coach_id, student_id) VALUES (${r.coach_id}, ${student.id}) ON CONFLICT (coach_id, student_id) DO NOTHING;`
        ),
        ...(pcrData ?? []).map((r: any) =>
          `INSERT INTO parent_child_relations (parent_id, student_id) VALUES (${r.parent_id}, ${student.id}) ON CONFLICT (parent_id, student_id) DO NOTHING;`
        ),
      ],
    }

    if (!dryRun) {
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true })
      }
      writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8')
      console.log(`   ✓ バックアップ保存: ${backupFile}`)
      console.log(`\n📝 復元用 SQL:`)
      backupData.restore_sql.forEach(sql => console.log(`     ${sql}`))
    } else {
      console.log(`   [dry-run] バックアップ先: ${backupFile}`)
    }
  }

  // ステップ3: リレーション削除
  // CSR → PCR の順で削除。PCR 失敗時は CSR を再投入して擬似ロールバックする
  console.log('\n🗑️  リレーションを削除中...')
  let csrDeleted = false

  if (csrCount > 0) {
    if (dryRun) {
      console.log(`   [dry-run] coach_student_relations: ${csrCount} 件を削除予定`)
    } else {
      const { error: csrDeleteError } = await supabase
        .from('coach_student_relations')
        .delete()
        .eq('student_id', student.id)

      if (csrDeleteError) {
        console.error(`   ❌ coach_student_relations 削除失敗: ${csrDeleteError.message}`)
        console.error('   ⚠️  後続処理（PCR削除・BAN）をスキップします')
        console.error(`   バックアップファイル: ${backupFile}`)
        process.exit(1)
      }
      csrDeleted = true
      console.log(`   ✓ coach_student_relations: ${csrCount} 件を削除`)
    }
  } else {
    console.log('   (coach_student_relations: 対象なし)')
  }

  if (pcrCount > 0) {
    if (dryRun) {
      console.log(`   [dry-run] parent_child_relations: ${pcrCount} 件を削除予定`)
    } else {
      const { error: pcrDeleteError } = await supabase
        .from('parent_child_relations')
        .delete()
        .eq('student_id', student.id)

      if (pcrDeleteError) {
        console.error(`   ❌ parent_child_relations 削除失敗: ${pcrDeleteError.message}`)

        // CSR を擬似ロールバック（再投入）
        if (csrDeleted && csrData && csrData.length > 0) {
          console.error('   🔄 CSR を復元中...')
          let restoreFailCount = 0
          for (const r of csrData) {
            const { error: restoreError } = await supabase
              .from('coach_student_relations')
              .upsert({ coach_id: (r as any).coach_id, student_id: student.id },
                { onConflict: 'coach_id,student_id' })
            if (restoreError) {
              restoreFailCount++
              console.error(`   ❌ CSR 復元失敗 (coach_id=${(r as any).coach_id}): ${restoreError.message}`)
            }
          }
          if (restoreFailCount > 0) {
            console.error(`   ⚠️  CSR 復元: ${restoreFailCount}/${csrData.length} 件が失敗`)
            console.error('   手動で復元してください（バックアップファイルの restore_sql を参照）')
          } else {
            console.error('   ✓ CSR 復元完了')
          }
        }

        console.error(`   バックアップファイル: ${backupFile}`)
        process.exit(1)
      }
      console.log(`   ✓ parent_child_relations: ${pcrCount} 件を削除`)
    }
  } else {
    console.log('   (parent_child_relations: 対象なし)')
  }

  // ステップ4: auth.users BAN（リレーション削除がすべて成功した場合のみ到達）
  console.log('\n🔒 auth.users を BAN 中...')

  let banSuccess = false

  if (dryRun) {
    console.log(`   [dry-run] BAN 予定: ${student.user_id}`)
  } else {
    const { error: banError } = await supabase.auth.admin.updateUserById(
      student.user_id,
      { ban_duration: BAN_DURATION }
    )

    if (banError) {
      console.error(`   ❌ BAN 失敗: ${banError.message}`)
      console.error('   ⚠️  リレーションは既に削除済みです。BAN を手動で実施してください:')
      console.error(`      Supabase Dashboard > Auth > Users > ${student.login_id}@studyspark.local > Ban`)
    } else {
      banSuccess = true
      console.log(`   ✓ BAN 完了 (${BAN_DURATION})`)
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60))
  console.log('結果')
  console.log('='.repeat(60))
  console.log(`生徒: ${student.full_name} (${student.login_id})`)
  console.log(`coach_student_relations 削除: ${csrCount} 件`)
  console.log(`parent_child_relations 削除: ${pcrCount} 件`)
  console.log(`auth BAN: ${dryRun ? '[dry-run]' : banSuccess ? '完了' : '❌ 失敗（手動対応必要）'}`)

  if (dryRun) {
    console.log('\n[dry-run] 実際には変更されていません。')
  } else {
    console.log('\n復元が必要な場合:')
    console.log(`  1. バックアップファイル: ${backupFile}`)
    console.log('  2. restore_sql の INSERT 文を SQL Editor で実行')
    console.log('  3. Supabase Dashboard > Auth > Users > 対象ユーザー > Unban')
  }

  if (!dryRun && !banSuccess) {
    console.error('\n⚠️  BAN が未完了のため異常終了します')
    process.exit(1)
  }

  console.log('\n✨ 完了')
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
