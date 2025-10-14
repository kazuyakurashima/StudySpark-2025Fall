/**
 * test_resultsテーブルにresult_courseとresult_classカラムを追加するスクリプト
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyResultColumns() {
  console.log("📝 test_resultsテーブルにカラムを追加中...")

  try {
    // result_courseカラムを追加
    const { error: courseError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.test_results
        ADD COLUMN IF NOT EXISTS result_course TEXT;
      `
    })

    if (courseError) {
      console.log("⚠️ result_course追加:", courseError.message)
    } else {
      console.log("✅ result_courseカラムを追加しました")
    }

    // result_classカラムを追加
    const { error: classError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.test_results
        ADD COLUMN IF NOT EXISTS result_class SMALLINT CHECK (result_class >= 1 AND result_class <= 40);
      `
    })

    if (classError) {
      console.log("⚠️ result_class追加:", classError.message)
    } else {
      console.log("✅ result_classカラムを追加しました")
    }

    // 確認
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .limit(1)

    if (error) {
      console.log("❌ エラー:", error.message)
    } else {
      console.log("\n✅ test_resultsテーブルの構造を確認しました")
      if (data && data.length > 0) {
        console.log("カラム:", Object.keys(data[0]))
      }
    }
  } catch (error) {
    console.error("❌ エラーが発生しました:", error)
    process.exit(1)
  }
}

applyResultColumns()
