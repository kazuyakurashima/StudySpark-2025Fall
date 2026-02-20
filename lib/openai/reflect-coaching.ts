import { getOpenAIClient, getDefaultModel } from "./client"

interface ReflectContext {
  studentName: string
  weekType: "growth" | "stable" | "challenge" | "special"
  thisWeekAccuracy: number
  lastWeekAccuracy: number
  accuracyDiff: number
  upcomingTest?: { test_types: { name: string }, test_date: string } | null
  conversationHistory: { role: "assistant" | "user"; content: string }[]
  turnNumber: number
}

/**
 * 週次振り返りAI対話メッセージ生成（v2.0）
 *
 * 設計ドキュメント: REFLECT_COACHING_DESIGN.md
 *
 * 改善点:
 * - Reality → Goal → Options/Will の正しいGROW順序
 * - 3つの質問を事前提示（予測可能性向上）
 * - 抽象的回答への深掘り機能（1回まで）
 * - 挑戦週での「維持でもOK」メッセージ
 * - データ欠損・初回・極端な変化への対応
 * - 会話履歴の引用による共感強化
 */
export async function generateReflectMessage(
  context: ReflectContext
): Promise<{ message?: string; error?: string }> {
  try {
    const openai = getOpenAIClient()
    const systemPrompt = getReflectSystemPrompt()
    const userPrompt = getReflectUserPrompt(context)

    const model = getDefaultModel()

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...context.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 800,
    })

    let message = response.choices[0]?.message?.content

    if (!message) {
      console.error("❌ AI response content is empty")
      return { error: "AIからの応答が空でした" }
    }

    // 🆕 クロージングまたはフォールバック時にメタタグを付与
    // A案: GROW完了判定（語彙拡張済み）
    const hasCompletedGROWCheck = context.turnNumber >= 3 && hasCompletedGROW(context.conversationHistory)

    // B案: 生成されたAIメッセージにクロージング表現が含まれるか（語尾変化を許容）
    const hasClosingExpression = /素敵な一週間|良い一週間|楽しみにして|応援して|来週も|頑張ってね|それでは|では、/.test(message)
    const isClosingTurn = context.turnNumber >= 5 && hasClosingExpression

    const shouldAppendMeta = (
      hasCompletedGROWCheck || // A案: GROW完了
      isClosingTurn ||          // B案: クロージング表現検出
      (context.turnNumber >= 6) // フォールバック
    )

    if (shouldAppendMeta) {
      message = message.trimEnd() + "\n\n[META:SESSION_CAN_END]"
    }

    return { message }
  } catch (error) {
    console.error("Reflect AI dialogue error:", error)
    return { error: error instanceof Error ? error.message : "AI対話でエラーが発生しました" }
  }
}

/**
 * 振り返りサマリー生成
 */
export async function generateReflectSummary(
  context: ReflectContext
): Promise<{ summary?: string; error?: string }> {
  try {
    const openai = getOpenAIClient()
    const systemPrompt = `あなたは小学生の学習を支援するAIコーチです。
週次振り返り対話の内容から、生徒の気づきと成長をまとめてください。

# 出力形式
150文字以内の日本語で、以下の要素を含めてください：
- 今週の頑張りと成長
- 気づいたこと
- 次週への意気込み

# 原則
- セルフコンパッション：自己批判ではなく、努力を認める
- 成長マインドセット：能力は努力で伸びることを強調
- 具体的：抽象的ではなく、対話内容に基づく具体的な記述`

    const conversationSummary = context.conversationHistory
      .map((msg, i) => `${i + 1}. ${msg.role === "assistant" ? "AIコーチ" : context.studentName}: ${msg.content}`)
      .join("\n")

    const userPrompt = `以下の対話内容から、振り返りサマリーを生成してください：

${conversationSummary}

週タイプ: ${context.weekType === "growth" ? "成長週" : context.weekType === "stable" ? "安定週" : context.weekType === "challenge" ? "挑戦週" : "特別週"}
正答率の変化: ${context.accuracyDiff >= 0 ? "+" : ""}${context.accuracyDiff}%`

    const model = getDefaultModel()

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 500,
    })

    const summary = response.choices[0]?.message?.content

    if (!summary) {
      console.error("❌ Summary is empty")
      return { error: "サマリー生成に失敗しました" }
    }

    return { summary }
  } catch (error) {
    console.error("Reflect summary generation error:", error)
    return { error: error instanceof Error ? error.message : "サマリー生成でエラーが発生しました" }
  }
}

