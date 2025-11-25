import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/route"

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG、PNG、WebP形式のみ対応しています" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは2MB以下にしてください" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `${user.id}/avatar_${Date.now()}.${fileExtension}`

    // Delete existing avatar if exists
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
      await supabase.storage.from("avatars").remove(filesToDelete)
    }

    // Upload new avatar
    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { error: "アップロードに失敗しました" },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(uploadData.path)

    // Update profile with custom avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ custom_avatar_url: publicUrl })
      .eq("id", user.id)

    if (updateError) {
      console.error("Profile update error:", updateError)
      // Try to delete uploaded file on failure
      await supabase.storage.from("avatars").remove([fileName])
      return NextResponse.json(
        { error: "プロフィールの更新に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "アバターをアップロードしました",
    })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // Delete all files in user's folder
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
      await supabase.storage.from("avatars").remove(filesToDelete)
    }

    // Clear custom_avatar_url in profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ custom_avatar_url: null })
      .eq("id", user.id)

    if (updateError) {
      console.error("Profile update error:", updateError)
      return NextResponse.json(
        { error: "プロフィールの更新に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "カスタムアバターを削除しました",
    })
  } catch (error) {
    console.error("Avatar delete error:", error)
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    )
  }
}
