# JST Date Migration Playbook (Cloud)

## 1. Overview

- **Purpose**: Remove remaining UTC-based date handling and unify every user-facing flow around JST before cloud deployment.
- **Target systems**: Next.js server actions, Supabase queries, scheduled jobs, and supporting scripts that run in cloud environments (Vercel + Supabase).
- **Primary risk**: Any `Date.toISOString()` usage converts to UTC, shifting day boundaries (especially 00:00–08:59 JST) and leading to off-by-one errors.

## 2. Root Cause Recap

1. Past remediation only replaced `new Date().toISOString().split("T")[0]`. Patterns such as `someDate.toISOString().split('T')[0]` or `new Date(now.toLocaleString(...)).toISOString()` were missed.
2. Multiple ad-hoc conversions exist (manual `toLocaleString`, custom offsets) without a single source of truth.
3. `getNowJST()` still returns `new Date()`, relying on server TZ. In cloud runtimes, this is UTC unless otherwise configured.

## 3. Scope & Priority

| Priority | Module / File | Impact |
| --- | --- | --- |
| P0 (Production critical) | `app/actions/study-log.ts`, `app/actions/dashboard.ts`, `app/actions/parent-dashboard.ts` | Daily study logging, dashboards |
| P0 | `app/actions/reflect.ts`, `app/actions/weekly-analysis.ts` | Weekly analysis & reflection gating |
| P0 | `app/actions/parent.ts`, `app/actions/goal.ts`, `app/actions/admin.ts` | Goal deadlines, parent notifications |
| P1 (High) | `app/student/dashboard-client.tsx`, `app/parent/page.tsx` | On-screen dates (consistency) |
| P2 (Medium) | Automation scripts under `scripts/` | Backfills, support operations |
| P3 (Low) | Tests & demos (`scripts/test-*`, `scripts/create-demo-*`) | Reliability of local tooling |

## 4. Implementation Phases

### Phase 1 – Establish Shared Utilities (Day 1)
- Refine `lib/utils/date-jst.ts`:
  - Ensure `getNowJST()` returns a Date generated from `Intl.DateTimeFormat` with `timeZone: 'Asia/Tokyo'`.
  - Introduce helper `toJSTDateString(date: Date)` if not already covered by `formatDateToJST`.
  - Add lint rule or utility comment guiding developers to use helpers.
- Deliverable: utilities PR + unit tests for edge cases (UTC midnight).

### Phase 2 – Patch P0 Server Actions (Day 1–2)
- Replace every `toISOString().split('T')[0]` and manual offset with `formatDateToJST` or `getTodayJST`.
- Verify Supabase queries filter and order via JST strings.
- Testing:
  - Run targeted integration tests (study logging, reflect flow).
  - Manual QA: simulate requests around 00:30 JST using local TZ override (`TZ=UTC node ...`) to ensure JST dates remain correct.

### Phase 3 – Update UI-facing Components (Day 2)
- Ensure components use JST helpers before rendering.
- Confirm hydration parity between server and client; consider passing preformatted strings from server actions to avoid mismatch.
- Testing: Storybook or local run (`pnpm dev`) + snapshot diff if available.

### Phase 4 – Civil Scripts & Automation (Day 3)
- For operational scripts, replace UTC conversions.
- Where scripts run in CI/cron, enforce `TZ=UTC` in pipeline and ensure helpers still yield JST.
- Testing: dry-run critical scripts with `pnpm tsx <script>` in UTC environment.

### Phase 5 – Tests & Demo Fixtures (Day 3)
- Update fixtures to rely on helpers.
- Adjust snapshots or expected strings.
- Testing: `pnpm test` (or relevant subsets) under UTC environment.

## 5. Validation Strategy

- **Staging deployment**:
  1. Deploy after each phase into staging.
  2. Seed test accounts with study logs spanning day boundaries.
  3. QA checklist covers: log save, dashboard, reflect gating, parent summary, goal deadlines.
- **Automated tests**:
  - Expand unit tests in `lib/utils/date-jst.ts`.
  - Introduce integration tests that set `process.env.TZ = 'UTC'` before running to mimic server behavior.
- **Monitoring**:
  - Add temporary logging (feature flagged) for date values returned by key server actions.
  - Track Supabase rows with unexpected UTC dates via scheduled script until confidence is restored.

## 6. Deployment Notes (Cloud)

- **Vercel**: Runtime uses UTC. Rely only on JST helpers; never assume system TZ. Confirm no environment overrides exist.
- **Supabase Edge Functions / Cron**: Same UTC assumption. Wrap all new `Date()` calls with helper conversions immediately.
- **Rollback plan**:
  1. If regression detected, revert the phase-specific PR (git tag before each phase).
  2. Use `scripts/check-actual-today-logs.ts` to validate stored values after rollback.
- **Communication**:
  - Notify customer support before each production release. Provide summary of user-facing changes (week boundary fixes).
  - Schedule release during low-traffic window (weekday 02:00 JST).

## 7. Documentation & Follow-up

- Update developer onboarding docs to mandate JST helpers for all date strings.
- Add static analysis rule (ESLint custom rule or TS lint) to flag raw `toISOString().split('T')[0]` usage.
- After completion, hold post-mortem to ensure future features introduce JST handling from the design stage.

---

**Appendix: Quick Reference**
- Use `getTodayJST()` for “today” strings (`YYYY-MM-DD`).
- Use `formatDateToJST(new Date(value))` to normalize API payloads.
- Use `getJSTDayStartISO` / `getJSTDayEndISO` when Supabase query needs `timestamp` range.

