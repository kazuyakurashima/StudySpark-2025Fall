"use client"

import { useState, useEffect } from "react"
import { X, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { updateCourse } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface EditCourseModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => Promise<void>
}

const courses = [
  { id: "A", name: "Aコース", description: "Spark（楽しくスタート）" },
  { id: "B", name: "Bコース", description: "Flame（成長ステップ）" },
  { id: "C", name: "Cコース", description: "Blaze（最高にチャレンジ）" },
  { id: "S", name: "Sコース", description: "Blaze（最高にチャレンジ）" },
]

export function EditCourseModal({ isOpen, onClose, onUpdate }: EditCourseModalProps) {
  const { toast } = useToast()
  const [currentCourse, setCurrentCourse] = useState<string>("")
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCurrentCourse()
    }
  }, [isOpen])

  const loadCurrentCourse = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: student } = await supabase
        .from("students")
        .select("course")
        .eq("user_id", user.id)
        .single()

      if (student) {
        setCurrentCourse(student.course)
        setSelectedCourse(student.course)
      }
    }
  }

  const handleSave = async () => {
    if (!selectedCourse) {
      setError("コースを選択してください")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Server Actionでコース更新
      const result = await updateCourse(selectedCourse)

      if (result.success) {
        toast({
          title: "保存しました",
          description: `${selectedCourse}コースに変更しました`,
        })

        // プロフィールを再読み込みして画面に即反映
        await onUpdate()
        onClose()
      } else {
        throw new Error(result.error || "コースの更新に失敗しました")
      }
    } catch (err) {
      console.error("Error updating course:", err)
      const errorMessage = err instanceof Error ? err.message : "コースの更新に失敗しました"
      setError(errorMessage)
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-800">コース編集</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              現在のコース: <span className="font-bold text-primary">{currentCourse}コース</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* コース選択 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              新しいコースを選択
            </label>
            <div className="grid grid-cols-1 gap-3">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCourse === course.id
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{course.name}</div>
                      <div className="text-sm text-gray-600">{course.description}</div>
                    </div>
                    {selectedCourse === course.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={loading || !selectedCourse || selectedCourse === currentCourse}
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  )
}
