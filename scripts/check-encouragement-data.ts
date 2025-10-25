import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEncouragementData() {
  console.log("=== 応援メッセージと送信者プロフィール確認 ===\n")

  // 応援メッセージを取得
  const { data: messages, error } = await supabase
    .from("encouragement_messages")
    .select(`
      id,
      message,
      sent_at,
      sender_id,
      sender_role,
      student_id
    `)
    .order("sent_at", { ascending: false })
    .limit(5)

  if (error) {
    console.error("エラー:", error)
    return
  }

  console.log(`取得したメッセージ数: ${messages?.length}\n`)

  if (messages && messages.length > 0) {
    // 送信者のプロフィール情報を取得
    const senderIds = [...new Set(messages.map(m => m.sender_id))]
    console.log("送信者ID:", senderIds)

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, nickname, avatar_url, role")
      .in("id", senderIds)

    console.log("\n取得したプロフィール数:", profiles?.length)
    console.log("プロフィールエラー:", profileError)

    if (profiles) {
      console.log("\nプロフィール詳細:")
      profiles.forEach(p => {
        console.log(`  - id: ${p.id}`)
        console.log(`    nickname: ${p.nickname}`)
        console.log(`    display_name: ${p.display_name}`)
        console.log(`    avatar_url: ${p.avatar_url}`)
        console.log(`    role: ${p.role}`)
      })
    }

    console.log("\n\n=== メッセージとプロフィールの結合 ===")
    messages.forEach((msg, index) => {
      const profile = profiles?.find(p => p.id === msg.sender_id)
      console.log(`\n${index + 1}. メッセージID: ${msg.id}`)
      console.log(`   sender_id: ${msg.sender_id}`)
      console.log(`   sender_role: ${msg.sender_role}`)
      console.log(`   プロフィールが見つかった: ${profile ? 'はい' : 'いいえ'}`)
      if (profile) {
        console.log(`   nickname: ${profile.nickname}`)
        console.log(`   avatar_url: ${profile.avatar_url}`)
      }
      console.log(`   メッセージ: ${msg.message.substring(0, 50)}...`)
    })
  }
}

checkEncouragementData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
