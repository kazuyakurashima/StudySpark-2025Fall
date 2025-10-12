import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 小学6年生の問題数データ（要件定義書より）
const grade6ProblemCounts = [
  { session: 1, subject: "算数", content: "１行問題", problems: 20 },
  { session: 1, subject: "算数", content: "基本演習", problems: 12 },
  { session: 1, subject: "算数", content: "実戦演習", problems: 13 },
  { session: 1, subject: "国語", content: "中学入試頻出漢字", problems: 40 },
  { session: 1, subject: "理科", content: "演習問題集（基本問題）", problems: 25 },
  { session: 1, subject: "理科", content: "演習問題集（練習問題）", problems: 25 },
  { session: 1, subject: "社会", content: "演習問題集（基本問題）", problems: 60 },
  { session: 1, subject: "社会", content: "演習問題集（練習問題）", problems: 20 },
  { session: 1, subject: "社会", content: "演習問題集（応用問題）", problems: 10 },

  { session: 2, subject: "算数", content: "１行問題", problems: 22 },
  { session: 2, subject: "算数", content: "基本演習", problems: 12 },
  { session: 2, subject: "算数", content: "実戦演習", problems: 13 },
  { session: 2, subject: "国語", content: "中学入試頻出漢字", problems: 40 },
  { session: 2, subject: "理科", content: "演習問題集（基本問題）", problems: 26 },
  { session: 2, subject: "理科", content: "演習問題集（練習問題）", problems: 23 },
  { session: 2, subject: "社会", content: "演習問題集（基本問題）", problems: 63 },
  { session: 2, subject: "社会", content: "演習問題集（練習問題）", problems: 16 },
  { session: 2, subject: "社会", content: "演習問題集（応用問題）", problems: 14 },

  { session: 3, subject: "算数", content: "１行問題", problems: 19 },
  { session: 3, subject: "算数", content: "基本演習", problems: 12 },
  { session: 3, subject: "算数", content: "実戦演習", problems: 12 },
  { session: 3, subject: "国語", content: "中学入試頻出漢字", problems: 40 },
  { session: 3, subject: "理科", content: "演習問題集（基本問題）", problems: 31 },
  { session: 3, subject: "理科", content: "演習問題集（練習問題）", problems: 32 },
  { session: 3, subject: "社会", content: "演習問題集（基本問題）", problems: 55 },
  { session: 3, subject: "社会", content: "演習問題集（練習問題）", problems: 20 },
  { session: 3, subject: "社会", content: "演習問題集（応用問題）", problems: 5 },

  { session: 4, subject: "算数", content: "１行問題", problems: 22 },
  { session: 4, subject: "算数", content: "基本演習", problems: 13 },
  { session: 4, subject: "算数", content: "実戦演習", problems: 14 },
  { session: 4, subject: "国語", content: "中学入試頻出漢字", problems: 40 },
  { session: 4, subject: "理科", content: "演習問題集（基本問題）", problems: 29 },
  { session: 4, subject: "理科", content: "演習問題集（練習問題）", problems: 28 },
  { session: 4, subject: "社会", content: "演習問題集（基本問題）", problems: 55 },
  { session: 4, subject: "社会", content: "演習問題集（練習問題）", problems: 26 },
  { session: 4, subject: "社会", content: "演習問題集（応用問題）", problems: 10 },

  { session: 5, subject: "算数", content: "１行問題", problems: 21 },
  { session: 5, subject: "算数", content: "基本演習", problems: 14 },
  { session: 5, subject: "算数", content: "実戦演習", problems: 14 },
  { session: 5, subject: "国語", content: "中学入試頻出漢字", problems: 40 },
  { session: 5, subject: "理科", content: "演習問題集（基本問題）", problems: 20 },
  { session: 5, subject: "理科", content: "演習問題集（練習問題）", problems: 27 },
  { session: 5, subject: "社会", content: "演習問題集（基本問題）", problems: 50 },
  { session: 5, subject: "社会", content: "演習問題集（練習問題）", problems: 7 },
  { session: 5, subject: "社会", content: "演習問題集（応用問題）", problems: 7 },

  // 第6回以降も同様に追加可能
]

async function main() {
  console.log("小学6年生の問題数データを登録します...")

  // 全学習回とコンテンツタイプを取得
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, session_number")
    .eq("grade", 6)
    .order("session_number")

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")

  const { data: contentTypes } = await supabase
    .from("study_content_types")
    .select("id, subject_id, content_name, course")
    .eq("grade", 6)

  if (!sessions || !subjects || !contentTypes) {
    console.error("マスタデータの取得に失敗しました")
    return
  }

  let insertCount = 0
  let skipCount = 0

  for (const item of grade6ProblemCounts) {
    const session = sessions.find((s) => s.session_number === item.session)
    const subject = subjects.find((s) => s.name === item.subject)

    if (!session || !subject) {
      console.log(`⚠️  スキップ: 第${item.session}回 ${item.subject} ${item.content}（マスタが見つかりません）`)
      skipCount++
      continue
    }

    // この科目・学習内容に該当する全コースのコンテンツタイプを取得
    const matchingContentTypes = contentTypes.filter(
      (ct) => ct.subject_id === subject.id && ct.content_name === item.content
    )

    if (matchingContentTypes.length === 0) {
      console.log(`⚠️  スキップ: 第${item.session}回 ${item.subject} ${item.content}（学習内容タイプが見つかりません）`)
      skipCount++
      continue
    }

    // 各コースごとに問題数を登録
    for (const ct of matchingContentTypes) {
      // 既存チェック
      const { data: existing } = await supabase
        .from("problem_counts")
        .select("id")
        .eq("study_content_type_id", ct.id)
        .eq("session_id", session.id)
        .single()

      if (existing) {
        // 既に存在する場合は更新
        await supabase
          .from("problem_counts")
          .update({ total_problems: item.problems })
          .eq("id", existing.id)
        console.log(`✅ 更新: 第${item.session}回 ${item.subject}(${ct.course}) ${item.content} = ${item.problems}問`)
      } else {
        // 新規登録
        await supabase.from("problem_counts").insert({
          study_content_type_id: ct.id,
          session_id: session.id,
          total_problems: item.problems,
        })
        console.log(`✅ 登録: 第${item.session}回 ${item.subject}(${ct.course}) ${item.content} = ${item.problems}問`)
      }
      insertCount++
    }
  }

  console.log(`\n完了: ${insertCount}件登録、${skipCount}件スキップ`)
}

main()
  .then(() => {
    console.log("処理が完了しました")
    process.exit(0)
  })
  .catch((error) => {
    console.error("エラー:", error)
    process.exit(1)
  })
