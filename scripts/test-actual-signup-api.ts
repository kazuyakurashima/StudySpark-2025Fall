/**
 * 実際の本番APIエンドポイントを呼び出して、新規登録の挙動とエラーを確認する
 */

async function testActualSignupAPI(env: "local" | "production") {
  const baseUrl = env === "local" ? "http://localhost:3000" : "https://study-spark-2025-fall.vercel.app"

  console.log(`\n${"=".repeat(70)}`)
  console.log(`${env === "local" ? "ローカル" : "本番"}環境 - 実際のAPIエンドポイントテスト`)
  console.log(`URL: ${baseUrl}`)
  console.log("=".repeat(70))

  const timestamp = Date.now()
  const parentEmail = `test-api-parent-${timestamp}@example.com`
  const parentPassword = "TestPass123!"
  const childLoginId = `test-child-${timestamp}`
  const childPassword = "ChildPass123!"

  try {
    // Step 1: 保護者のメールアドレス登録（Supabase Auth）
    console.log(`\n📝 Step 1: 保護者のメールアドレス登録を試みます...`)
    console.log(`   Email: ${parentEmail}`)

    // この部分は実際のUIフローでは、Supabase Auth の signUp を使用
    // APIエンドポイントとして /api/auth/parent-register があるか確認

    // Step 2: 保護者の子ども追加API
    console.log(`\n📝 Step 2: 子ども追加APIを呼び出します...`)

    const signupPayload = {
      parentUserId: "dummy-uuid-for-test", // 実際には保護者のauth.users.id
      childGrade: 6,
      childName: "テスト生徒",
      childNameKana: "テストセイト",
      childLoginId: childLoginId,
      childPassword: childPassword,
    }

    console.log(`   Payload:`, JSON.stringify(signupPayload, null, 2))

    const response = await fetch(`${baseUrl}/api/auth/parent-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signupPayload),
    })

    const responseData = await response.json()

    console.log(`\n📊 レスポンス:`)
    console.log(`   Status: ${response.status}`)
    console.log(`   Data:`, JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      console.log(`\n❌❌❌ APIエラーが発生しました`)
      console.log(`   HTTPステータス: ${response.status}`)
      console.log(`   エラーメッセージ: ${responseData.error}`)

      // エラーメッセージの解析
      if (responseData.error) {
        const errorMsg = responseData.error.toLowerCase()

        if (errorMsg.includes("profile") && errorMsg.includes("not found")) {
          console.log(`\n🔥 【根本原因判明】`)
          console.log(`   → profilesレコードが存在しない`)
          console.log(`   → handle_new_userトリガーが動作していない可能性`)
        } else if (errorMsg.includes("foreign key") || errorMsg.includes("23503")) {
          console.log(`\n🔥 【根本原因判明】`)
          console.log(`   → 外部キー制約違反`)
          console.log(`   → students.user_idがprofiles.idを参照できない`)
          console.log(`   → profilesレコードが存在しない = トリガー未動作`)
        } else if (errorMsg.includes("permission denied")) {
          console.log(`\n🔥 【権限エラー】`)
          console.log(`   → RLSまたはGRANT権限の問題`)
        } else {
          console.log(`\n⚠️  その他のエラー`)
        }
      }
    } else {
      console.log(`\n✅ API呼び出し成功`)
      console.log(`   生徒ID: ${responseData.studentId}`)
      console.log(`   子どもユーザーID: ${responseData.childUserId}`)
    }
  } catch (error: any) {
    console.error(`\n💥 予期しないエラー:`, error.message)
    console.error(`   Stack:`, error.stack)
  }
}

async function main() {
  console.log(`\n⚠️  注意: このテストは実際のAPIエンドポイントを呼び出します`)
  console.log(`   ローカル環境: http://localhost:3000 が起動している必要があります`)
  console.log(`   本番環境: 実際のVercelデプロイメントに対してリクエストを送信します\n`)

  // ローカル環境は後でテスト（開発サーバーが起動している必要がある）
  // await testActualSignupAPI("local")

  await testActualSignupAPI("production")

  console.log("\n" + "=".repeat(70) + "\n")
}

main()
