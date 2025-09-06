import { chat } from '@/lib/api/chat'
import { validateSMARTGoal, suggestRealisticTarget, type SMARTGoal } from '@/lib/utils/smart-validation'

export type GROWPhase = 'goal' | 'reality' | 'options' | 'will' | 'complete'

export interface CoachingSession {
  id: string
  studentId: string
  phase: GROWPhase
  conversationHistory: ConversationMessage[]
  currentGoal?: Partial<SMARTGoal>
  studentData?: StudentLearningData
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  role: 'coach' | 'student'
  content: string
  timestamp: string
  phase: GROWPhase
}

export interface StudentLearningData {
  recentScores: number[]
  studyTimeHistory: number[]
  consistencyRate: number
  strongSubjects: string[]
  weakSubjects: string[]
  averageUnderstanding: number
  totalRecords: number
}

export interface CoachingResponse {
  message: string
  nextPhase?: GROWPhase
  suggestions?: string[]
  goalDraft?: Partial<SMARTGoal>
  isComplete: boolean
}

/**
 * GROWモデルに基づいてAI目標コーチングを実行
 */
export class AIGoalCoach {
  /**
   * コーチングセッションを開始
   */
  static async startSession(
    studentId: string,
    studentData: StudentLearningData
  ): Promise<CoachingSession> {
    const session: CoachingSession = {
      id: generateSessionId(),
      studentId,
      phase: 'goal',
      conversationHistory: [],
      studentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return session
  }

  /**
   * 学生のメッセージに対してコーチングレスポンスを生成
   */
  static async processMessage(
    session: CoachingSession,
    studentMessage: string
  ): Promise<{ session: CoachingSession; response: CoachingResponse }> {
    // メッセージを履歴に追加
    const updatedSession = {
      ...session,
      conversationHistory: [
        ...session.conversationHistory,
        {
          role: 'student' as const,
          content: studentMessage,
          timestamp: new Date().toISOString(),
          phase: session.phase
        }
      ],
      updatedAt: new Date().toISOString()
    }

    // 現在のフェーズに応じた処理
    const response = await this.generateResponse(updatedSession, studentMessage)

    // コーチの返答を履歴に追加
    updatedSession.conversationHistory.push({
      role: 'coach',
      content: response.message,
      timestamp: new Date().toISOString(),
      phase: session.phase
    })

    // フェーズの更新
    if (response.nextPhase) {
      updatedSession.phase = response.nextPhase
    }

    // 目標草案の更新
    if (response.goalDraft) {
      updatedSession.currentGoal = {
        ...updatedSession.currentGoal,
        ...response.goalDraft
      }
    }

    return { session: updatedSession, response }
  }

  /**
   * フェーズに応じたAIレスポンスを生成
   */
  private static async generateResponse(
    session: CoachingSession,
    studentMessage: string
  ): Promise<CoachingResponse> {
    const systemPrompt = this.getSystemPrompt(session.phase, session.studentData!)
    const conversationContext = this.buildConversationContext(session)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationContext,
      { role: 'user' as const, content: studentMessage }
    ]

    try {
      const aiResponse = await chat(messages)
      return this.parseAIResponse(aiResponse.message.content, session.phase)
    } catch (error) {
      console.error('AI coaching error:', error)
      return this.getFallbackResponse(session.phase)
    }
  }

  /**
   * フェーズ別のシステムプロンプトを生成
   */
  private static getSystemPrompt(phase: GROWPhase, studentData: StudentLearningData): string {
    const baseContext = `
あなたは学習目標設定を支援する専門コーチです。GROWモデル（Goal, Reality, Options, Will）に従って対話を進めてください。

生徒の学習データ：
- 最近の成績: ${studentData.recentScores.join(', ')}点
- 平均理解度: ${studentData.averageUnderstanding}/5.0
- 学習継続率: ${studentData.consistencyRate}%
- 得意科目: ${studentData.strongSubjects.join(', ')}
- 苦手科目: ${studentData.weakSubjects.join(', ')}
- 総学習記録数: ${studentData.totalRecords}件

常に励ましの気持ちを込めて、親しみやすい口調で話してください。
一度に聞くのは1-2個の質問までに限定し、生徒が答えやすいように配慮してください。
`

    switch (phase) {
      case 'goal':
        return baseContext + `
現在のフェーズ: Goal（目標設定）
生徒が具体的で意味のある目標を設定できるよう支援してください。

重要なポイント：
- どの科目や分野で成長したいか
- なぜその目標が重要なのか  
- どのような状態になりたいか
- 数値で表現できる部分があるか

生徒の学習データを踏まえて、現実的でやる気の出る目標設定をサポートしてください。
`

      case 'reality':
        return baseContext + `
現在のフェーズ: Reality（現状把握）
生徒の現在の状況を客観的に把握できるよう支援してください。

重要なポイント：
- 現在のスキルレベルや成績状況
- これまでの取り組み内容と結果
- 今直面している課題や困難
- 利用可能な時間やリソース

学習データも参考にしながら、現状を正しく認識できるようサポートしてください。
`

      case 'options':
        return baseContext + `
現在のフェーズ: Options（選択肢の検討）
目標達成のための具体的な方法や選択肢を生徒と一緒に考えてください。

重要なポイント：
- 具体的な学習方法や戦略
- 時間配分や学習スケジュール  
- 利用できる教材やリソース
- サポートを得られる人や環境

生徒が複数の選択肢から最適な方法を選べるよう支援してください。
`

      case 'will':
        return baseContext + `
現在のフェーズ: Will（意志・行動計画）
生徒が目標達成に向けた具体的な行動計画を立てられるよう支援してください。

重要なポイント：
- いつから始めるか（開始時期）
- どのような順序で取り組むか
- 進捗確認の方法と頻度
- 困った時の対処法

SMART原則に基づいた実行可能な計画作成をサポートしてください。
`

      default:
        return baseContext + 'フレンドリーで建設的な対話を心がけてください。'
    }
  }

