/**
 * デモデータ充実化スクリプト
 * 主催者向けプレゼンテーション用に豊富なデータを追加
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

console.log("🚀 デモデータ充実化を開始...")
console.log(`📍 Supabase URL: ${supabaseUrl}\n`)

/**
 * 学習ログを大量に作成（過去4週間分）
 */
async function createRichStudyLogs(studentId: number, grade: number, studentName: string) {
  console.log(`\n📚 ${studentName} の学習ログを作成中...`)

  // 科目とセッション、コンテンツタイプを取得
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("display_order")
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, session_number")
    .eq("grade", grade)
    .order("session_number", { ascending: false })
    .limit(8)
  const { data: contentTypes } = await supabase
    .from("study_content_types")
    .select("id, subject_id, content_name")
    .eq("grade", grade)

  if (!subjects || !sessions || !contentTypes) {
    console.error("❌ 必要なマスターデータが見つかりません")
    return
  }

  const logsToCreate = []
  const today = new Date()

  // 過去4週間（28日間）のデータを作成
  for (let i = 0; i < 28; i++) {
    const logDate = new Date(today)
    logDate.setDate(logDate.getDate() - i)

    // 日曜日はスキップ
    if (logDate.getDay() === 0) continue

    // 曜日に応じて科目を変える（リアルな学習パターン）
    const dayOfWeek = logDate.getDay()
    let subjectsForDay: typeof subjects = []

    if (dayOfWeek === 1 || dayOfWeek === 2) {
      // 月火: 算数、国語、社会
      subjectsForDay = subjects.filter((s) => ["算数", "国語", "社会"].includes(s.name))
    } else if (dayOfWeek === 3 || dayOfWeek === 4) {
      // 水木: 算数、国語、理科
      subjectsForDay = subjects.filter((s) => ["算数", "国語", "理科"].includes(s.name))
    } else {
      // 金土: 算数、理科、社会
      subjectsForDay = subjects.filter((s) => ["算数", "理科", "社会"].includes(s.name))
    }

    // 最近ほどデータが多い（モチベーション向上を表現）
    const numLogsToday = i < 7 ? 3 : i < 14 ? 2 : 1

    const usedSubjects = new Set<number>()

    for (let j = 0; j < Math.min(numLogsToday, subjectsForDay.length); j++) {
      // 重複しない科目を選択
      let subject
      do {
        subject = subjectsForDay[Math.floor(Math.random() * subjectsForDay.length)]
      } while (usedSubjects.has(subject.id))
      usedSubjects.add(subject.id)

      const session = sessions[Math.floor(Math.random() * sessions.length)]
      const contentTypesForSubject = contentTypes.filter((ct) => ct.subject_id === subject.id)

      if (contentTypesForSubject.length === 0) continue

      const contentType = contentTypesForSubject[Math.floor(Math.random() * contentTypesForSubject.length)]

      // 問題数と正答率をランダム化（現実的な範囲）
      const totalProblems = Math.floor(Math.random() * 13) + 8 // 8-20問
      // 最近ほど正答率が上がる（成長を表現）
      const baseAccuracy = i < 7 ? 0.75 : i < 14 ? 0.7 : 0.65
      const accuracy = baseAccuracy + Math.random() * 0.2 // ±20%
      const correctCount = Math.max(0, Math.min(totalProblems, Math.floor(totalProblems * accuracy)))

      // 記録時刻を設定（15-21時の間でランダム）
      const recordTime = new Date(logDate)
      recordTime.setHours(15 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0)

      logsToCreate.push({
        student_id: studentId,
        session_id: session.id,
        subject_id: subject.id,
        study_content_type_id: contentType.id,
        total_problems: totalProblems,
        correct_count: correctCount,
        logged_at: recordTime.toISOString(),
        study_date: logDate.toISOString().split("T")[0], // YYYY-MM-DD形式
      })
    }
  }

  if (logsToCreate.length === 0) {
    console.log("⚠️  作成する学習ログがありません")
    return
  }

  // ユニーク制約を考慮してupsertを使用
  // study_logs_unique_per_date: (student_id, session_id, subject_id, study_content_type_id, study_date)
  const { error } = await supabase
    .from("study_logs")
    .upsert(logsToCreate, {
      onConflict: "student_id,session_id,subject_id,study_content_type_id,study_date",
      ignoreDuplicates: false,
    })

  if (error) {
    console.error(`❌ 学習ログ作成失敗: ${error.message}`)
  } else {
    console.log(`✅ ${logsToCreate.length}件の学習ログを作成しました`)
  }
}

/**
 * 保護者・指導者からの応援メッセージを作成
 */
