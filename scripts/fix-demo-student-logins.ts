import { createAdminClient } from "../lib/supabase/server"

async function fixDemoStudentLogins() {
  const supabase = createAdminClient()

  console.log("Fixing demo student login credentials...")

  // Update student5a to demo-student5
  const { data: user5, error: error5 } = await supabase.auth.admin.updateUserById(
    "93f9766f-4278-459b-a835-50f97a744360",
    {
      email: "demo-student5@studyspark.local",
      password: "demo2025",
    }
  )

  if (error5) {
    console.error("Error updating student5a:", error5)
  } else {
    console.log("✓ Updated student5a to demo-student5@studyspark.local")
  }

  // Update student6a to demo-student6
  const { data: user6, error: error6 } = await supabase.auth.admin.updateUserById(
    "e9270f1b-b5ad-484b-81be-7b2bc6a57cff",
    {
      email: "demo-student6@studyspark.local",
      password: "demo2025",
    }
  )

  if (error6) {
    console.error("Error updating student6a:", error6)
  } else {
    console.log("✓ Updated student6a to demo-student6@studyspark.local")
  }

  // Update students table login_id
  const { error: updateError5 } = await supabase
    .from("students")
    .update({ login_id: "demo-student5" })
    .eq("user_id", "93f9766f-4278-459b-a835-50f97a744360")

  const { error: updateError6 } = await supabase
    .from("students")
    .update({ login_id: "demo-student6" })
    .eq("user_id", "e9270f1b-b5ad-484b-81be-7b2bc6a57cff")

  if (updateError5 || updateError6) {
    console.error("Error updating login_id:", updateError5 || updateError6)
  } else {
    console.log("✓ Updated login_id in students table")
  }

  // Delete the extra demo-student users (with @demo.com)
  const { error: deleteError5 } = await supabase.auth.admin.deleteUser(
    "79fbfff2-fe89-473c-8591-0266a3e902a8"
  )
  const { error: deleteError6 } = await supabase.auth.admin.deleteUser(
    "4efcac3c-cee5-4d29-958d-f9a7de50412b"
  )

  if (deleteError5 || deleteError6) {
    console.error("Error deleting extra users:", deleteError5 || deleteError6)
  } else {
    console.log("✓ Deleted extra demo-student users")
  }

  console.log("\nDone! You can now log in with:")
  console.log("  demo-student5 / demo2025")
  console.log("  demo-student6 / demo2025")
}

fixDemoStudentLogins()
