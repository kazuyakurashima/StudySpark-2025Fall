/**
 * 応援メッセージ パーソナライズ生成テスト
 *
 * テスト対象:
 * - プロンプト生成（スタイル注入・コンテキスト対応・1案出力）
 * - キャッシュキー生成（styleSnapshotHash・senderId・userContext）
 * - editDistance 計算
 */

import {
  getPersonalizedEncouragementSystemPrompt,
  getPersonalizedEncouragementUserPrompt,
  type EncouragementContext,
} from "../prompts"
import { calculateEditDistance } from "@/lib/utils/event-tracking"

// ============================================================
// プロンプト生成テスト
// ============================================================

describe("getPersonalizedEncouragementSystemPrompt", () => {
  it("parent ロールで保護者用プロンプトを生成する", () => {
    const prompt = getPersonalizedEncouragementSystemPrompt("parent")
    expect(prompt).toContain("保護者")
    expect(prompt).toContain("メッセージを1つだけ生成")
    expect(prompt).not.toContain("3案")
  })

  it("coach ロールで指導者用プロンプトを生成する", () => {
    const prompt = getPersonalizedEncouragementSystemPrompt("coach")
    expect(prompt).toContain("指導者")
    expect(prompt).toContain("メッセージを1つだけ生成")
  })

  it("スタイル踏襲ポイントを含む", () => {
    const prompt = getPersonalizedEncouragementSystemPrompt("parent")
    expect(prompt).toContain("語尾のパターン")
    expect(prompt).toContain("絵文字")
    expect(prompt).toContain("スタイル踏襲")
  })
})

describe("getPersonalizedEncouragementUserPrompt", () => {
  const baseContext: EncouragementContext = {
    studentName: "テスト太郎",
    senderRole: "parent",
    senderName: "テスト保護者",
  }

  it("送信者メッセージがない場合でもプロンプトを生成する", () => {
    const prompt = getPersonalizedEncouragementUserPrompt(baseContext)
    expect(prompt).toContain("テスト太郎さん")
    expect(prompt).toContain("テスト保護者")
    expect(prompt).toContain('"message"')
    expect(prompt).not.toContain("過去メッセージ")
  })

  it("送信者メッセージを注入する", () => {
    const context: EncouragementContext = {
      ...baseContext,
      senderMessages: ["頑張ったね！", "今日もよくやったね"],
    }
    const prompt = getPersonalizedEncouragementUserPrompt(context)
    expect(prompt).toContain("過去メッセージ")
    expect(prompt).toContain("頑張ったね！")
    expect(prompt).toContain("今日もよくやったね")
  })

  it("ユーザーコンテキストを注入する", () => {
    const context: EncouragementContext = {
      ...baseContext,
      userContext: "苦手だった年齢算が解けた",
    }
    const prompt = getPersonalizedEncouragementUserPrompt(context)
    expect(prompt).toContain("送信者からの一言")
    expect(prompt).toContain("苦手だった年齢算が解けた")
  })

  it("空のuserContextは注入しない", () => {
    const context: EncouragementContext = {
      ...baseContext,
      userContext: "  ",
    }
    const prompt = getPersonalizedEncouragementUserPrompt(context)
    expect(prompt).not.toContain("送信者からの一言")
  })

  it("バッチ応援の情報を含む", () => {
    const context: EncouragementContext = {
      ...baseContext,
      batchPerformance: {
        isBatch: true,
        subjects: ["算数", "国語"],
        subjectCount: 2,
        totalProblems: 20,
        totalCorrect: 16,
        averageAccuracy: 80,
        studyDate: "2026-03-14",
        sessionNumber: 5,
      },
    }
    const prompt = getPersonalizedEncouragementUserPrompt(context)
    expect(prompt).toContain("複数科目")
    expect(prompt).toContain("算数・国語")
    expect(prompt).toContain("2科目")
  })

  it("単一科目の情報を含む", () => {
    const context: EncouragementContext = {
      ...baseContext,
      recentPerformance: {
        subject: "算数",
        accuracy: 85,
        problemCount: 10,
        sessionNumber: 3,
        date: "2026-03-14",
      },
    }
    const prompt = getPersonalizedEncouragementUserPrompt(context)
    expect(prompt).toContain("算数")
    expect(prompt).toContain("85%")
    expect(prompt).toContain("10問")
  })

  it("1案出力の指示を含む", () => {
    const prompt = getPersonalizedEncouragementUserPrompt(baseContext)
    expect(prompt).toContain("1つ作成")
    expect(prompt).toContain('"message"')
    expect(prompt).not.toContain('"messages"')
  })
})

// ============================================================
// editDistance テスト
// ============================================================

describe("calculateEditDistance", () => {
  it("同一文字列で0を返す", () => {
    expect(calculateEditDistance("hello", "hello")).toBe(0)
  })

  it("空文字列との距離は文字数", () => {
    expect(calculateEditDistance("", "abc")).toBe(3)
    expect(calculateEditDistance("abc", "")).toBe(3)
  })

  it("1文字の置換で1を返す", () => {
    expect(calculateEditDistance("abc", "adc")).toBe(1)
  })

  it("1文字の追加で1を返す", () => {
    expect(calculateEditDistance("abc", "abcd")).toBe(1)
  })

  it("1文字の削除で1を返す", () => {
    expect(calculateEditDistance("abcd", "abc")).toBe(1)
  })

  it("日本語文字列でも正しく計算する", () => {
    expect(calculateEditDistance("頑張ったね！", "頑張ったね")).toBe(1)
    expect(calculateEditDistance("算数頑張ったね", "国語頑張ったね")).toBe(2)
  })

  it("完全に異なる文字列では適切な距離を返す", () => {
    const dist = calculateEditDistance("abc", "xyz")
    expect(dist).toBe(3)
  })
})
