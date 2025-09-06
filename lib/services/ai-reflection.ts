import { chat } from '@/lib/api/chat'
import { getWeekPeriod, getWeekDateRange, formatWeekDisplay, analyzeWeeklyConsistency, type WeekPeriod } from '@/lib/utils/week-boundaries'

export interface WeeklyReflectionData {
  weekId: string
  weekPeriod: WeekPeriod
  goodPoints: string[]
  improvements: string[]
  goals?: string[]
  feelings?: string
}

export interface WeeklyStudyData {
  totalRecords: number
  totalStudyTime: number
  studyDays: number[]
  subjects: Record<string, number>
  averageUnderstanding: number
  consistencyRate: number
  studyDates: string[]
  understandingTrend: { date: string; level: number }[]
}

export interface AIReflectionResponse {
  encouragement: string
  specificPraise: string[]
  gentleGuidance: string[]
  nextWeekAdvice: string[]
  selfCompassionMessage: string
  motivation: string
}

/**
 * AI週次振り返りサービス
 */
export class AIReflectionService {
  /**
   * 週次振り返りデータからAIフィードバックを生成
   */
  static async generateReflectionFeedback(
    reflectionData: WeeklyReflectionData,
    studyData: WeeklyStudyData
  ): Promise<AIReflectionResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(reflectionData.weekPeriod)
      const analysisPrompt = this.buildAnalysisPrompt(reflectionData, studyData)
      
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: analysisPrompt }
      ]

      const aiResponse = await chat(messages)
      return this.parseAIResponse(aiResponse.message.content)
      
    } catch (error) {
      console.error('AI reflection generation error:', error)
      return this.getFallbackResponse(reflectionData)
    }
  }

  /**
   * 週間学習データを分析
   */
  static async analyzeWeeklyStudyData(supabase: any, studentId: string, weekId: string): Promise<WeeklyStudyData> {
    try {
      const { startDate, endDate } = getWeekDateRange(weekId)
      
      const { data: records } = await supabase
        .from('study_inputs')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      const studyRecords = records || []
      
      if (studyRecords.length === 0) {
        return {
          totalRecords: 0,
          totalStudyTime: 0,
          studyDays: [],
          subjects: {},
          averageUnderstanding: 0,
          consistencyRate: 0,
          studyDates: [],
          understandingTrend: []
        }
      }

      // Basic metrics
      const totalRecords = studyRecords.length
      const totalStudyTime = studyRecords.reduce((sum, r) => sum + (r.study_time_minutes || 0), 0)
      const studyDates = studyRecords.map(r => r.date)
      const uniqueDays = new Set(studyDates)
      const studyDays = Array.from(uniqueDays).map(dateStr => new Date(dateStr).getDay())

      // Subject analysis
      const subjects: Record<string, number> = {}
      studyRecords.forEach(record => {
        subjects[record.subject] = (subjects[record.subject] || 0) + 1
      })

      // Understanding analysis
      const understandingTrend = studyRecords.map(record => ({
        date: record.date,
        level: this.getUnderstandingScore(record.understanding_level)
      }))

      const totalUnderstanding = understandingTrend.reduce((sum, u) => sum + u.level, 0)
      const averageUnderstanding = totalUnderstanding / understandingTrend.length

      // Consistency rate (out of 7 days in a week)
      const consistencyRate = Math.round((uniqueDays.size / 7) * 100)

      return {
        totalRecords,
        totalStudyTime,
        studyDays,
        subjects,
        averageUnderstanding: Math.round(averageUnderstanding * 10) / 10,
        consistencyRate,
        studyDates,
        understandingTrend
      }

    } catch (error) {
      console.error('Error analyzing weekly study data:', error)
      return {
        totalRecords: 0,
        totalStudyTime: 0,
        studyDays: [],
        subjects: {},
        averageUnderstanding: 0,
        consistencyRate: 0,
        studyDates: [],
        understandingTrend: []
      }
    }
  }

  /**
   * セルフコンパッション重視のシステムプロンプト構築
   */
  private static buildSystemPrompt(weekPeriod: WeekPeriod): string {
    const weekDisplay = formatWeekDisplay(weekPeriod)
    
    return `あなたは学習者を支援する優しいAI振り返りコーチです。セルフコンパッション（自分への思いやり）を重視し、前向きで建設的なフィードバックを提供してください。

重要な指針：
1. **自己批判の抑制**: 「できなかった」「だめだった」等の否定的表現を避ける
2. **努力の承認**: 小さな取り組みも積極的に評価する  
3. **成長マインドセット**: 完璧ではなく改善・学習プロセスを重視
4. **具体的なサポート**: 「がんばって」ではなく具体的なアドバイス
5. **温かい口調**: 親しみやすく、励ましの気持ちを込めて

対象期間: ${weekDisplay} (${weekPeriod.weekId})

禁止表現：
- 「不十分」「足りない」「もっと〜すべき」
- 「〜できていない」「〜が悪い」
- 「努力が必要」「頑張れ」（具体性なし）

推奨表現：
- 「〜ができていて素晴らしいです」
- 「〜という点で成長が見えます」  
- 「次は〜してみてはいかがでしょうか」
- 「〜のような工夫がおすすめです」

レスポンス形式：
必ず以下のJSON形式で返答してください：
{
  "encouragement": "全体的な励ましのメッセージ",
  "specificPraise": ["具体的な称賛ポイント1", "具体的な称賛ポイント2", "具体的な称賛ポイント3"],
  "gentleGuidance": ["優しい改善提案1", "優しい改善提案2"],
  "nextWeekAdvice": ["来週の具体的アドバイス1", "来週の具体的アドバイス2", "来週の具体的アドバイス3"],
  "selfCompassionMessage": "自分に優しく接することを促すメッセージ",
  "motivation": "前向きな気持ちになる短いメッセージ"
}`
  }

  /**
   * 分析データを含むプロンプト構築
   */
  private static buildAnalysisPrompt(reflectionData: WeeklyReflectionData, studyData: WeeklyStudyData): string {
    const consistency = analyzeWeeklyConsistency(studyData.studyDates)
    const topSubjects = Object.entries(studyData.subjects)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([subject, count]) => `${subject}: ${count}回`)

    return `生徒の週次振り返りデータを分析し、セルフコンパッション重視のフィードバックを生成してください。

【生徒の振り返り内容】
良かった点:
${reflectionData.goodPoints.map(point => `- ${point}`).join('\n')}

改善したい点:
${reflectionData.improvements.map(point => `- ${point}`).join('\n')}

${reflectionData.goals ? `
目標:
${reflectionData.goals.map(goal => `- ${goal}`).join('\n')}
` : ''}

${reflectionData.feelings ? `気持ち・感想: ${reflectionData.feelings}` : ''}

【客観的学習データ】
- 学習記録数: ${studyData.totalRecords}回
- 学習時間: ${studyData.totalStudyTime}分
- 学習日数: ${consistency.studyDays}日 (継続率 ${studyData.consistencyRate}%)
- 最長連続学習: ${consistency.longestStreak}日
- 平均理解度: ${studyData.averageUnderstanding}/5.0
- 主な科目: ${topSubjects.join(', ')}
- 学習パターン: 平日${consistency.weekdays}日, 土日${consistency.weekends}日

【理解度推移】
${studyData.understandingTrend.map(u => `${u.date}: ${u.level}/5`).join(', ')}

特に以下の点に注意して分析してください：
1. 生徒自身が気づいた良い点を具体的に称賛
2. 改善点は「課題」ではなく「成長の機会」として捉える
3. データから見える努力や継続性を積極的に評価
4. 具体的で実行しやすい次週のアドバイスを提供
5. 完璧を求めず、小さな進歩を大切にする姿勢を伝える

必ずJSON形式で応答してください。`
  }

  /**
   * AIレスポンスの解析
   */
  private static parseAIResponse(content: string): AIReflectionResponse {
    try {
      // JSON部分を抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // 必須フィールドの検証
      const requiredFields = ['encouragement', 'specificPraise', 'gentleGuidance', 'nextWeekAdvice', 'selfCompassionMessage', 'motivation']
      for (const field of requiredFields) {
        if (!parsed[field]) {
          throw new Error(`Missing field: ${field}`)
        }
      }

      return {
        encouragement: parsed.encouragement,
        specificPraise: Array.isArray(parsed.specificPraise) ? parsed.specificPraise : [parsed.specificPraise],
        gentleGuidance: Array.isArray(parsed.gentleGuidance) ? parsed.gentleGuidance : [parsed.gentleGuidance],
        nextWeekAdvice: Array.isArray(parsed.nextWeekAdvice) ? parsed.nextWeekAdvice : [parsed.nextWeekAdvice],
        selfCompassionMessage: parsed.selfCompassionMessage,
        motivation: parsed.motivation
      }

    } catch (error) {
      console.error('Error parsing AI response:', error)
      throw new Error('Failed to parse AI response')
    }
  }

  /**
   * フォールバック応答
   */
  private static getFallbackResponse(reflectionData: WeeklyReflectionData): AIReflectionResponse {
    const weekDisplay = formatWeekDisplay(reflectionData.weekPeriod)
    
    return {
      encouragement: `${weekDisplay}の振り返りをしっかりと記録できて素晴らしいです。自分自身と向き合う時間を作ることは、とても大切な習慣ですね。`,
      specificPraise: [
        '振り返りを実践できていることが素晴らしいです',
        '自分の学習について考える時間を作れています',
        '良い点と改善点の両方に目を向けられています'
      ],
      gentleGuidance: [
        '完璧を目指さず、小さな改善を積み重ねていきましょう',
        '自分のペースを大切にしながら学習を続けてください'
      ],
      nextWeekAdvice: [
        '今週の良い点を来週も続けてみてください',
        '一日一つでも学習記録をつける習慣を大切に',
        '困った時は無理をせず、休息も学習の一部と考えましょう'
      ],
      selfCompassionMessage: '自分に厳しくなりすぎず、今週の努力を認めてあげてください。完璧でなくても、取り組んだこと自体が価値のあることです。',
      motivation: 'あなたの学習への取り組みを応援しています。一歩一歩、自分のペースで進んでいきましょう！'
    }
  }

  private static getUnderstandingScore(level: string): number {
    switch (level) {
      case 'excellent': return 5
      case 'good': return 4
      case 'normal': return 3
      case 'struggling': return 2
      case 'difficult': return 1
      default: return 3
    }
  }
}