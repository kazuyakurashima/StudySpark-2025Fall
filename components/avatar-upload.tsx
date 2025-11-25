"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, Loader2, Camera, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  fallbackText?: string
  onUploadSuccess?: (url: string) => void
  onDeleteSuccess?: () => void
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
}

export function AvatarUpload({
  currentAvatarUrl,
  fallbackText = "U",
  onUploadSuccess,
  onDeleteSuccess,
  className,
  size = "lg",
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayUrl = previewUrl || currentAvatarUrl

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("JPG、PNG、WebP形式のみ対応しています")
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("ファイルサイズは2MB以下にしてください")
      return
    }

    setError(null)
    setIsUploading(true)

    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "アップロードに失敗しました")
      }

      // Update with actual URL from server
      setPreviewUrl(result.url)
      onUploadSuccess?.(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました")
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }, [onUploadSuccess])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch("/api/avatar/upload", {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "削除に失敗しました")
      }

      setPreviewUrl(null)
      onDeleteSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Avatar with upload overlay */}
      <div
        className={cn(
          "relative group cursor-pointer rounded-full transition-all",
          isDragging && "ring-4 ring-primary ring-offset-2",
          isUploading && "opacity-70"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Avatar className={cn(sizeClasses[size], "border-4 border-background shadow-lg")}>
          <AvatarImage src={displayUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/40">
            {fallbackText}
          </AvatarFallback>
        </Avatar>

        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity",
            isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading || isDeleting}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              画像を選択
            </>
          )}
        </Button>

        {displayUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </>
            )}
          </Button>
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        JPG、PNG、WebP形式（2MB以下）
        <br />
        クリックまたはドラッグ&ドロップ
      </p>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