async function createEncouragementMessages(studentId: number, studentName: string) {
  console.log(`\n💬 ${studentName} への応援メッセージを作成中...`)

  // 保護者と指導者のuser_idを取得
  const { data: users } = await supabase.auth.admin.listUsers()
  const parentUser = users.users.find((u) => u.email?.includes("parent"))
  const coachUser = users.users.find((u) => u.email?.includes("coach"))

  if (!parentUser && !coachUser) {
    console.error("❌ 保護者または指導者が見つかりません")
    return
  }

  // 最近の学習ログを取得
  const { data: logs } = await supabase
    .from("study_logs")
    .select("id, logged_at, subject_id, correct_count, total_problems")
    .eq("student_id", studentId)
    .order("logged_at", { ascending: false })
    .limit(15)

  if (!logs || logs.length === 0) {
    console.log("⚠️  応援メッセージを紐付ける学習ログがありません")
    return
  }

  const parentMessages = [
    "今日もよく頑張ったね！毎日の積み重ねが大切だよ。",
    "算数の問題、難しかったと思うけど最後まで諦めずにできたね。すごいよ！",
    "理科の学習、しっかり取り組んでいるね。この調子で続けていこう！",
    "国語の読解、少しずつ上達しているよ。応援しているよ！",
    "毎日コツコツ勉強している姿を見て、成長を感じています。",
    "今週もよく頑張ったね。週末はゆっくり休んでね。",
    "社会の暗記、地道に続けているね。努力は必ず実を結ぶよ！",
    "いつも一生懸命な姿、素敵だよ。無理せず自分のペースでね。",
  ]

  const coachMessages = [
    "今日の学習内容、しっかり理解できていますね。この調子です！",
    "基本問題を丁寧に解く姿勢が素晴らしいです。",
    "応用問題にも挑戦している姿勢が良いですね。成長を感じます。",
    "正答率が上がってきましたね。努力の成果が出ています！",
    "復習をしっかりできていることが、学習記録から伝わってきます。",
    "苦手分野に向き合う姿勢が素晴らしい。一歩ずつ前進していますよ。",
    "テスト前の準備、計画的に進められていますね。",
  ]

  const messagesToCreate = []

  // 保護者からのメッセージ（ランダムに5-8件）
  if (parentUser) {
    const numParentMessages = 5 + Math.floor(Math.random() * 4)
    for (let i = 0; i < Math.min(numParentMessages, logs.length); i++) {
      const log = logs[i]
      const message = parentMessages[i % parentMessages.length]
      const createdAt = new Date(log.logged_at)
      createdAt.setHours(createdAt.getHours() + 1) // ログの1時間後に送信

      messagesToCreate.push({
        student_id: studentId,
        sender_id: parentUser.id,
        sender_role: "parent" as const,
        message: message,
        is_ai_generated: i % 3 === 0, // 3件に1件はAI生成
        support_type: i % 3 === 0 ? "ai" : "quick", // AI生成は"ai"、手動は"quick"
        created_at: createdAt.toISOString(),
        read_at: i < 3 ? createdAt.toISOString() : null, // 最新3件は既読
      })
    }
  }

  // 指導者からのメッセージ（ランダムに3-5件）
  if (coachUser) {
    const numCoachMessages = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < Math.min(numCoachMessages, logs.length); i++) {
      const log = logs[i + 5] || logs[i]
      const message = coachMessages[i % coachMessages.length]
      const createdAt = new Date(log.logged_at)
      createdAt.setHours(createdAt.getHours() + 2) // ログの2時間後に送信

      messagesToCreate.push({
        student_id: studentId,
        sender_id: coachUser.id,
        sender_role: "coach" as const,
        message: message,
        is_ai_generated: i % 2 === 0, // 2件に1件はAI生成
        support_type: i % 2 === 0 ? "ai" : "quick", // AI生成は"ai"、手動は"quick"
        created_at: createdAt.toISOString(),
        read_at: i < 2 ? createdAt.toISOString() : null, // 最新2件は既読
      })
    }
  }

  if (messagesToCreate.length === 0) {
    console.log("⚠️  作成する応援メッセージがありません")
    return
  }

  const { error } = await supabase.from("encouragement_messages").insert(messagesToCreate)

  if (error) {
    console.error(`❌ 応援メッセージ作成失敗: ${error.message}`)
  } else {
    console.log(`✅ ${messagesToCreate.length}件の応援メッセージを作成しました`)
  }
}

/**
 * テスト目標を作成
 */