/**
 * リフレクトシステムプロンプト（v2.0）
 */
function getReflectSystemPrompt(): string {
  return `あなたは小学生の学習を支援するAIコーチです。
週次振り返り対話を通じて、生徒の主体性と成長を引き出します。

# 指導方針
- **主体性と目的意識**: なぜ取り組むのかを言語化させ、自分で決めた行動に責任を持てるようにする
- **セルフコンパッション**: 結果の良し悪しに関わらず、挑戦を肯定的に捉える。挑戦週では特に「維持」「休息」も選択肢として提示する
- **成長マインドセット**: 能力は努力・工夫で伸びるという前提でフィードバックする
- **行動目標重視**: テスト点ではなく学習プロセス（到達度）に焦点を当てる

# 対話モデル
- GROWを Reality → Goal → Options/Will の順で進める
- SMART を意識し、Specific / Measurable / Achievable / Relevant / Time-bound な回答を促す
- 導入で「これから3つ質問する」と伝え、基本は3質問で完結
- ただし、生徒の回答が不十分な場合は1回だけ深掘り質問を追加してよい

# 回答の質の確保
- 生徒の回答が抽象的（「頑張る」「たくさん」など）な場合、**1回だけ**具体化を促す
  - 例: 「頑張る」→「どんな風に頑張る？」
  - 例: 「たくさん」→「何回くらい？」
- ただし追いつめず、「具体的にしてくれると嬉しいな」程度の優しい誘導にとどめる
- 2回目の回答も抽象的な場合は、そのまま受け入れて次へ進む

# テスト結果への対応
- 生徒がテスト点数を目標にした場合（「90点取りたい」など）、否定せず行動目標に変換する
  - 例: 「90点を取るために、どんな学習行動を増やす？」
  - 例: 「その点数を目指すなら、毎日何をするといいと思う？」
- 決して「テスト点数は目標にしない」と否定的に言わない

# 週タイプ別の配慮
- **成長週**: 成功を称賛し、さらなる挑戦を促す
- **安定週**: 新しい工夫や挑戦を提案
- **挑戦週**: セルフコンパッション最優先。「維持でもOK」「無理しない」を明示
- **特別週**: テスト準備に焦点、具体的な対策を引き出す

# 対話の完了条件
以下の3つが揃った時点でクロージングへ移行してよい：
1. 今週できたこと（Reality）が語られた
2. 来週の目標（Goal）が示された
3. 具体的行動（Options/Will）が決まった

ターン数は3〜6を目安とするが、上記が満たされれば早期終了も可能。

# ルール
- 1質問につき1〜2文、絵文字は適度に（✨📚💪🎯など）
- 生徒の回答を要約・称賛してから次の質問へ進む
- 週タイプに合わせて語調と励まし方を調整する
- 「〜できなかった」は「〜に挑戦した」と言い換える`
}

/**
 * リフレクトユーザープロンプト（v2.0）
 * フロー制御ロジック
 */
function getReflectUserPrompt(context: ReflectContext): string {
  const { turnNumber, conversationHistory } = context

  // ターン1: 質問1（Reality）
  if (turnNumber === 1) {
    return getTurn1Prompt(context)
  }

  // ターン2: 質問2（Goal）
  if (turnNumber === 2) {
    return getTurn2Prompt(context)
  }

  // ターン2.5: 質問2の深掘り（必要時）
  if (turnNumber === 3 && conversationHistory.length >= 2 && needsFollowUp(conversationHistory[conversationHistory.length - 1])) {
    return getFollowUpPrompt(context, 2)
  }

  // ターン3: 質問3（Options/Will）
  if (turnNumber === 3 || (turnNumber === 4 && conversationHistory.length >= 4)) {
    return getTurn3Prompt(context)
  }

  // ターン3.5: 質問3の深掘り（必要時）
  if (turnNumber === 4 && conversationHistory.length >= 4 && needsFollowUp(conversationHistory[conversationHistory.length - 1])) {
    return getFollowUpPrompt(context, 3)
  }

  // ターン4〜6: クロージング
  if (turnNumber >= 4 && hasCompletedGROW(conversationHistory)) {
    return getClosingPrompt(context)
  }

  // フォールバック（ターン6以降）
  return `今日の振り返りはこれで完了だよ。決めた行動を忘れずに、来週も一歩ずつ進もうね！✨`
}

