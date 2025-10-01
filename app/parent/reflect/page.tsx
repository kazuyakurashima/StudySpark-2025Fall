"use client"

import { useState } from "react"
import { Tabs, TabsList } from "@/components/ui/tabs"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { MessageCircle } from "lucide-react"

const sparkLearningHistory = [
  // ... existing code from student/reflect/page.tsx ...
]

const encouragementMessages = [
  // ... existing code from student/reflect/page.tsx ...
]

const coachingHistory = [
  // ... existing code from student/reflect/page.tsx ...
]

const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

export default function ParentReflectPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [activeTab, setActiveTab] = useState("history")
  // ... all other state from student/reflect/page.tsx ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
      <div className="bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur-md border-b border-slate-200/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border border-blue-300 shadow-sm">
                  <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
                </div>
                リフレクト
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-medium">
                お子さんの学習を振り返り、成長の軌跡を確認しましょう
              </p>
            </div>
          </div>

          <div className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-lg">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  selectedChild === child.id
                    ? "bg-white text-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-8">
          <TabsList className="grid w-full grid-cols-3 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-xl p-1.5 rounded-2xl h-14 sm:h-16 lg:h-18">
            {/* ... existing tabs from student/reflect/page.tsx ... */}
          </TabsList>

          {/* ... all TabsContent from student/reflect/page.tsx ... */}
        </Tabs>
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