async function createTestGoal(studentId: number, grade: number, studentName: string) {
  console.log(`\n🎯 ${studentName} のテスト目標を作成中...`)

  // 既存の目標を確認
  const { data: existingGoals } = await supabase.from("test_goals").select("id").eq("student_id", studentId)

  if (existingGoals && existingGoals.length > 0) {
    console.log("⚠️  既に目標が存在します。スキップします。")
    return
  }

  // テストスケジュールを取得
  const { data: testTypes } = await supabase.from("test_types").select("id, name").eq("grade", grade)

  if (!testTypes || testTypes.length === 0) {
    console.error("❌ テストタイプが見つかりません")
    return
  }

  const testType = testTypes[0]

  const { data: testSchedule } = await supabase
    .from("test_schedules")
    .select("id, test_date, test_number")
    .eq("test_type_id", testType.id)
    .gte("test_date", new Date().toISOString().split("T")[0])
    .order("test_date", { ascending: true })
    .limit(1)
    .single()

  if (!testSchedule) {
    console.error("❌ 今後のテストスケジュールが見つかりません")
    return
  }

  const goalThoughts =
    grade === 5
      ? "次の組分けテストではBコースの上位を目指します！算数と理科を特に頑張って、毎日少しずつ復習を続けていきたいです。基本問題を完璧にして、応用問題にも挑戦していきます。"
      : "合不合判定テストで偏差値60以上を目指します。苦手な国語の読解問題を克服するために、毎日文章を読む習慣をつけます。算数は応用問題のスピードアップに取り組みます！"

  const { error } = await supabase.from("test_goals").insert({
    student_id: studentId,
    test_schedule_id: testSchedule.id,
    target_course: grade === 5 ? "B" : "C",
    target_class: grade === 5 ? 12 : 8,
    goal_thoughts: goalThoughts,
  })

  if (error) {
    console.error(`❌ テスト目標作成失敗: ${error.message}`)
  } else {
    console.log(`✅ テスト目標を作成しました（${testType.name} 第${testSchedule.test_number}回）`)
  }
}

/**
 * 週次振り返りセッションを作成
 */
