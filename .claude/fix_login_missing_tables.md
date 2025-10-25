# 修正リクエスト: study_logs 未作成環境でのログイン失敗対応

## 背景
- 本番 Supabase に `study_logs` テーブルが存在しない状態で最新コードをデプロイすると、ダッシュボード系サーバーアクションが 42P01 エラーで失敗し、ログイン後にページがクラッシュする。
- `app/student/page.tsx` が `Promise.all` で `getRecentStudyLogs` など複数のアクションを同時に実行しており、どれか一つでも落ちると全体が失敗する。

## 目的
- `study_logs` や `encouragement_messages` などのテーブルが存在しない環境でも、ダッシュボード処理が安全にフォールバックし、ログインが成功するようにする。
- 後続でマイグレーションが整うまでは、空データや初期値を返す形で暫定運用できるようにする。

## 対象ファイル
- `app/actions/dashboard.ts`

## 修正方針
1. **共通ヘルパー追加 / 修正**  
   - ファイル冒頭に `isMissingTable(error, tableName)` ヘルパーを置く。  
   - Supabase が返すエラーメッセージは `"relation \"study_logs\" does not exist"`（スキーマ無し）と `"relation \"public.study_logs\" does not exist"` の両パターンがあるため、どちらにもマッチするように実装する。  
   - `tableName` には `"study_logs"` のようにテーブル名のみを渡す想定で、内部で `public.<tableName>` も併せて確認する。

2. **study_logs 参照クエリのフォールバック**  
   - 以下の関数内で `study_logs` / `encouragement_messages` を参照しているクエリに対し、エラー時に `isMissingTable` をチェックし、空配列や初期値を返すガードを追加する。
     - `getRecentStudyLogs`
     - `getStudyStreak`
     - `getWeeklySubjectProgress`
     - `getLearningCalendarData`
     - `getTodayMissionData`
     - `getTodayMissionForCoach`
     - `getRecentEncouragementMessages`
   - ログは `console.error` 等で残しつつ、`return { logs: [] }` などで処理継続させる。

3. **ログ整形**  
   - クエリ成功時の `console.log` は 42P01 が発生しなくても読み取りやすいよう最低限に保つ。

## 完了条件
- 上記の関数が `study_logs` 未作成環境で `Promise.all` を起動しても失敗せず、空データを返す。
- Supabase エラーはログに残るが、ユーザーには 500 エラーが返らない。
- コードスタイルは既存の ESLint/Prettier 設定に合わせる（セミコロン無し）。

## 備考
- これは暫定対応。最終的には本番に `study_logs` 系マイグレーションを適用した後、必要に応じてフォールバックを削除する予定。
