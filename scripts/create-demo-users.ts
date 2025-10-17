import { createClient } from "@supabase/supabase-js"
import { getTodayJST, getDaysAgoJST } from "../lib/utils/date-jst"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// 科目マスタ
const SUBJECTS = [
  { id: 1, name: "算数" },
  { id: 2, name: "国語" },
  { id: 3, name: "理科" },
  { id: 4, name: "社会" },
]

// 小5の学習内容
const GRADE5_CONTENTS = [
  "類題",
  "基本問題",
  "練習問題",
  "演習問題集",
  "ステップアップ演習",
  "実力完成問題集",
]

// 小6の学習内容
const GRADE6_CONTENTS = [
  "１行問題",
  "基本演習",
  "実戦演習",
  "有名校対策",
  "合格力完成",
  "入試実戦問題集",
]

async function deleteExistingDemoUsers() {
  // 既存のデモユーザーをメールアドレス/ログインIDで検索して削除
  try {
    // 1. demo-parentを削除
    const { data: parentAuthList, error: listError } = await supabase.auth.admin.listUsers()
    console.log("  認証ユーザー数:", parentAuthList?.users.length)

    if (listError) {
      console.error("  ユーザーリスト取得エラー:", listError)
      return
    }

    const demoParent = parentAuthList?.users.find(
      (u) => u.email === "demo-parent@example.com"
    )
    console.log("  demo-parent存在:", !!demoParent, demoParent?.id)

    if (demoParent) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(demoParent.id)
      if (deleteError) {
        console.error("  保護者削除エラー:", deleteError)
      } else {
        console.log("  ✓ 既存の保護者を削除しました")
      }
    }

    // 2. demo-student5を削除
    const { data: students } = await supabase.from("students").select("user_id, login_id")
    console.log("  生徒数:", students?.length)

    const demoStudent5 = students?.find((s) => s.login_id === "demo-student5")
    console.log("  demo-student5存在:", !!demoStudent5, demoStudent5?.user_id)

    if (demoStudent5) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(demoStudent5.user_id)
      if (deleteError) {
        console.error("  小5生徒削除エラー:", deleteError)
      } else {
        console.log("  ✓ 既存の小5生徒を削除しました")
      }
    }

    // 3. demo-student6を削除
    const demoStudent6 = students?.find((s) => s.login_id === "demo-student6")
    console.log("  demo-student6存在:", !!demoStudent6, demoStudent6?.user_id)

    if (demoStudent6) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(demoStudent6.user_id)
      if (deleteError) {
        console.error("  小6生徒削除エラー:", deleteError)
      } else {
        console.log("  ✓ 既存の小6生徒を削除しました")
      }
    }
  } catch (error) {
    console.error("  既存ユーザーの削除エラー:", error)
  }
}