/**
 * ターン1: 導入 + 質問1（Reality）
 */
function getTurn1Prompt(context: ReflectContext): string {
  const { weekType, studentName, thisWeekAccuracy, lastWeekAccuracy, accuracyDiff, upcomingTest } = context

  const intro = `${studentName}さん、今週の振り返りを始めよう！✨

これから3つの質問をするよ。
1つ目: 今週できたこと・やれたこと
2つ目: 来週の到達度をどう上げるか
3つ目: 具体的に何をするか

---`

  // データ欠損・初回・極端な変化の判定
  let contextLine = ""

  // 初回振り返り（先週のデータなし）
  if (!lastWeekAccuracy || lastWeekAccuracy === 0) {
    contextLine = `初めての振り返りだね！これから毎週一緒に成長を確認していこう✨`
  }
  // 今週データなし
  else if (thisWeekAccuracy === 0) {
    contextLine = `今週はまだ記録がないみたいだね。でも、実際には何か学習したんじゃない？記録なしでもOKだよ。`
  }
  // 極端な変化（±30%以上）
  else if (Math.abs(accuracyDiff) >= 30) {
    if (accuracyDiff > 0) {
      contextLine = `正答率が${accuracyDiff}%も大幅アップ（${lastWeekAccuracy}% → ${thisWeekAccuracy}%）したね！何か特別な工夫があったのかな？`
    } else {
      contextLine = `正答率が${Math.abs(accuracyDiff)}%下がったね（${lastWeekAccuracy}% → ${thisWeekAccuracy}%）。大きな変化があったけど、焦らず一緒に振り返ろう。`
    }
  }
  // 通常の週タイプ別
  else if (weekType === "growth") {
    contextLine = `先週より正答率が${accuracyDiff}%アップ（${lastWeekAccuracy}% → ${thisWeekAccuracy}%）しているよ。素晴らしい伸びだね！`
  } else if (weekType === "stable") {
    contextLine = `今週の正答率は${thisWeekAccuracy}%で、先週と同じくらい安定して取り組めたね。`
  } else if (weekType === "challenge") {
    contextLine = `正答率は${Math.abs(accuracyDiff)}%下がったけれど（${lastWeekAccuracy}% → ${thisWeekAccuracy}%）、難しい課題に挑戦した証拠だよ。`
  } else {
    const testName = upcomingTest?.test_types?.name || "テスト"
    const testDate = upcomingTest?.test_date ? new Date(upcomingTest.test_date).toLocaleDateString("ja-JP", { month: 'long', day: 'numeric' }) : ""
    contextLine = `来週は${testName}（${testDate}）があるね。大事な準備期間だったはずだよ。`
  }

  return `${intro}

【質問1/3】今週できたこと・やれたこと
${contextLine}

この1週間で「これはできた！」「これはやれた！」と感じたことを教えて。小さなことでも大丈夫だよ。`
}

/**
 * ターン2: 質問2（Goal）- 週タイプ別調整
 */
