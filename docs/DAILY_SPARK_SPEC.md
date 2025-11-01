# Daily Spark システム仕様書

## 概要

生徒の学習達成を視覚的に祝福し、内発的動機づけを促進するシステム。
ヘッダーのStudySparkロゴが、達成状況に応じて変化する。

---

## 設計方針

### 基本思想
- **シンプル・イズ・ビューティフル** - 複雑な報酬システムは避ける
- **指針は明確に、基準は厳格に** - 曖昧な達成基準は設けない
- **努力の可視化** - 達成した日としていない日を明確に区別

### 教育心理学的根拠
1. **目標の明確性** - 「今日のミッション完了」という1つの明確な目標
2. **即時フィードバック** - 達成→即座にロゴが変化
3. **自己効力感** - 自分の努力で環境が変わる実感
4. **内発的動機づけ** - 外部報酬ではなく達成感を可視化

---

## ロゴの状態仕様

### 生徒画面

#### **未達成状態**
```
表示: StudySpark（グレー、text-gray-700）
条件: 今日のミッション未完了
```

#### **達成状態**
```
表示: StudySpark（青紫グラデーション）
      bg-gradient-to-r from-blue-500 to-purple-600
条件: 今日のミッション完了
装飾: なし（星は不要 - シンプルイズビューティフル）
```

### 保護者画面

#### **基本表示**
- 選択中の子供の達成状態をそのまま表示
- グレー（未達成）or 青紫グラデーション（達成）

#### **保護者の応援表示**
```
表示: 子供アバターバッジに小さなハートマーク（❤️）
位置: 選択中の子供のアバター右上
条件: 保護者が今日その子に応援メッセージを送信済み
重要: ハートは保護者画面のみ表示、生徒画面には表示しない
```

---

## 達成判定ロジック（厳格版）

### 今日のミッション完了の定義

**厳格基準：指定3科目すべて完了**

```typescript
// 判定ロジック
1. 今日の曜日を取得（月曜=1, 火曜=2, ..., 日曜=0）
2. 曜日に応じた「今日のミッション」科目を決定
3. study_logsテーブルから今日の学習記録を取得
4. ミッション科目すべてに学習記録があるかチェック
5. すべて揃っていれば「達成」、1つでも欠けていれば「未達成」
```

### 今日のミッションマッピング

**ブロックローテーション（月〜土）:**
```
月曜・火曜（ブロックA）: 算数、国語、社会
水曜・木曜（ブロックB）: 算数、国語、理科
金曜・土曜（ブロックC）: 算数、理科、社会
```

**日曜日（特別）:**
```
日曜日: 週次振り返り（リフレクト）完了
```

### 日曜日の達成判定

**判定基準：今週の振り返りが完了しているか**

```typescript
// 日曜日の判定ロジック
1. 今日が日曜日かチェック
2. 今週の月曜日の日付を計算（week_start_date）
3. coaching_sessionsテーブルから今週のセッションを検索
4. status = "completed" かつ completed_at IS NOT NULL をチェック
5. 条件を満たせば「達成」、そうでなければ「未達成」
```

**完了の定義:**
- AIコーチとの対話を最後まで完了
- `coaching_sessions.status = "completed"`
- `coaching_sessions.completed_at IS NOT NULL`
- `coaching_sessions.summary_text` が生成されている

**判定タイミング:**
- 日曜日のみ判定（月曜日になったら通常の学習記録判定に戻る）
- 利用可能期間（土曜12:00〜水曜23:59）とは独立して判定

### コード例

```typescript
function getTodayMissionSubjects(date: Date): string[] {
  const dayOfWeek = date.getDay() // 0=日, 1=月, ..., 6=土

  if (dayOfWeek === 0) {
    // 日曜日は振り返り
    return []
  }

  // 月曜=1, 火曜=2, 水曜=3, 木曜=4, 金曜=5, 土曜=6
  if (dayOfWeek === 1 || dayOfWeek === 2) {
    // ブロックA: 月火
    return ["算数", "国語", "社会"]
  } else if (dayOfWeek === 3 || dayOfWeek === 4) {
    // ブロックB: 水木
    return ["算数", "国語", "理科"]
  } else {
    // ブロックC: 金土
    return ["算数", "理科", "社会"]
  }
}

async function checkTodayMissionComplete(studentId: number, date: string): Promise<boolean> {
  // 1. 今日のミッション科目を取得
  const missionSubjects = getTodayMissionSubjects(new Date(date))

  // 日曜日は判定しない
  if (missionSubjects.length === 0) return false

  // 2. 今日の学習記録を取得
  const { data: logs } = await supabase
    .from("study_logs")
    .select("subject")
    .eq("student_id", studentId)
    .eq("study_date", date)

  if (!logs) return false

  // 3. 記録された科目を抽出
  const recordedSubjects = [...new Set(logs.map(log => log.subject))]

  // 4. すべてのミッション科目が記録されているかチェック
  return missionSubjects.every(subject => recordedSubjects.includes(subject))
}
```