async function createReflectSessions(studentId: number, studentName: string) {
  console.log(`\n🤔 ${studentName} の振り返りセッションを作成中...`)

  // 過去3週間分の振り返りを作成
  const reflectData = [
    {
      weekOffset: 14,
      weekType: "growth" as const,
      summary:
        "今週は算数の応用問題に集中して取り組みました。最初は難しく感じましたが、基本をしっかり復習したら理解が深まりました。正答率も上がってきて嬉しいです！来週も続けます。",
      messages: [
        { sender: "ai" as const, message: "今週の学習、本当にお疲れさまでした！どんな1週間でしたか？" },
        { sender: "student" as const, message: "算数の応用問題を頑張りました。最初は難しかったけど、少しずつできるようになってきました。" },
        {
          sender: "ai" as const,
          message: "素晴らしい成長ですね！難しいと感じながらも諦めずに取り組んだこと、本当に立派です。どんなところが一番難しかったですか？",
        },
        { sender: "student" as const, message: "文章題が苦手でしたが、基本を復習したら少し分かるようになりました。" },
        {
          sender: "ai" as const,
          message: "基本に立ち返る判断、とても賢いですね！その努力が正答率の向上につながっているようです。来週はどんなことにチャレンジしたいですか？",
        },
        { sender: "student" as const, message: "もっと応用問題を解いて、スピードも上げたいです！" },
      ],
    },
    {
      weekOffset: 7,
      weekType: "stable" as const,
      summary:
        "今週は4科目バランスよく学習できました。算数と理科は順調ですが、国語の読解問題にまだ時間がかかります。来週は国語を重点的に復習したいと思います。",
      messages: [
        { sender: "ai" as const, message: "今週もよく頑張りましたね！振り返ってみて、どんな1週間でしたか？" },
        { sender: "student" as const, message: "4科目全部勉強できました。でも国語の読解が難しいです。" },
        { sender: "ai" as const, message: "バランスよく取り組めたこと、素晴らしいですね。国語の読解、どんなところが難しいと感じますか？" },
        { sender: "student" as const, message: "長い文章を読むのに時間がかかって、問題を解く時間が足りなくなります。" },
        {
          sender: "ai" as const,
          message: "読むスピードと理解のバランス、多くの人が悩むところです。来週、どんなことを試してみたいですか？",
        },
        { sender: "student" as const, message: "毎日少しずつ文章を読む練習をしてみます。" },
      ],
    },
    {
      weekOffset: 0,
      weekType: "challenge" as const,
      summary:
        "今週は少し調子が出ませんでした。テスト前で緊張していたのかもしれません。でも毎日続けることができたので、それは良かったと思います。来週は落ち着いて取り組みたいです。",
      messages: [
        { sender: "ai" as const, message: "今週もお疲れさまでした。今週はどんな感じでしたか？" },
        { sender: "student" as const, message: "あまりうまくいかなかったです。問題が難しくて…" },
        {
          sender: "ai" as const,
          message: "思うようにいかないときもありますよね。でも、それでも毎日続けたこと、それ自体がすごく大切なことですよ。どんなことが難しかったですか？",
        },
        { sender: "student" as const, message: "テストが近くて焦っていたのかもしれません。" },
        {
          sender: "ai" as const,
          message: "自分の気持ちに気づけること、素晴らしいですね。焦る気持ちは誰にでもあります。来週に向けて、どんなことを心がけたいですか？",
        },
        { sender: "student" as const, message: "落ち着いて、できることからやっていきたいです。" },
      ],
    },
  ]

  for (const data of reflectData) {
    const weekStartDate = new Date()
    weekStartDate.setDate(weekStartDate.getDate() - data.weekOffset)
    // 直近の月曜日を計算
    const dayOfWeek = weekStartDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStartDate.setDate(weekStartDate.getDate() - daysToMonday)

    // 週終了日を計算
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    // 既存のセッションをチェック
    const { data: existingSession } = await supabase
      .from("coaching_sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("week_start_date", weekStartDate.toISOString().split("T")[0])
      .maybeSingle()

    let session
    if (existingSession) {
      // 既存のセッションを更新
      const { data: updatedSession, error: updateError } = await supabase
        .from("coaching_sessions")
        .update({
          week_end_date: weekEndDate.toISOString().split("T")[0],
          week_type: data.weekType,
          status: "completed",
          summary_text: data.summary,
          total_turns: data.messages.length,
          completed_at: weekEndDate.toISOString(),
        })
        .eq("id", existingSession.id)
        .select()
        .single()

      if (updateError) {
        console.error(`❌ 振り返りセッション更新失敗: ${updateError.message}`)
        continue
      }
      session = updatedSession
    } else {
      // 新規セッションを作成
      const { data: newSession, error: sessionError } = await supabase
        .from("coaching_sessions")
        .insert({
          student_id: studentId,
          week_start_date: weekStartDate.toISOString().split("T")[0],
          week_end_date: weekEndDate.toISOString().split("T")[0],
          week_type: data.weekType,
          status: "completed",
          summary_text: data.summary,
          total_turns: data.messages.length,
          started_at: weekStartDate.toISOString(),
          completed_at: weekEndDate.toISOString(),
        })
        .select()
        .single()

      if (sessionError) {
        console.error(`❌ 振り返りセッション作成失敗: ${sessionError.message}`)
        continue
      }
      session = newSession
    }

    // 既存のメッセージを削除してから新規作成
    await supabase.from("coaching_messages").delete().eq("session_id", session.id)

    // メッセージを作成
    // coaching_messages のスキーマ: role (user/assistant), content, turn_number
    const messages = data.messages.map((msg, index) => ({
      session_id: session.id,
      turn_number: index + 1,
      role: msg.sender === "student" ? "user" : "assistant",
      content: msg.message,
    }))

    const { error: messagesError } = await supabase.from("coaching_messages").insert(messages)

    if (messagesError) {
      console.error(`❌ 振り返りメッセージ作成失敗: ${messagesError.message}`)
    } else {
      console.log(`✅ ${data.weekType}週の振り返りセッションを作成しました（${messages.length}メッセージ）`)
    }
  }
}

async function main() {
  console.log("=" .repeat(60))
  console.log("🎨 デモデータ充実化開始")
  console.log("=".repeat(60))

  // デモ生徒を取得
  const { data: students } = await supabase
    .from("students")
    .select("id, grade, full_name, login_id")
    .like("login_id", "demo-student%")

  if (!students || students.length === 0) {
    console.error("❌ デモ生徒が見つかりません")
    return
  }

  console.log(`\n📊 ${students.length}人のデモ生徒を処理します\n`)

  for (const student of students) {
    console.log("\n" + "=".repeat(60))
    console.log(`🎓 処理中: ${student.full_name} (${student.login_id})`)
    console.log("=".repeat(60))

    await createRichStudyLogs(student.id, student.grade, student.full_name)
    await createEncouragementMessages(student.id, student.full_name)
    await createTestGoal(student.id, student.grade, student.full_name)
    await createReflectSessions(student.id, student.full_name)
  }

  console.log("\n" + "=".repeat(60))
  console.log("✅ デモデータ充実化完了！")
  console.log("=".repeat(60))
  console.log("\n主催者向けプレゼンテーションの準備が整いました。\n")
}

main()
  .then(() => {
    console.log("✅ スクリプト実行完了")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ スクリプト実行失敗:", error)
    process.exit(1)
  })