function getTurn2Prompt(context: ReflectContext): string {
  const { weekType, studentName, conversationHistory } = context

  // 前回答の引用（共感強化）
  const lastAnswer = conversationHistory[conversationHistory.length - 1]?.content || ""
  const answerPreview = lastAnswer.length > 40 ? lastAnswer.slice(0, 40) + "..." : lastAnswer
  const reference = lastAnswer ? `「${answerPreview}」って頑張ったんだね。` : ""

  // 週タイプ別の称賛
  let praise = ""
  if (weekType === "challenge") {
    praise = `${studentName}さん、挑戦を続けている姿勢がとても素敵だよ💪`
  } else {
    praise = `${studentName}さん、今週の頑張りがしっかり力になっているね✨`
  }

  // 挑戦週の場合は「維持でもOK」を明示
  let goalQuestion = ""
  if (weekType === "challenge") {
    goalQuestion = `【質問2/3】来週の目標を考えよう

テストの点ではなく、「学習の質や量」について考えてみよう。
**無理に増やさなくても大丈夫**。今のペースを維持するだけでも立派だよ。

例えば：
- 今週と同じペースで続ける（維持）
- 復習時間を少し増やす（小さく改善）
- 間違えた問題だけ見直す（質の向上）

${studentName}さんは、来週どんな風に取り組みたい？`
  } else {
    goalQuestion = `【質問2/3】来週の到達度をどう上げる？

テストの点ではなく、「学習の質や量」を上げる視点で考えてみよう。

例えば：
- 毎日1回やっていた復習を2回にする
- 間違えた問題をもう一度解き直す
- わかるまで説明を書き出す

先週と比べて、どんな行動を増やしたい？`
  }

  return `${reference}
${praise}

${goalQuestion}`
}

/**
 * ターン3: 質問3（Options/Will）
 */
function getTurn3Prompt(context: ReflectContext): string {
  const { conversationHistory } = context

  // 前回答の引用
  const lastAnswer = conversationHistory[conversationHistory.length - 1]?.content || ""
  const answerPreview = lastAnswer.length > 30 ? lastAnswer.slice(0, 30) + "..." : lastAnswer
  const reference = lastAnswer ? `「${answerPreview}」、いい目標だね！` : ""

  return `${reference}

【質問3/3】具体的に何をする？

その目標を実現するために、来週は「いつ・どこで・何を・どのくらい」やる？
曜日や回数、時間など、できるだけ具体的に教えて。

例えば：
- 「月・水・金の夜7時に算数の復習を30分」
- 「毎朝学校前に漢字を10問」
- 「間違えた理科の問題を週末に全部解き直す」`
}

/**
 * 深掘り質問（必要時のみ）
 */
function getFollowUpPrompt(context: ReflectContext, questionNumber: 2 | 3): string {
  const { studentName, conversationHistory } = context

  // 質問2の深掘り（Goal段階）- 既存のまま
  if (questionNumber === 2) {
    return `${studentName}さんの気持ちはわかったよ。
もう少し具体的に教えてくれると嬉しいな。

「どの科目の」「何を」増やしたい？`
  }

  // 質問3の深掘り（Will段階）
  if (questionNumber === 3) {
    const lastAnswer = conversationHistory[conversationHistory.length - 1]?.content || ""

    // 🆕 困惑または曖昧タイミングを検出したら「足場かけ＋選択肢提示」モードへ
    const hasHesitation = /うーん|難しい|わからない|思いつかない/.test(lastAnswer)
    const hasVagueTiming = /やれる時|できる時|余裕|暇|空いた時/.test(lastAnswer)

    if (hasHesitation || hasVagueTiming) {
      // 足場かけ: 具体的な選択肢を提示して自己決定を支援
      return `${studentName}さん、正直に言ってくれてありがとう✨
スケジュールを立てるのって難しいよね。

だから、いくつかパターンを考えてみたよ。この中で「これならできそう」って思うものはある？

**パターン1**: 月・水・金の夜、宿題が終わった後に少しずつ
**パターン2**: 土日にまとめて取り組む
**パターン3**: 毎朝学校に行く前に少しだけ

どれが${studentName}さんに合いそう？
それとも他にいいやり方がある？😊`
    }

    // 通常の深掘り（困惑なしの場合）
    return `いいね！${studentName}さんの意気込みが伝わってくるよ💪

もう少し詳しく教えて。
「何曜日に」「何回くらい」やる予定？`
  }

  return ""
}

/**
 * クロージング（個別化）
 */
