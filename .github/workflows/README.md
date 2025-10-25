# GitHub Actions Workflows

This directory contains CI/CD workflows for StudySpark.

## Workflows

### CI (`ci.yml`)
- **Trigger**: Pull requests to `main`, pushes to `main` and `feature/**` branches
- **Purpose**: Code quality checks (ESLint, TypeScript, build verification)
- **Runtime**: ~5-10 minutes
- **Required secrets**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Database Migration (`db-migration.yml`)
- **Trigger**: Manual only (`workflow_dispatch`)
- **Purpose**: Apply pending migrations to production database
- **Runtime**: ~5-15 minutes
- **Required environment**: `production` with approval rules
- **Required secrets**:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_PROJECT_REF`

## Prerequisites

### Supabase CLI Version
- **Minimum**: v1.178.0
- **Reason**: Required for `--format json` support in `migration list` command
- **Check**: The workflow automatically verifies CLI version before migration

### Personal Access Token Permissions
Create a token at: https://supabase.com/dashboard/account/tokens

Required scopes:
- `database.migrations.read` - Read migration status
- `database.migrations.write` - Apply migrations
- `database.backups.list` (optional) - Display backup status

### GitHub Environment Setup
1. Navigate to: **Settings → Environments**
2. Create environment: `production`
3. Configure protection rules:
   - Required reviewers: 1+
   - Wait timer: 0-5 minutes (optional)

### GitHub Secrets Setup
1. Navigate to: **Settings → Secrets and variables → Actions**
2. Add repository secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token from Supabase | `sbp_...` |
| `SUPABASE_DB_PASSWORD` | Database password (from Supabase settings) | `your-db-password` |
| `SUPABASE_PROJECT_REF` | Project reference ID | `zlipaeanhcslhintxpej` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | `eyJhbGc...` |

## Migration Workflow Safety Features

### Pre-flight Checks
1. CLI version verification (v1.178.0+)
2. Environment variable validation
3. Backup status display (with API error handling)
4. Migration status via JSON parsing

### Execution Controls
1. Manual trigger only (no automatic runs)
2. "YES" confirmation required
3. Environment approval gate (production)
4. 15-minute timeout limit

### Post-execution
1. Migration verification
2. Artifact collection (schema_migrations state)
3. Success/failure summaries
4. Emergency response instructions

### Rollback Procedures
If migration fails:
1. Check uploaded artifacts for `schema_migrations.txt`
2. Verify database connectivity via Supabase Dashboard
3. Review migration files in `supabase/migrations/`
4. Manual rollback options:
   - Use Supabase Dashboard backup restore
   - Write reverse migration manually
   - Contact Supabase support for critical issues

## Security Notes

### Secret Scoping
- Secrets are scoped at step level via `env:` blocks (not workflow-level)
- Database password passed via stdin to prevent log exposure
- GitHub Actions use SHA-pinned versions for supply chain security

### Future Improvements
- **OIDC Authentication**: Migrate from Personal Access Token to OpenID Connect for short-lived tokens
- **Staging Environment**: Add pre-production testing before production migration
- **Automated Backups**: Trigger backup creation before migration
- **Slack/Discord Notifications**: Alert on migration success/failure

## Troubleshooting

### CI Workflow Fails
- Check ESLint errors: `pnpm run lint`
- Check TypeScript errors: `pnpm exec tsc --noEmit`
- Check build locally: `pnpm run build`
- Verify secrets are set correctly

### Migration Workflow Fails
- Check artifacts: Download `migration-artifacts.zip` from workflow run
- Review `schema_migrations.txt` for applied migration state
- Verify Supabase project is accessible
- Check token permissions at https://supabase.com/dashboard/account/tokens
- Ensure migrations are in `supabase/migrations/` directory

### Permission Denied (403) on Backup API
- This is expected if `database.backups.list` permission is not granted
- Workflow continues with warning (non-blocking)
- Add permission to token if backup status is needed

## Development Workflow

### Local → Production Deployment
1. **Local development**:
   ```bash
   # Create migration
   npx supabase migration new feature_name

   # Apply locally
   npx supabase migration up

   # Test locally
   npx supabase db reset
   ```

2. **Push to GitHub**:
   ```bash
   git add supabase/migrations/
   git commit -m "feat: add feature_name migration"
   git push origin feature/your-feature-name
   ```

3. **Create PR** → CI runs automatically

4. **Merge to main**

5. **Manual migration trigger**:
   - Navigate to: **Actions → Database Migration → Run workflow**
   - Select branch: `main`
   - Enter confirmation: `YES`
   - Click "Run workflow"
   - Approve in production environment (if required reviewers set)

## References

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OIDC with Supabase](https://supabase.com/docs/guides/platform/going-into-prod#use-oidc-for-short-lived-tokens)
