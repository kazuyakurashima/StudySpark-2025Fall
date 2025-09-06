"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Sparkles, Plus, Calendar } from 'lucide-react'
import RecordForm from '@/components/features/spark/RecordForm'
import type { StudyRecord, StudyRecordResponse } from '@/lib/schemas/study-record'

export default function SparkPage() {
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [recentRecords, setRecentRecords] = useState<StudyRecordResponse[]>([])
  
  // Mock student ID - in real app this would come from auth
  const studentId = '550e8400-e29b-41d4-a716-446655440000'

  const fetchRecentRecords = async () => {
    try {
      const response = await fetch(`/api/students/${studentId}/records`)
      if (response.ok) {
        const data = await response.json()
        setRecentRecords(data.records?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Failed to fetch records:', error)
    }
  }

  useEffect(() => {
    fetchRecentRecords()
  }, [])

  const handleSubmit = async (data: StudyRecord) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/students/${studentId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '保存に失敗しました')
      }

      setSuccess('学習記録を保存しました！')
      setShowForm(false)
      fetchRecentRecords() // Refresh the list
      
    } catch (error) {
      console.error('Submit error:', error)
      setError(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setError(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    })
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'spark':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Spark</span>
      case 'flame':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Flame</span>
      case 'blaze':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Blaze</span>
      default:
        return null
    }
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              学習記録入力
            </h1>
            <p className="text-sm text-muted-foreground">今日の学習を記録しましょう</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          <RecordForm
            studentId={studentId}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>

        <BottomNavigation activeTab="spark" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                学習記録
              </h1>
              <p className="text-sm text-muted-foreground">今日の学習を記録して成長を見える化しよう</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Add New Record Button */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">今日の学習を記録しよう</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  簡単入力から詳細入力まで、3つのレベルから選べます
                </p>
              </div>
              <Button 
                onClick={() => setShowForm(true)} 
                className="h-12 px-8"
                data-testid="add-record-button"
              >
                <Plus className="h-5 w-5 mr-2" />
                学習記録を追加
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Records */}
        {recentRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                最近の記録
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">{formatDate(record.date)}</span>
                        {getLevelBadge(record.level_type)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{record.subject}</span>
                        <span>•</span>
                        <span>{record.study_type}</span>
                        {record.study_time_minutes && (
                          <>
                            <span>•</span>
                            <span>{record.study_time_minutes}分</span>
                          </>
                        )}
                      </div>
                      {record.reflection && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {record.reflection}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentRecords.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">まだ記録がありません</h3>
              <p className="text-sm text-muted-foreground">
                最初の学習記録を追加して、成長の軌跡を残していきましょう
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation activeTab="spark" />
    </div>
  )
}