async function createDemoUsers() {
  console.log("=== デモユーザー作成開始 ===\n")

  // 1. 保護者アカウント作成
  console.log("📧 保護者アカウント作成中...")
  const { data: authParent, error: authParentError } =
    await supabase.auth.admin.createUser({
      email: "demo-parent@example.com",
      password: "demo2025",
      email_confirm: true,
      user_metadata: {
        role: "parent",
        name: "デモ保護者",
      },
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
    })

  if (authParentError) {
    console.error("❌ 保護者認証エラー:", authParentError)
    return
  }

  console.log("✓ 保護者Auth作成完了:", authParent.user.id)

  // profiles作成
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authParent.user.id,
    role: "parent",
    display_name: "デモ保護者",
    setup_completed: true,
  })

  if (profileError) {
    console.error("❌ 保護者プロフィールエラー:", profileError)
    return
  }

  console.log("✓ 保護者プロフィール作成完了")

  // parents作成
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .insert({
      user_id: authParent.user.id,
      full_name: "デモ保護者",
    })
    .select()
    .single()

  if (parentError) {
    console.error("❌ 保護者レコード作成エラー:", parentError)
    return
  }

  console.log("✓ 保護者作成完了:", parent.full_name, `(ID: ${parent.id})`)

  // 2. 小5生徒作成（Cコース）
  console.log("\n👦 小5生徒作成中...")
  const student5Email = `demo-student5-${Date.now()}@internal.studyspark.local`
  const { data: authStudent5, error: authStudent5Error } =
    await supabase.auth.admin.createUser({
      email: student5Email,
      password: "demo2025",
      email_confirm: true,
      user_metadata: {
        role: "student",
        name: "小5ゆうた",
        login_id: "demo-student5",
      },
    })

  if (authStudent5Error) {
    console.error("❌ 小5生徒認証エラー:", authStudent5Error)
    return
  }

  console.log("✓ 小5生徒Auth作成完了:", authStudent5.user.id)

  // profiles作成
  const { error: profile5Error } = await supabase.from("profiles").insert({
    id: authStudent5.user.id,
    role: "student",
    display_name: "ゆうた",
    avatar_url: "student3",
    setup_completed: true,
  })

  if (profile5Error) {
    console.error("❌ 小5生徒プロフィールエラー:", profile5Error)
    return
  }

  console.log("✓ 小5生徒プロフィール作成完了")

  // students作成
  const { data: student5, error: student5Error } = await supabase
    .from("students")
    .insert({
      user_id: authStudent5.user.id,
      login_id: "demo-student5",
      full_name: "小5ゆうた",
      grade: 5,
      course: "C",
    })
    .select()
    .single()

  if (student5Error) {
    console.error("❌ 小5生徒レコード作成エラー:", student5Error)
    return
  }

  console.log(
    "✓ 小5生徒作成完了:",
    student5.full_name,
    `(${student5.login_id}, ${student5.course}コース)`
  )

  // parent_child_relations作成
  const { error: rel5Error } = await supabase
    .from("parent_child_relations")
    .insert({
      parent_id: parent.id,
      student_id: student5.id,
      relation_type: "guardian",
    })

  if (rel5Error) {
    console.error("❌ 小5親子関係作成エラー:", rel5Error)
    return
  }

  console.log("✓ 小5親子関係作成完了")

  // 3. 小6生徒作成（Aコース）
  console.log("\n👧 小6生徒作成中...")
  const student6Email = `demo-student6-${Date.now()}@internal.studyspark.local`
  const { data: authStudent6, error: authStudent6Error } =
    await supabase.auth.admin.createUser({
      email: student6Email,
      password: "demo2025",
      email_confirm: true,
      user_metadata: {
        role: "student",
        name: "小6さくら",
        login_id: "demo-student6",
      },
    })

  if (authStudent6Error) {
    console.error("❌ 小6生徒認証エラー:", authStudent6Error)
    return
  }

  console.log("✓ 小6生徒Auth作成完了:", authStudent6.user.id)

  // profiles作成
  const { error: profile6Error } = await supabase.from("profiles").insert({
    id: authStudent6.user.id,
    role: "student",
    display_name: "さくら",
    avatar_url: "student7",
    setup_completed: true,
  })

  if (profile6Error) {
    console.error("❌ 小6生徒プロフィールエラー:", profile6Error)
    return
  }

  console.log("✓ 小6生徒プロフィール作成完了")

  // students作成
  const { data: student6, error: student6Error } = await supabase
    .from("students")
    .insert({
      user_id: authStudent6.user.id,
      login_id: "demo-student6",
      full_name: "小6さくら",
      grade: 6,
      course: "A",
    })
    .select()
    .single()

  if (student6Error) {
    console.error("❌ 小6生徒レコード作成エラー:", student6Error)
    return
  }

  console.log(
    "✓ 小6生徒作成完了:",
    student6.full_name,
    `(${student6.login_id}, ${student6.course}コース)`
  )

  // parent_child_relations作成
  const { error: rel6Error } = await supabase
    .from("parent_child_relations")
    .insert({
      parent_id: parent.id,
      student_id: student6.id,
      relation_type: "guardian",
    })

  if (rel6Error) {
    console.error("❌ 小6親子関係作成エラー:", rel6Error)
    return
  }

  console.log("✓ 小6親子関係作成完了")

  // 4. 学習ログ生成（直近1ヶ月）
  console.log("\n📚 学習ログ生成中（直近1ヶ月）...")
  await generateStudyLogs(student5.id, 5)
  await generateStudyLogs(student6.id, 6)

  // 5. 先々週の振り返り生成
  console.log("\n💭 週次振り返り生成中（先々週）...")
  await generateWeeklyReflection(student5.id, 5)
  await generateWeeklyReflection(student6.id, 6)

  console.log("\n=== ✅ デモユーザー作成完了 ===")
  console.log("\n📋 ログイン情報:")
  console.log("生徒（小5）: demo-student5 / demo2025")
  console.log("生徒（小6）: demo-student6 / demo2025")
  console.log("保護者: demo-parent@example.com / demo2025")
}

