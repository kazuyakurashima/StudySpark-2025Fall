"use client"

import { useState } from "react"
import { resetStudentPassword } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Student {
  id: string
  full_name: string
  furigana: string
  login_id: string
  grade: number
}

interface StudentPasswordResetFormProps {
  children: Student[]
}

export default function StudentPasswordResetForm({ children }: StudentPasswordResetFormProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const selectedStudent = children.find((child) => child.id === selectedStudentId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    // バリデーション
    if (!selectedStudentId) {
      setError("お子さまを選択してください")
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError("パスワードは6文字以上で設定してください")
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しません")
      setIsLoading(false)
      return
    }

    // パスワードリセット実行
    const result = await resetStudentPassword(selectedStudentId, newPassword)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
    }

    setIsLoading(false)
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>お子さまのパスワード管理</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              登録されているお子さまがいません。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>お子さまのパスワード管理</CardTitle>
        <CardDescription>
          お子さまのログインパスワードを変更できます。
          <br />
          変更後は新しいパスワードでログインしてください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="student" className="text-sm font-medium">
              お子さまを選択
            </label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger id="student">
                <SelectValue placeholder="お子さまを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.full_name}（{child.login_id}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">名前:</span> {selectedStudent.full_name}
                </p>
                <p>
                  <span className="font-medium">ログインID:</span> {selectedStudent.login_id}
                </p>
                <p>
                  <span className="font-medium">学年:</span> 小学{selectedStudent.grade}年生
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              新しいパスワード
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="6文字以上"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading || !selectedStudentId}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              パスワード確認
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="もう一度入力"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading || !selectedStudentId}
              minLength={6}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                {selectedStudent?.full_name}さんのパスワードを変更しました。
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !selectedStudentId}
          >
            {isLoading ? "変更中..." : "パスワードを変更"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
