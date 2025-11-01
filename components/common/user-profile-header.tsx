"use client"

import { useState } from "react"
import Image from "next/image"
import { LogOut, User, ChevronDown, Check, Users, GraduationCap } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
import { EditCourseModal } from "@/components/profile/edit-course-modal"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { getAvatarById } from "@/lib/constants/avatars"
import { hexWithAlpha, isThemeActive } from "@/lib/utils/theme-color"
import { cn } from "@/lib/utils"

export function UserProfileHeader() {
  const router = useRouter()
  const { profile, loading, updateProfile, refresh, children, selectedChild, setSelectedChildId } = useUserProfile()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleEditProfile = () => {
    setIsDropdownOpen(false)
    setIsEditModalOpen(true)
  }

  const handleEditCourse = () => {
    setIsDropdownOpen(false)
    setIsEditCourseModalOpen(true)
  }

  const handleSelectChild = (childId: number) => {
    setSelectedChildId(childId)
    setIsDropdownOpen(false)
  }

  if (loading || !profile) {
    return (
      <div className="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-end px-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    )
  }

  const avatar = getAvatarById(profile.avatar_id)
  const isParent = profile.role === "parent"

  return (
    <>
      <header className="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
        {/* ロゴ */}
        <div className="flex items-center">
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            StudySpark
          </h1>
        </div>

        {/* 右側：子供情報（保護者のみ） + ユーザー情報 */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* 選択中の子供（保護者のみ表示） */}
          {isParent && selectedChild && (
            <div
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md"
              style={{
                backgroundColor: hexWithAlpha(selectedChild.theme_color, 10),
                border: `1.5px solid ${hexWithAlpha(selectedChild.theme_color, 30)}`,
              }}
            >
              <div
                className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform hover:scale-110"
                style={{
                  backgroundColor: hexWithAlpha(selectedChild.theme_color, 20),
                  border: `2px solid ${hexWithAlpha(selectedChild.theme_color, 60)}`,
                }}
              >
                <Image
                  src={getAvatarById(selectedChild.avatar_id)?.src || ""}
                  alt={selectedChild.nickname}
                  width={28}
                  height={28}
                  className="object-cover"
                />
              </div>
              <span className="text-sm font-semibold hidden sm:inline" style={{ color: selectedChild.theme_color }}>
                {selectedChild.nickname}
              </span>
            </div>
          )}

          {/* ユーザードロップダウン */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              data-testid="user-avatar"
              className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 hover:shadow-md"
            >
              {/* ユーザーアバター */}
              <div
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105"
                style={
                  isThemeActive(profile.theme_color)
                    ? {
                        backgroundColor: hexWithAlpha(profile.theme_color, 20),
                        border: `3px solid ${hexWithAlpha(profile.theme_color, 60)}`,
                        boxShadow: `0 0 0 1px ${hexWithAlpha(profile.theme_color, 30)}`,
                      }
                    : { backgroundColor: "#f3f4f6", border: "3px solid #d1d5db" }
                }
              >
                {avatar && <Image src={avatar.src} alt={avatar.name} width={40} height={40} className="object-cover" />}
              </div>

              {/* ユーザー名（タブレット以上で表示） */}
              <span data-testid="user-nickname" className="hidden sm:inline text-sm font-medium text-gray-700">
                {profile.nickname}
              </span>

              {/* 下向き矢印（PC以上で表示） */}
              <ChevronDown
                className={cn(
                  "hidden md:inline w-4 h-4 text-gray-500 transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* ドロップダウンメニュー */}
            {isDropdownOpen && (
              <>
                {/* 背景クリックで閉じる */}
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />

                {/* メニュー本体 */}
                <div className="absolute right-0 mt-2 w-64 md:w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* 保護者の場合：お子様セクション */}
                  {isParent && children.length > 0 && (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5" />
                          お子様
                        </div>
                      </div>
                      <div className="py-2 px-2 max-h-64 overflow-y-auto">
                        {children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleSelectChild(child.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                              selectedChild?.id === child.id
                                ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm"
                                : "hover:bg-gray-50"
                            )}
                          >
                            {/* 子供のアバター */}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform hover:scale-110"
                              style={{
                                backgroundColor: hexWithAlpha(child.theme_color, 20),
                                border: `2px solid ${hexWithAlpha(child.theme_color, 60)}`,
                              }}
                            >
                              <Image
                                src={getAvatarById(child.avatar_id)?.src || ""}
                                alt={child.nickname}
                                width={36}
                                height={36}
                                className="object-cover"
                              />
                            </div>

                            {/* 子供の情報 */}
                            <div className="flex-1 text-left min-w-0">
                              <div className="text-sm font-semibold text-gray-800 truncate">{child.nickname}</div>
                              <div className="text-xs text-gray-500">
                                {child.grade}年生 · {child.course}コース
                              </div>
                            </div>

                            {/* 選択チェックマーク */}
                            {selectedChild?.id === child.id && (
                              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 animate-in zoom-in duration-200" />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}

                  {/* プロフィール編集 */}
                  <button
                    onClick={handleEditProfile}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    プロフィール編集
                  </button>

                  {/* コース選択（生徒のみ） */}
                  {profile.role === "student" && (
                    <button
                      onClick={handleEditCourse}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <GraduationCap className="w-4 h-4" />
                      コース選択
                    </button>
                  )}

                  {/* ログアウト */}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    ログアウト
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* プロフィール編集モーダル */}
      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onUpdate={updateProfile}
        />
      )}

      {/* コース編集モーダル（生徒のみ） */}
      {profile && profile.role === "student" && (
        <EditCourseModal
          isOpen={isEditCourseModalOpen}
          onClose={() => setIsEditCourseModalOpen(false)}
          onUpdate={refresh}
        />
      )}
    </>
  )
}