async function generateStudyLogs(studentId: string, grade: number) {
  const todayStr = getTodayJST()
  const contents = grade === 5 ? GRADE5_CONTENTS : GRADE6_CONTENTS

  // 直近30日分のログを生成
  for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
    const dateStr = getDaysAgoJST(daysAgo)

    // 70%の確率で学習記録を作成（毎日ではない）
    if (Math.random() > 0.3) {
      // その日に1〜3科目の学習記録を作成
      const numSubjects = Math.floor(Math.random() * 3) + 1
      const shuffledSubjects = [...SUBJECTS].sort(() => Math.random() - 0.5)

      for (let i = 0; i < numSubjects; i++) {
        const subject = shuffledSubjects[i]
        const content = contents[Math.floor(Math.random() * contents.length)]

        // ランダムな問題数と正答数
        const totalProblems = Math.floor(Math.random() * 20) + 10 // 10-30問
        const correctRate = Math.random() * 0.4 + 0.5 // 50-90%
        const correctCount = Math.floor(totalProblems * correctRate)

        // セッション取得（study_dateに基づく）
        const { data: session } = await supabase
          .from("study_sessions")
          .select("id")
          .eq("grade", grade)
          .lte("start_date", dateStr)
          .gte("end_date", dateStr)
          .single()

        if (!session) {
          console.log(`  ⚠️ セッションが見つかりません: ${dateStr}`)
          continue
        }

        await supabase.from("study_logs").insert({
          student_id: studentId,
          session_id: session.id,
          subject_id: subject.id,
          content_type: content,
          total_problems: totalProblems,
          correct_count: correctCount,
          study_date: dateStr,
          logged_at: new Date(`${dateStr}T20:00:00+09:00`).toISOString(),
        })
      }
    }
  }

  const { count } = await supabase
    .from("study_logs")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)

  console.log(`  ✓ 学習ログ生成完了 (${grade === 5 ? "小5" : "小6"}): ${count}件`)
}

async function generateWeeklyReflection(studentId: string, grade: number) {
  // 先々週の月曜日を計算
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - daysToMonday - 14) // 2週間前の月曜

  const weekStartStr = lastMonday.toISOString().split("T")[0]

  // 先々週のセッション取得
  const { data: session } = await supabase
    .from("study_sessions")
    .select("id, session_number")
    .eq("grade", grade)
    .lte("start_date", weekStartStr)
    .gte("end_date", weekStartStr)
    .single()

  if (!session) {
    console.log(`  ⚠️ 先々週のセッションが見つかりません`)
    return
  }

  // 振り返りレコード作成
  const { data: reflection, error: reflectionError } = await supabase
    .from("weekly_reflections")
    .insert({
      student_id: studentId,
      session_id: session.id,
      week_start_date: weekStartStr,
      status: "completed",
      conversation_data: {
        messages: [
          {
            role: "assistant",
            content: `こんにちは！先週（第${session.session_number}回）の振り返りをしましょう。\n\n先週の学習を振り返ってみて、どんな気持ちですか？`,
          },
          {
            role: "user",
            content: "算数が難しかったけど、頑張りました。",
          },
          {
            role: "assistant",
            content:
              "難しい問題にも諦めずに取り組んだんですね、素晴らしいです！\n\n特にどんな単元が難しかったですか？",
          },
          {
            role: "user",
            content: "速さの問題が難しかったです。",
          },
          {
            role: "assistant",
            content:
              "速さの問題は多くの人が苦戦する単元ですね。でも、難しいと感じながらも挑戦し続けたことが大切です。\n\n来週はどんなことを意識して学習したいですか？",
          },
          {
            role: "user",
            content: "速さの基本問題をもう一度復習したいです。",
          },
          {
            role: "assistant",
            content:
              "とても良い目標ですね！基本をしっかり固めることで、応用問題にも対応できるようになります。\n\n復習を進める中で分からないことがあったら、すぐに先生や保護者の方に質問してくださいね。応援しています！",
          },
        ],
        summary:
          "速さの問題に苦戦しながらも諦めずに取り組みました。来週は基本問題の復習を重点的に行う予定です。",
      },
      completed_at: new Date(
        `${weekStartStr}T19:30:00+09:00`
      ).toISOString(),
    })
    .select()
    .single()

  if (reflectionError) {
    console.error(
      `  ❌ 振り返り作成エラー (${grade === 5 ? "小5" : "小6"}):`,
      reflectionError
    )
    return
  }

  console.log(
    `  ✓ 週次振り返り作成完了 (${grade === 5 ? "小5" : "小6"}): 第${session.session_number}回`
  )
}

createDemoUsers().catch(console.error)
