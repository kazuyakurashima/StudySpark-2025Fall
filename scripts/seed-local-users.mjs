/**
 * ローカル検証用ユーザー作成スクリプト（PIIはGit管理外のJSONに分離）
 *
 * - PIIを含むデータは \`scripts/.seed-data.local.json\`（gitignore）に置く
 * - 本番誤実行防止のため、デフォルトではローカルURL以外で動かない
 *
 * 実行例:
 * NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 * SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
 * node scripts/seed-local-users.mjs
 *
 * サンプルログも作成したい場合:
 * SEED_SAMPLE_LOGS=1 node scripts/seed-local-users.mjs
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

function isLocalSupabaseUrl(url) {
  return url.startsWith("http://127.0.0.1:54321") || url.startsWith("http://localhost:54321")
}

function maskEmail(email) {
  const value = String(email ?? "")
  const [local, domain] = value.split("@")
  if (!local || !domain) return "***"
  return \`\${local.slice(0, 2)}***@\${domain}\`
}

function clampNickname(value) {
  const trimmed = String(value ?? "").trim()
  if (trimmed.length === 0) return "ユーザー"
  return trimmed.length > 10 ? trimmed.slice(0, 10) : trimmed
}

async function listAllAuthUsers(supabase) {
  const users = []
  let page = 1
  const perPage = 1000

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(\`listUsers failed: \${error.message}\`)
    if (!data?.users?.length) break

    for (const u of data.users) users.push({ id: u.id, email: u.email ?? null })
    if (data.users.length < perPage) break
    page++
  }

  return users
}

async function ensureAuthUser({ supabase, authUsersByEmail, role, email, password, fullNameForProfile }) {
  const existingId = authUsersByEmail.get(email)
  if (existingId) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingId, {
      password,
      user_metadata: { role, full_name: fullNameForProfile ?? null },
      email_confirm: true,
    })
    if (updateError) throw new Error(\`updateUserById failed for \${maskEmail(email)}: \${updateError.message}\`)
    return existingId
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullNameForProfile ?? null },
  })

  if (error) {
    if (error.message.includes("already been registered")) {
      const userId = authUsersByEmail.get(email)
      if (!userId) throw new Error(\`user already exists but not found in listUsers cache: \${maskEmail(email)}\`)
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { role, full_name: fullNameForProfile ?? null },
        email_confirm: true,
      })
      if (updateError) throw new Error(\`updateUserById failed for \${maskEmail(email)}: \${updateError.message}\`)
      return userId
    }
    throw new Error(\`createUser failed for \${maskEmail(email)}: \${error.message}\`)
  }

  const userId = data?.user?.id
  if (!userId) throw new Error(\`createUser returned no user for \${maskEmail(email)}\`)
  authUsersByEmail.set(email, userId)
  return userId
}

async function updateProfile({ supabase, userId, role, nickname, avatarId, themeColor, setupCompleted }) {
  const updatePayload = { role }
  if (typeof setupCompleted === "boolean") updatePayload.setup_completed = setupCompleted
  if (nickname) updatePayload.nickname = clampNickname(nickname)
  if (avatarId) updatePayload.avatar_id = avatarId
  if (themeColor) updatePayload.theme_color = themeColor

  const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userId)
  if (error) throw new Error(\`profiles.update failed for \${userId}: \${error.message}\`)
}

async function ensureStudentRow({ supabase, userId, student }) {
  const { data: existing, error: selectError } = await supabase
    .from("students")
    .select("id,user_id,login_id")
    .eq("login_id", student.loginId)
    .maybeSingle()
  if (selectError) throw new Error(\`students.select failed for \${student.loginId}: \${selectError.message}\`)

  const payload = {
    user_id: userId,
    login_id: student.loginId,
    full_name: student.fullName ?? student.loginId,
    furigana: student.furigana ?? null,
    grade: student.grade,
    course: student.course ?? "A",
  }

  if (existing) {
    if (existing.user_id !== userId) {
      throw new Error(\`students.login_id collision: \${student.loginId} belongs to a different user_id (\${existing.user_id})\`)
    }
    const { error: updateError } = await supabase.from("students").update(payload).eq("id", existing.id)
    if (updateError) throw new Error(\`students.update failed for \${student.loginId}: \${updateError.message}\`)
    return existing.id
  }

  const { data: inserted, error: insertError } = await supabase.from("students").insert(payload).select("id").single()
  if (insertError) throw new Error(\`students.insert failed for \${student.loginId}: \${insertError.message}\`)
  return inserted.id
}

async function ensureParentRow({ supabase, userId, parent }) {
  const { data: existing, error: selectError } = await supabase.from("parents").select("id,user_id").eq("user_id", userId).maybeSingle()
  if (selectError) throw new Error(\`parents.select failed for \${maskEmail(parent.email)}: \${selectError.message}\`)

  const payload = { user_id: userId, full_name: parent.fullName ?? "保護者", furigana: parent.furigana ?? null }
  if (existing) {
    const { error: updateError } = await supabase.from("parents").update(payload).eq("id", existing.id)
    if (updateError) throw new Error(\`parents.update failed for \${maskEmail(parent.email)}: \${updateError.message}\`)
    return existing.id
  }

  const { data: inserted, error: insertError } = await supabase.from("parents").insert(payload).select("id").single()
  if (insertError) throw new Error(\`parents.insert failed for \${maskEmail(parent.email)}: \${insertError.message}\`)
  return inserted.id
}

async function ensureCoachRow({ supabase, userId, coach }) {
  const { data: existing, error: selectError } = await supabase.from("coaches").select("id,user_id").eq("user_id", userId).maybeSingle()
  if (selectError) throw new Error(\`coaches.select failed for \${maskEmail(coach.email)}: \${selectError.message}\`)

  const payload = {
    user_id: userId,
    full_name: coach.fullName ?? "指導者",
    furigana: coach.furigana ?? null,
    invitation_code: randomUUID(),
  }
  if (existing) {
    const { error: updateError } = await supabase.from("coaches").update(payload).eq("id", existing.id)
    if (updateError) throw new Error(\`coaches.update failed for \${maskEmail(coach.email)}: \${updateError.message}\`)
    return existing.id
  }

  const { data: inserted, error: insertError } = await supabase.from("coaches").insert(payload).select("id").single()
  if (insertError) throw new Error(\`coaches.insert failed for \${maskEmail(coach.email)}: \${insertError.message}\`)
  return inserted.id
}

async function ensureAdminRow({ supabase, userId, admin }) {
  const { data: existing, error: selectError } = await supabase.from("admins").select("id,user_id").eq("user_id", userId).maybeSingle()
  if (selectError) throw new Error(\`admins.select failed for \${maskEmail(admin.email)}: \${selectError.message}\`)

  const payload = { user_id: userId, full_name: admin.fullName ?? "管理者", invitation_code: randomUUID() }
  if (existing) {
    const { error: updateError } = await supabase.from("admins").update(payload).eq("id", existing.id)
    if (updateError) throw new Error(\`admins.update failed for \${maskEmail(admin.email)}: \${updateError.message}\`)
    return existing.id
  }

  const { data: inserted, error: insertError } = await supabase.from("admins").insert(payload).select("id").single()
  if (insertError) throw new Error(\`admins.insert failed for \${maskEmail(admin.email)}: \${insertError.message}\`)
  return inserted.id
}

async function upsertParentChildRelation({ supabase, parentId, studentId, relationType }) {
  const { error } = await supabase
    .from("parent_child_relations")
    .upsert({ parent_id: parentId, student_id: studentId, relation_type: relationType }, { onConflict: "parent_id,student_id" })
  if (error) throw new Error(\`parent_child_relations.upsert failed: \${error.message}\`)
}

async function upsertCoachStudentRelation({ supabase, coachId, studentId }) {
  const { error } = await supabase
    .from("coach_student_relations")
    .upsert({ coach_id: coachId, student_id: studentId }, { onConflict: "coach_id,student_id" })
  if (error) throw new Error(\`coach_student_relations.upsert failed: \${error.message}\`)
}

async function seedSampleLogs({ supabase, studentRows }) {
  const { data: subjects, error: subjectsError } = await supabase.from("subjects").select("id,name").order("display_order")
  if (subjectsError) throw new Error(\`subjects.select failed: \${subjectsError.message}\`)
  if (!subjects?.length) throw new Error("subjects not found (seed.sql may not be applied)")

  const math = subjects.find((s) => s.name === "算数") ?? subjects[0]

  for (const row of studentRows) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("id,session_number")
      .eq("grade", row.grade)
      .order("session_number", { ascending: false })
      .limit(1)
    if (sessionsError) throw new Error(\`study_sessions.select failed: \${sessionsError.message}\`)
    if (!sessions?.[0]) continue

    const { data: contentTypes, error: contentTypesError } = await supabase
      .from("study_content_types")
      .select("id")
      .eq("grade", row.grade)
      .eq("subject_id", math.id)
      .limit(1)
    if (contentTypesError) throw new Error(\`study_content_types.select failed: \${contentTypesError.message}\`)
    if (!contentTypes?.[0]) continue

    const logPayload = {
      student_id: row.studentId,
      session_id: sessions[0].id,
      subject_id: math.id,
      study_content_type_id: contentTypes[0].id,
      correct_count: 8,
      total_problems: 10,
      logged_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from("study_logs")
      .upsert(logPayload, { onConflict: "student_id,session_id,subject_id,study_content_type_id" })
    if (upsertError) throw new Error(\`study_logs.upsert failed: \${upsertError.message}\`)
  }
}

function loadSeedData() {
  const scriptsDir = fileURLToPath(new URL(".", import.meta.url))
  const seedPath = process.env.SEED_DATA_PATH || join(scriptsDir, ".seed-data.local.json")
  if (!existsSync(seedPath)) {
    throw new Error(
      \`seed data file not found: \${seedPath}\\nCreate it from scripts/.seed-data.local.example.json (and keep it untracked).\`
    )
  }
  const raw = JSON.parse(readFileSync(seedPath, "utf8"))
  if (!raw || typeof raw !== "object") throw new Error("seed data JSON is invalid")
  return raw
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY")

  const allowNonLocal = process.env.ALLOW_NON_LOCAL_SEED === "1"
  if (!isLocalSupabaseUrl(supabaseUrl) && !allowNonLocal) {
    throw new Error(
      \`Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not local (\${supabaseUrl}).\\n\` +
        \`If you really intend to run against a non-local project, set ALLOW_NON_LOCAL_SEED=1 (NOT recommended).\`
    )
  }

  const seedData = loadSeedData()
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  console.log("🚀 Seeding local users...")
  console.log(\`📍 Supabase URL: \${supabaseUrl}\`)
  console.log(
    \`🧑‍🎓 students=\${seedData.students?.length ?? 0}, 👪 parents=\${seedData.parents?.length ?? 0}, 🧑‍🏫 coaches=\${seedData.coaches?.length ?? 0}, 🛡️ admins=\${seedData.admins?.length ?? 0}\`
  )

  const authUsers = await listAllAuthUsers(supabase)
  const authUsersByEmail = new Map()
  for (const u of authUsers) if (u.email) authUsersByEmail.set(u.email, u.id)

  const studentIdByLoginId = new Map()
  const studentRowsForLogs = []

  // 1) Admins
  for (const admin of seedData.admins ?? []) {
    const userId = await ensureAuthUser({
      supabase,
      authUsersByEmail,
      role: "admin",
      email: admin.email,
      password: admin.password,
      fullNameForProfile: admin.fullName,
    })
    await updateProfile({
      supabase,
      userId,
      role: "admin",
      nickname: admin.nickname,
      avatarId: admin.avatarId,
      themeColor: admin.themeColor,
      setupCompleted: true,
    })
    await ensureAdminRow({ supabase, userId, admin })
  }

  // 2) Coaches
  const coachIdByEmail = new Map()
  for (const coach of seedData.coaches ?? []) {
    const userId = await ensureAuthUser({
      supabase,
      authUsersByEmail,
      role: "coach",
      email: coach.email,
      password: coach.password,
      fullNameForProfile: coach.fullName,
    })
    await updateProfile({
      supabase,
      userId,
      role: "coach",
      nickname: coach.nickname,
      avatarId: coach.avatarId,
      themeColor: coach.themeColor,
      setupCompleted: true,
    })
    const coachId = await ensureCoachRow({ supabase, userId, coach })
    coachIdByEmail.set(coach.email, coachId)
  }

  // 3) Students
  for (const student of seedData.students ?? []) {
    const email = \`\${student.loginId}@studyspark.local\`
    const userId = await ensureAuthUser({
      supabase,
      authUsersByEmail,
      role: "student",
      email,
      password: student.password,
      fullNameForProfile: student.fullName,
    })
    await updateProfile({
      supabase,
      userId,
      role: "student",
      nickname: student.nickname,
      avatarId: student.avatarId,
      themeColor: student.themeColor,
      setupCompleted: true,
    })
    const studentId = await ensureStudentRow({ supabase, userId, student })
    studentIdByLoginId.set(student.loginId, studentId)
    studentRowsForLogs.push({ studentId, grade: student.grade })
  }

  // 4) Parents + relations
  for (const parent of seedData.parents ?? []) {
    const userId = await ensureAuthUser({
      supabase,
      authUsersByEmail,
      role: "parent",
      email: parent.email,
      password: parent.password,
      fullNameForProfile: parent.fullName,
    })
    await updateProfile({
      supabase,
      userId,
      role: "parent",
      nickname: parent.nickname,
      avatarId: parent.avatarId,
      themeColor: parent.themeColor,
      setupCompleted: true,
    })
    const parentId = await ensureParentRow({ supabase, userId, parent })
    const relationType = parent.relationType ?? "guardian"
    for (const loginId of parent.childLoginIds ?? []) {
      const studentId = studentIdByLoginId.get(loginId)
      if (!studentId) throw new Error(\`parent \${parent.email} references unknown student loginId: \${loginId}\`)
      await upsertParentChildRelation({ supabase, parentId, studentId, relationType })
    }
  }

  // 5) Coach assignments
  const allStudentIds = Array.from(studentIdByLoginId.entries()).map(([loginId, studentId]) => ({ loginId, studentId }))
  for (const coach of seedData.coaches ?? []) {
    const coachId = coachIdByEmail.get(coach.email)
    if (!coachId) continue

    let targets = allStudentIds
    if (Array.isArray(coach.assignStudentLoginIds) && coach.assignStudentLoginIds.length) {
      const wanted = new Set(coach.assignStudentLoginIds)
      targets = allStudentIds.filter((s) => wanted.has(s.loginId))
    } else if (coach.assignAllStudents) {
      targets = allStudentIds
    } else {
      continue
    }

    for (const t of targets) await upsertCoachStudentRelation({ supabase, coachId, studentId: t.studentId })
  }

  // 6) Sample logs (optional)
  if (process.env.SEED_SAMPLE_LOGS === "1") {
    console.log("🧪 Seeding sample study_logs...")
    await seedSampleLogs({ supabase, studentRows: studentRowsForLogs })
  }

  console.log("✅ Done.")
}

main().catch((error) => {
  console.error("\\n❌ Seed failed:", error)
  process.exit(1)
})
