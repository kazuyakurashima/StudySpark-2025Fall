"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AvatarSelector } from "./avatar-selector"
import { ColorPalette } from "./color-palette"
import { UserProfile, UpdateProfileInput } from "@/lib/types/profile"
import { getAvatarById } from "@/lib/constants/avatars"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onUpdate: (input: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>
}

export function EditProfileModal({ isOpen, onClose, profile, onUpdate }: EditProfileModalProps) {
  const { toast } = useToast()
  const [nickname, setNickname] = useState(profile.nickname)
  const [avatarId, setAvatarId] = useState(profile.avatar_id)
  const [themeColor, setThemeColor] = useState(profile.theme_color)
  const [isLoading, setIsLoading] = useState(false)

  // プロフィールが変更されたら状態を更新
  useEffect(() => {
    setNickname(profile.nickname)
    setAvatarId(profile.avatar_id)
    setThemeColor(profile.theme_color)
  }, [profile])

  const handleSave = async () => {
    // バリデーション
    if (nickname.length < 1 || nickname.length > 10) {
      toast({
        title: "エラー",
        description: "ニックネームは1〜10文字で入力してください",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const result = await onUpdate({
      nickname,
      avatar_id: avatarId,
      theme_color: themeColor,
    })

    setIsLoading(false)

    if (result.success) {
      toast({
        title: "保存しました",
        description: "プロフィールを更新しました",
      })
      onClose()
    } else {
      toast({
        title: "エラー",
        description: result.error || "保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const selectedAvatar = getAvatarById(avatarId)
  const nicknameLength = nickname.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            プロフィール編集
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* アバタープレビュー */}
          <div className="flex flex-col items-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center relative"
              style={{ backgroundColor: `${themeColor}1A` }} // 10%透明度
            >
              {selectedAvatar && (
                <Image src={selectedAvatar.src} alt={selectedAvatar.name} width={80} height={80} className="rounded-full" />
              )}
            </div>
            {nickname && <p className="mt-2 text-sm font-medium text-gray-700">{nickname}</p>}
          </div>

          {/* ニックネーム入力 */}
          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム</Label>
            <div className="relative">
              <Input
                id="nickname"
                name="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: ハッピーガールさん"
                maxLength={10}
                className={nicknameLength > 10 ? "border-red-500" : ""}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${nicknameLength > 10 ? "text-red-500" : "text-gray-500"}`}>
                {nicknameLength}/10
              </span>
            </div>
            {nicknameLength > 10 && <p className="text-xs text-red-500">ニックネームは10文字以内で入力してください</p>}
          </div>

          {/* アバター選択 */}
          <AvatarSelector role={profile.role} selectedAvatar={avatarId} onSelect={setAvatarId} />

          {/* カラー選択 */}
          <ColorPalette selectedColor={themeColor} onSelect={setThemeColor} />

          {/* ボタン */}
          <div className="flex justify-between gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isLoading || nicknameLength < 1 || nicknameLength > 10} className="flex-1">
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