---

## データベーススキーマ

### study_logs テーブル（既存）
```sql
- student_id: integer (生徒ID)
- study_date: date (学習日、JST)
- subject: text (科目: "算数", "国語", "理科", "社会")
- content: text (学習内容)
- その他フィールド...
```

### encouragement_messages テーブル（既存）
```sql
- sender_user_id: uuid (送信者のユーザーID、保護者）
- student_id: integer (対象生徒ID)
- created_at: timestamp (送信日時)
- message: text (応援メッセージ本文)
```

---

## UI/UXの特徴

### デザイン原則
1. **ミニマリズム** - 星やエフェクトは不要、色の変化のみ
2. **明確性** - グレー vs グラデーションの2択のみ
3. **スムーズな変化** - transition-all duration-700

### ユーザー体験フロー

#### 生徒の1日
```
朝: ログイン → ロゴがグレー → 「今日も頑張ろう」
昼: 算数を記録 → まだグレー → 「あと2科目」
夕方: 国語を記録 → まだグレー → 「あと1科目」
夜: 社会を記録 → ロゴが輝く！ → 「やった！達成！」
```

#### 保護者の1日
```
朝: ログイン → 子供のロゴがグレー → 「今日はこれから」
昼: 応援メッセージ送信 → アバターに❤️表示 → 「応援した」
夜: 再ログイン → ロゴが輝いている + ❤️ → 「頑張ったね！」
```

---

## 実装ファイル

### コアロジック
- `lib/utils/daily-spark.ts` - 判定ロジック
- `lib/utils/get-today-mission.ts` - ミッション科目取得（新規作成予定）

### UIコンポーネント
- `components/common/daily-spark-logo.tsx` - ロゴコンポーネント
- `components/common/user-profile-header.tsx` - ヘッダー統合

### スタイル
- `app/globals.css` - グラデーションスタイル

---

## 将来の拡張可能性（Phase 2以降）

### 検討中の機能
- 連続達成日数の表示（3日、7日、30日）
- 季節イベント（組分けテスト週間など）
- 週間/月間レポートでの達成率可視化

### 拡張時の原則
- **シンプルさを維持** - 複雑な報酬システムは避ける
- **基準は明確に** - 曖昧な達成条件は設けない
- **ユーザーテスト必須** - 拡張前に実際の生徒/保護者で検証

---

## テストケース

### 達成判定テスト

#### ケース1: ミッション完了（月曜日）
```
日付: 2025-11-03（月曜日）
ミッション: 算数、国語、社会
学習記録:
  - 算数: 類題
  - 国語: 漢字
  - 社会: 地理
結果: 達成 ✅
```

#### ケース2: 1科目不足（月曜日）
```
日付: 2025-11-03（月曜日）
ミッション: 算数、国語、社会
学習記録:
  - 算数: 類題
  - 国語: 漢字
結果: 未達成 ❌（社会が不足）
```

#### ケース3: ミッション外の科目（月曜日）
```
日付: 2025-11-03（月曜日）
ミッション: 算数、国語、社会
学習記録:
  - 算数: 類題
  - 国語: 漢字
  - 理科: 実験（ミッション外）
結果: 未達成 ❌（社会が不足）
```

#### ケース4: 日曜日（振り返り未完了）
```
日付: 2025-11-02（日曜日）
ミッション: 週次振り返り
今週の振り返り: 未完了（status = "in_progress" または存在しない）
結果: 未達成 ❌
```

#### ケース5: 日曜日（振り返り完了）
```
日付: 2025-11-02（日曜日）
ミッション: 週次振り返り
今週の振り返り: 完了
  - status = "completed"
  - completed_at IS NOT NULL
  - summary_text が生成されている
結果: 達成 ✅
```

#### ケース6: 月曜日（前週振り返り済み）
```
日付: 2025-11-03（月曜日）
ミッション: 算数、国語、社会
前週の振り返り: 完了（関係なし）
学習記録: 算数、国語のみ
結果: 未達成 ❌（社会が不足。月曜日は振り返り判定しない）
```

---

## 変更履歴

### v1.0（2025-11-02）
- 初版作成
- シンプル2段階システム（グレー vs グラデーション）
- 厳格版ミッション判定（指定3科目すべて完了）
- 保護者のハートマーク（子供アバターバッジ）

---

## 参考資料

### 教育心理学
- Deci, E. L., & Ryan, R. M. (2000). The "what" and "why" of goal pursuits: Human needs and the self-determination of behavior.
- Locke, E. A., & Latham, G. P. (1990). A theory of goal setting & task performance.

### UI/UX設計
- Nielsen Norman Group - "Visibility of System Status"
- Don Norman - "The Design of Everyday Things"
