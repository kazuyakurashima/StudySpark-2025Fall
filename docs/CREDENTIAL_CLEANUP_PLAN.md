# 認証情報クリーンアップ計画

## 実施日: 2025-11-20

## 背景

公開リポジトリ（またはPublic化予定）に以下の機密情報が含まれていることが判明:
- 実在のGmailアドレス（`toshin.hitachi+test00x@gmail.com`）
- 平文のパスワード（`<社内管理>`, `demo2025`）

## リスク評価

| リスク | 深刻度 | 説明 |
|--------|--------|------|
| スパム | 高 | 実在Gmailがスパム対象になる |
| アカウント乗っ取り | 高 | 同じ認証情報を他で使用している場合 |
| 不正アクセス | 高 | 本番環境への不正ログイン |
| 履歴からの漏洩 | 中 | Git履歴に残る問題 |

## 対応方針

### 1. ドキュメントの匿名化

#### 置換ルール

| 置換前 | 置換後 | 備考 |
|--------|--------|------|
| `demo-parent1@example.com` | `demo-parent1@example.com` | 保護者1 |
| `demo-parent2@example.com` | `demo-parent2@example.com` | 保護者2 |
| `<社内管理>` | `<社内管理>` または削除 | パスワード |
| `demo2025` | `<社内管理>` または削除 | パスワード |
| `<社内管理>` | `<社内管理>` または削除 | パスワード |

#### パスワード記載の代替案

```markdown
# 変更前
- **デモアカウント:** `demo-parent1@example.com` / **パスワード:** `<社内管理>`

# 変更後
- **デモアカウント:** `demo-parent1@example.com`
  - 認証情報は [社内共有ドキュメント] を参照
  - または管理者にお問い合わせください
```

### 2. 対象ファイル一覧

#### 優先度: 高（README・主要ドキュメント）

| ファイル | 含まれる情報 | 対応 |
|----------|-------------|------|
| `README.md` | メール、パスワード | 匿名化 |
| `docs/DEMO_USERS.md` | メール、パスワード | 匿名化 |
| `docs/LOCAL_TEST_DATA.md` | メール、パスワード | 匿名化 |
| `docs/DEMO_USER_PROCEDURES.md` | メール、パスワード | 匿名化 |

#### 優先度: 中（デプロイ関連ドキュメント）

| ファイル | 含まれる情報 | 対応 |
|----------|-------------|------|
| `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` | メール | 匿名化 |
| `docs/PRODUCTION_RECOVERY_GUIDE.md` | メール | 匿名化 |
| `docs/PRODUCTION_VERIFICATION_CHECKLIST.md` | メール | 匿名化 |
| `docs/DEPLOYMENT_PLAN_DAILY_AI.md` | メール | 匿名化 |

#### 優先度: 中（設定・スクリプト）

| ファイル | 含まれる情報 | 対応 |
|----------|-------------|------|
| `supabase/test-users.sql` | メール | 匿名化 |
| `docs/production-setup/*.md` | メール、パスワード | 匿名化 |
| `docs/production-setup/*.sql` | メール | 匿名化 |
| `docs/SCRIPT_IMPROVEMENT_PROPOSAL.md` | メール | 匿名化 |

#### 優先度: 低（タスク管理・検証ドキュメント）

| ファイル | 含まれる情報 | 対応 |
|----------|-------------|------|
| `TEST_VERIFICATION.md` | メール | 匿名化 |
| `CONTACT_ORGANIZER.md` | メール | 匿名化 |
| `docs/tasks/P0-foundation.md` | メール | 匿名化 |

### 3. 社内限定ドキュメントの作成

#### 新規ファイル: `docs/internal/DEMO_CREDENTIALS.md`

```markdown
# デモ認証情報（社内限定）

⚠️ このファイルは .gitignore に追加し、Git管理対象外とすること

## 本番環境

### 保護者アカウント
| ID | メール | パスワード | 氏名 |
|----|--------|------------|------|
| parent1 | demo-parent1@example.com | [実際のパスワード] | 青空 太郎 |
| parent2 | demo-parent2@example.com | [実際のパスワード] | 星野 一朗 |

### 生徒アカウント
| ログインID | パスワード | 氏名 | 学年 |
|------------|------------|------|------|
| hana6 | [実際のパスワード] | 青空 花 | 小6 |
| akira5 | [実際のパスワード] | 星野 明 | 小5 |
| hikaru6 | [実際のパスワード] | 星野 光 | 小6 |

## ローカル開発環境

（ローカル用の認証情報を記載）
```

### 4. .gitignore への追加

```gitignore
# 社内限定認証情報
docs/internal/
```

### 5. 本番環境の対応（別途実施）

1. **パスワード変更**
   - 全デモアカウントのパスワードを変更
   - より強固なパスワードポリシー適用

2. **MFA有効化**
   - 可能であれば2要素認証を設定

3. **アクセスログ確認**
   - 不正ログインの痕跡がないか確認

### 6. Git履歴の対応（将来検討）

現在のクリーンアップ完了後、以下を検討:

1. **BFG Repo-Cleaner** または **git filter-repo** で履歴から機密情報を削除
2. **GitHub Secrets Scanning** の設定確認
3. **CI/CDでのシークレットスキャン** 導入（例: gitleaks, trufflehog）

## 実装手順

### Step 1: ブランチ作成
```bash
git checkout -b security/remove-credentials
```

### Step 2: 一括置換
```bash
# メールアドレスの置換
find . -type f \( -name "*.md" -o -name "*.sql" \) -exec sed -i '' 's/toshin\.hitachi+test001@gmail\.com/demo-parent1@example.com/g' {} +
find . -type f \( -name "*.md" -o -name "*.sql" \) -exec sed -i '' 's/toshin\.hitachi+test002@gmail\.com/demo-parent2@example.com/g' {} +
```

### Step 3: パスワードの手動削除
各ファイルを確認し、パスワードを適切な表現に置換

### Step 4: 残存確認
```bash
# メールアドレスの残存確認
git grep "toshin\.hitachi"

# パスワードの残存確認
git grep "Testdemo2025\|demo2025\|password123"
```

### Step 5: 社内限定ドキュメント作成
`docs/internal/DEMO_CREDENTIALS.md` を作成し `.gitignore` に追加

### Step 6: コミット・プッシュ
```bash
git add .
git commit -m "security: 認証情報をドキュメントから削除"
git push origin security/remove-credentials
```

## 検証項目

- [ ] `git grep "toshin\.hitachi"` で結果が0件
- [ ] `git grep "Testdemo2025"` で結果が0件
- [ ] `git grep "demo2025"` で結果が0件（コード内の正当な使用を除く）
- [ ] README.md からパスワードが削除されている
- [ ] 社内限定ドキュメントが .gitignore に含まれている
- [ ] ドキュメント内のリンク・手順が正しく動作する

## 今後の運用ルール

1. **認証情報は絶対にGit管理しない**
2. **デモ用認証情報は社内ツール（1Password、Notion等）で管理**
3. **README等の公開ドキュメントには `@example.com` のみ記載**
4. **CIにシークレットスキャンを導入し、自動検出する**

## 参考リンク

- [GitHub - Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [gitleaks](https://github.com/gitleaks/gitleaks)
