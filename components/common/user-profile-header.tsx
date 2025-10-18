"use client"

import { useState } from "react"
import Image from "next/image"
import { LogOut, User, ChevronDown, GraduationCap } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
import { EditCourseModal } from "@/components/profile/edit-course-modal"
import { useUserProfile } from "@/lib/hooks/use-user-profile"
import { getAvatarById } from "@/lib/constants/avatars"

export function UserProfileHeader() {
  const router = useRouter()
  const { profile, loading, updateProfile, refresh } = useUserProfile()
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

  if (loading || !profile) {
    return (
      <div className="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-end px-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    )
  }

  const avatar = getAvatarById(profile.avatar_id)

  return (
    <>
      <header className="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 sticky top-0 z-10">
        {/* ロゴ・タイトルエリア（任意） */}
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-gray-800">StudySpark</h1>
        </div>

        {/* アバター・ドロップダウンエリア */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            data-testid="user-avatar"
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            {/* アバター */}
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {avatar && <Image src={avatar.src} alt={avatar.name} width={40} height={40} className="object-cover" />}
            </div>

            {/* ニックネーム（タブレット以上で表示） */}
            <span data-testid="user-nickname" className="hidden sm:inline text-sm font-medium text-gray-700">
              {profile.nickname}
            </span>

            {/* 下向き矢印（PC以上で表示） */}
            <ChevronDown className="hidden md:inline w-4 h-4 text-gray-500" />
          </button>

          {/* ドロップダウンメニュー */}
          {isDropdownOpen && (
            <>
              {/* 背景クリックで閉じる */}
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />

              {/* メニュー本体 */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={handleEditProfile}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  プロフィール編集
                </button>
                <button
                  onClick={handleEditCourse}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  コース編集
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
              </div>
            </>
          )}
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

      {/* コース編集モーダル */}
      {profile && (
        <EditCourseModal
          isOpen={isEditCourseModalOpen}
          onClose={() => setIsEditCourseModalOpen(false)}
          onUpdate={refresh}
        />
      )}
    </>
  )
}
