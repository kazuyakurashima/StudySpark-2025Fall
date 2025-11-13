# 非正規化カラム復旧スクリプト

## 概要

`repair-denormalized-trace-ids.ts`は、`langfuse_traces`テーブルにトレースが存在するが、既存テーブルの`langfuse_trace_id`カラムがnullになっている場合に、それを復旧するスクリプトです。

## 使用場面

### 1. 非正規化カラム更新失敗

**症状**: ログに以下のようなメッセージが出力される

```
[TraceManager] DENORMALIZATION FAILURE - trace saved but denormalized column update failed
```

**原因**:
- ネットワーク一時的な障害
- Supabaseの一時的なダウン
- アプリケーションのバグ

**対応**: このスクリプトを実行して復旧

### 2. データベースの整合性チェック

定期的な整合性チェックの一環として実行

---

## 実行方法

### 前提条件

- `.env.local`に`SUPABASE_SERVICE_ROLE_KEY`が設定されている
- `langfuse_traces`テーブルにデータが存在する

### ローカル環境での実行

```bash
# 環境変数を読み込んで実行
npx tsx scripts/repair-denormalized-trace-ids.ts
```

### 本番環境での実行

```bash
# Vercel環境変数を使って実行
vercel env pull .env.production.local
npx tsx scripts/repair-denormalized-trace-ids.ts
```

---

## スクリプトの動作

### 処理フロー

1. **ai_coach_messagesのチェック**
   - `langfuse_traces`から`entity_type = 'ai_coach_message'`のトレースを取得
   - 各トレースに対応する`ai_coach_messages`レコードをチェック
   - `langfuse_trace_id`がnullなら更新

2. **encouragement_messagesのチェック**
   - 同様に`entity_type = 'encouragement_message'`を処理

3. **reflectionsのチェック**
   - 同様に`entity_type = 'reflection'`を処理

### 出力例

```
🔧 Repairing denormalized trace IDs...

📋 Checking ai_coach_messages...
✅ Repaired ai_coach_message 550e8400-e29b-41d4-a716-446655440000
✅ Repaired ai_coach_message 550e8400-e29b-41d4-a716-446655440001

📋 Checking encouragement_messages...

📋 Checking reflections...
✅ Repaired reflection 550e8400-e29b-41d4-a716-446655440002

✅ Repaired 3 denormalized trace IDs
```

---

## パフォーマンス考慮事項

### 現在の実装（全件走査）

**対象件数**: 現時点で数百〜数千件程度

**実行時間**: 1〜5分程度

**メモリ使用量**: 低（逐次処理）

### 将来的な改善（10万件超えたら）

トレース数が**10万件**を超えたら、以下の最適化を検討：

#### 1. 差分抽出による高速化

```typescript
// 現在: 全件チェック
const { data: coachTraces } = await supabase
  .from("langfuse_traces")
  .select("entity_id, trace_id")
  .eq("entity_type", "ai_coach_message")

// 改善後: langfuse_trace_id IS NULL のみチェック
const { data: brokenMessages } = await supabase
  .from("ai_coach_messages")
  .select("id")
  .is("langfuse_trace_id", null)
  .limit(1000)  // バッチ処理

// langfuse_tracesからトレースIDを取得して更新
```

#### 2. ページング処理

大量データを一度に処理しない：

```typescript
const BATCH_SIZE = 100

for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
  const { data } = await supabase
    .from("langfuse_traces")
    .select("entity_id, trace_id")
    .range(offset, offset + BATCH_SIZE - 1)

  // 処理
}
```

#### 3. 並列処理

非同期処理を並列化：

```typescript
await Promise.all([
  repairCoachMessages(),
  repairEncouragementMessages(),
  repairReflections(),
])
```

---

## トラブルシューティング

### エラー: SUPABASE_SERVICE_ROLE_KEY is not set

**原因**: 環境変数が設定されていない

**解決策**:
```bash
# .env.localファイルを確認
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY

# なければ追加
echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" >> .env.local
```

### エラー: Failed to update denormalized column

**原因**:
- 対象レコードが存在しない（削除済み）
- Supabaseの接続エラー

**解決策**:
- ログを確認して、どのentity_idで失敗したかチェック
- 該当レコードが存在するか手動確認

---

## 定期実行の推奨

### 週次での整合性チェック

Cronジョブとして設定（オプション）:

```typescript
// app/api/langfuse/batch/repair-traces/route.ts

export async function POST(request: Request) {
  // Cron認証
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 復旧スクリプトを実行
  // ...
}
```

**Vercel Cron設定**:
```json
{
  "crons": [{
    "path": "/api/langfuse/batch/repair-traces",
    "schedule": "0 4 * * 0"  // 毎週日曜 4:00
  }]
}
```

---

## 参考

- [Langfuse実装仕様書](../docs/07-Langfuse-Specification.md)
- [技術的負債管理](../docs/08-Technical-Debt-Management.md)