function getClosingPrompt(context: ReflectContext): string {
  const { studentName, weekType, conversationHistory } = context

  // 生徒の具体的行動を抽出（簡易版）
  const lastAnswer = conversationHistory[conversationHistory.length - 1]?.content || ""
  const hasSpecificAction = lastAnswer.length > 15
  const actionSummary = hasSpecificAction
    ? `「${lastAnswer.slice(0, 50)}${lastAnswer.length > 50 ? "..." : ""}」を実行するんだね！`
    : ""

  // 週タイプ別の励まし
  let encouragement = ""
  if (weekType === "challenge") {
    encouragement = `無理せず、自分のペースで進めば大丈夫だよ。休むことも大事な戦略だからね。`
  } else if (weekType === "special") {
    encouragement = `テストまでしっかり準備していこうね。応援しているよ！`
  } else {
    encouragement = `決めたことを忘れずに、来週も自分のペースで進んでいこう。`
  }

  return `${studentName}さん、今日の振り返りありがとう！✨
${actionSummary}

今日話したのは、
✅ 今週できたこと・やれたこと
✅ 来週の目標（到達度の上げ方）
✅ 具体的な行動計画

${encouragement}

もし途中で「これは無理そう」って思ったら、調整しても全然OK。
大事なのは、自分に合ったやり方を見つけることだからね😊

来週の土曜日に「やってみた感想」を聞かせてね。楽しみにしてるよ💪`
}

/**
 * 深掘りが必要か判定
 */
function needsFollowUp(lastMessage: { role: string; content: string } | undefined): boolean {
  if (!lastMessage || lastMessage.role !== "user") return false

  const content = lastMessage.content
  const isAbstract = /頑張る|たくさん|よく|ちゃんと|しっかり|もっと|がんばる/i.test(content)
  const isVague = content.length < 10

  // 🆕 時間的曖昧性の検出
  const hasVagueTiming = /やれる時|できる時|やりたくなったら|気が向いたら|余裕|暇|空いた時|ある時/.test(content)

  // 🆕 困惑シグナルの検出（スケジュール立案が困難な状態）
  const hasHesitation = /うーん|難しい|わからない|思いつかない|無理|厳しい/.test(content)

  return isAbstract || isVague || hasVagueTiming || hasHesitation
}

/**
 * GROW完了判定
 */
function hasCompletedGROW(conversationHistory: { role: string; content: string }[]): boolean {
  const userResponses = conversationHistory.filter(msg => msg.role === "user")

  // 最低3つの回答が必要（Reality, Goal, Options/Will）
  if (userResponses.length < 3) return false

  // 最後の回答に具体性があるか（SMARTの簡易チェック）
  const lastResponse = userResponses[userResponses.length - 1]?.content || ""

  // 🔧 曖昧な時間表現を先に弾く（「やれる時」「やりたくなったら」などの誤検知防止）
  const hasVagueTiming = /やれる時|できる時|やりたくなったら|気が向いたら|余裕|暇|空いた時|ある時/.test(lastResponse)
  if (hasVagueTiming) return false

  // 🔧 具体的なタイミング表現のみを検出（細分化して精度向上、全角数字対応）
  const hasSufficientLength = lastResponse.length >= 10  // 15 → 10 に緩和（短いが具体的な回答を許容）
  const hasSpecificDay = /月曜|火曜|水曜|木曜|金曜|土曜|日曜|毎日|毎朝|毎晩|毎週/.test(lastResponse)
  const hasSpecificTime = /[0-9０-９]+時|[0-9０-９]+分|午前|午後|朝|昼|夜|放課後|寝る前/.test(lastResponse)
  const hasSpecificFrequency = /[0-9０-９]+回|[0-9０-９]+問|[0-9０-９]+時間/.test(lastResponse)
  // 🆕 具体的な場所・タイミング・文脈の検出
  const hasSpecificContext = /授業後|トレーニング|図書館|家で|学校で|塾で|部活後|休み時間|朝の時間|夜の時間|学習室/.test(lastResponse)

  const hasSpecificity = hasSufficientLength &&
                         (hasSpecificDay || hasSpecificTime || hasSpecificFrequency || hasSpecificContext)

  return hasSpecificity || userResponses.length >= 5 // 5往復したら強制完了
}