  /**
   * 会話履歴からコンテキストを構築
   */
  private static buildConversationContext(session: CoachingSession) {
    return session.conversationHistory.slice(-6).map(msg => ({
      role: msg.role === 'coach' ? 'assistant' as const : 'user' as const,
      content: msg.content
    }))
  }

  /**
   * AIレスポンスを解析してCoachingResponseに変換
   */
  private static parseAIResponse(content: string, currentPhase: GROWPhase): CoachingResponse {
    // フェーズ進行の判定（簡易的な実装）
    let nextPhase: GROWPhase | undefined

    const phaseTransitions = {
      goal: 'reality' as GROWPhase,
      reality: 'options' as GROWPhase,
      options: 'will' as GROWPhase,
      will: 'complete' as GROWPhase
    }

    // フェーズ完了の判定キーワード（実際にはより詳細な解析が必要）
    const completionKeywords = ['次に進', '現状を', '方法を', '計画を', '決めました', '実行します']
    
    if (completionKeywords.some(keyword => content.includes(keyword))) {
      nextPhase = phaseTransitions[currentPhase as keyof typeof phaseTransitions]
    }

    // 提案の抽出（簡易的）
    const suggestions: string[] = []
    if (content.includes('・')) {
      const suggestionMatches = content.match(/・([^・\n]+)/g)
      if (suggestionMatches) {
        suggestions.push(...suggestionMatches.map(match => match.replace('・', '').trim()))
      }
    }

    return {
      message: content,
      nextPhase,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      isComplete: nextPhase === 'complete'
    }
  }

  /**
   * AI応答エラー時のフォールバック
   */
  private static getFallbackResponse(phase: GROWPhase): CoachingResponse {
    const fallbackMessages = {
      goal: 'どのような目標を設定したいか、もう一度教えてもらえますか？',
      reality: '現在の状況について、詳しく聞かせてください。',
      options: 'どのような方法で取り組みたいか、一緒に考えてみましょう。',
      will: '具体的にどのように進めていくか、計画を立てていきましょう。',
      complete: '目標設定お疲れさまでした！'
    }

    return {
      message: fallbackMessages[phase] || 'もう一度お聞かせください。',
      isComplete: false
    }
  }

  /**
   * 完成した目標をSMART原則で検証
   */
  static validateGoal(goal: SMARTGoal) {
    return validateSMARTGoal(goal)
  }

  /**
   * 学習データから現実的な目標値を提案
   */
  static suggestTargetValues(
    studentData: StudentLearningData,
    targetType: 'score' | 'time' | 'frequency'
  ) {
    const currentValue = this.getCurrentValue(studentData, targetType)
    const historicalData = this.getHistoricalData(studentData, targetType)
    
    return suggestRealisticTarget(currentValue, historicalData, targetType)
  }

  private static getCurrentValue(data: StudentLearningData, type: 'score' | 'time' | 'frequency'): number {
    switch (type) {
      case 'score':
        return data.recentScores.length > 0 ? data.recentScores[data.recentScores.length - 1] : 0
      case 'time':
        return data.studyTimeHistory.length > 0 ? data.studyTimeHistory[data.studyTimeHistory.length - 1] : 0
      case 'frequency':
        return data.totalRecords
      default:
        return 0
    }
  }

  private static getHistoricalData(data: StudentLearningData, type: 'score' | 'time' | 'frequency'): number[] {
    switch (type) {
      case 'score':
        return data.recentScores
      case 'time':
        return data.studyTimeHistory
      case 'frequency':
        return [data.totalRecords] // 簡易的な実装
      default:
        return []
    }
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}