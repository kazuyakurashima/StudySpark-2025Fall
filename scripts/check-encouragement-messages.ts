import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEncouragementMessages() {
  console.log("=== 応援メッセージデータ確認 ===\n")

  // 応援メッセージの総数
  const { count: totalCount } = await supabase
    .from("encouragement_messages")
    .select("*", { count: "exact", head: true })

  console.log(`総応援メッセージ数: ${totalCount}\n`)

  // 最新の応援メッセージ5件
  const { data: messages, error } = await supabase
    .from("encouragement_messages")
    .select(`
      id,
      message,
      sent_at,
      recipient_id,
      sender_id,
      study_log_id,
      sender_profile:user_profiles!encouragement_messages_sender_id_fkey (
        full_name,
        nickname,
        avatar,
        role
      ),
      recipient_profile:user_profiles!encouragement_messages_recipient_id_fkey (
        full_name,
        nickname
      ),
      study_logs (
        id,
        logged_at,
        study_date,
        correct_count,
        total_problems,
        subjects (name),
        study_content_types (content_name)
      )
    `)
    .order("sent_at", { ascending: false })
    .limit(5)

  if (error) {
    console.error("エラー:", error)
    return
  }

  console.log("最新の応援メッセージ5件:")
  messages?.forEach((msg, index) => {
    console.log(`\n${index + 1}. メッセージID: ${msg.id}`)
    console.log(`   送信者: ${(msg.sender_profile as any)?.nickname || (msg.sender_profile as any)?.full_name} (${(msg.sender_profile as any)?.role})`)
    console.log(`   受信者ID: ${msg.recipient_id}`)
    console.log(`   受信者: ${(msg.recipient_profile as any)?.nickname || (msg.recipient_profile as any)?.full_name}`)
    console.log(`   メッセージ: ${msg.message.substring(0, 50)}...`)
    console.log(`   送信日時: ${msg.sent_at}`)
    if (msg.study_logs) {
      const log = msg.study_logs as any
      console.log(`   学習記録: ${log.subjects?.name} - ${log.study_content_types?.content_name}`)
      console.log(`   正答率: ${log.total_problems > 0 ? Math.round((log.correct_count / log.total_problems) * 100) : 0}%`)
    }
  })

  // 生徒別の応援メッセージ数
  console.log("\n\n=== 生徒別の応援メッセージ数 ===")
  const { data: students } = await supabase
    .from("students")
    .select(`
      id,
      user_profiles!students_user_id_fkey (
        full_name,
        nickname
      )
    `)

  for (const student of students || []) {
    const { count } = await supabase
      .from("encouragement_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", student.id)

    const profile = student.user_profiles as any
    console.log(`${profile?.nickname || profile?.full_name}: ${count}件`)
  }
}

checkEncouragementMessages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
