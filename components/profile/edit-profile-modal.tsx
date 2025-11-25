"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { AvatarSelector } from "./avatar-selector"
import { ColorPalette } from "./color-palette"
import { AvatarUpload } from "@/components/avatar-upload"
import { UserProfile, UpdateProfileInput } from "@/lib/types/profile"
import { getAvatarById } from "@/lib/constants/avatars"
import { isThemeColorActive } from "@/lib/constants/theme-colors"

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
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile.custom_avatar_url)
  const [themeColor, setThemeColor] = useState(profile.theme_color)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarTab, setAvatarTab] = useState<"preset" | "upload">(profile.custom_avatar_url ? "upload" : "preset")

  // プロフィールが変更されたら状態を更新
  useEffect(() => {
    setNickname(profile.nickname)
    setAvatarId(profile.avatar_id)
    setCustomAvatarUrl(profile.custom_avatar_url)
    setThemeColor(profile.theme_color)
    setAvatarTab(profile.custom_avatar_url ? "upload" : "preset")
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

    // カスタムアバターを使用する場合はavatar_idをクリアしない（プリセットに戻す際に使用）
    const result = await onUpdate({
      nickname,
      avatar_id: avatarId,
      custom_avatar_url: avatarTab === "upload" ? customAvatarUrl : null,
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

  // 表示するアバター画像のURL（カスタム優先）
  const displayAvatarUrl = avatarTab === "upload" && customAvatarUrl ? customAvatarUrl : selectedAvatar?.src

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>プロフィール編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* アバタープレビュー */}
          <div className="flex flex-col items-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-300 p-1 overflow-hidden"
              style={
                isThemeColorActive(themeColor)
                  ? {
                      backgroundColor: `${themeColor}33`, // 20%透明度
                      border: `4px solid ${themeColor}B3`, // 70%透明度
                      boxShadow: `0 4px 12px ${themeColor}4D`, // 30%透明度
                    }
                  : { backgroundColor: '#f3f4f6' }
              }
            >
              {displayAvatarUrl && (
                <Image
                  src={displayAvatarUrl}
                  alt={selectedAvatar?.name || "カスタムアバター"}
                  width={72}
                  height={72}
                  className="rounded-full object-cover"
                  unoptimized={avatarTab === "upload" && !!customAvatarUrl}
                />
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

          {/* アバター選択（タブ切り替え） */}
          <div className="space-y-3">
            <Label>アバター</Label>
            <Tabs value={avatarTab} onValueChange={(v) => setAvatarTab(v as "preset" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preset">プリセットから選択</TabsTrigger>
                <TabsTrigger value="upload">画像をアップロード</TabsTrigger>
              </TabsList>
              <TabsContent value="preset" className="mt-4">
                <AvatarSelector role={profile.role} selectedAvatar={avatarId} onSelect={setAvatarId} />
              </TabsContent>
              <TabsContent value="upload" className="mt-4">
                <AvatarUpload
                  currentAvatarUrl={customAvatarUrl}
                  fallbackText={nickname.charAt(0) || "U"}
                  onUploadSuccess={(url) => setCustomAvatarUrl(url)}
                  onDeleteSuccess={() => setCustomAvatarUrl(null)}
                  size="md"
                />
              </TabsContent>
            </Tabs>
          </div>

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
