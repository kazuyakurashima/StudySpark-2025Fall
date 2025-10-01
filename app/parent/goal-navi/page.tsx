"use client"

import { useState } from "react"
import ParentBottomNavigation from "@/components/parent-bottom-navigation"
import { Flag } from "lucide-react"

const grade5TestSchedule = [
  // ... existing code from student/goal/page.tsx ...
]

const grade6TestSchedule = [
  // ... existing code from student/goal/page.tsx ...
]

// ... existing code from student/goal/page.tsx ...

const children = [
  { id: "child1", name: "みかん", nickname: "みかんちゃん" },
  { id: "child2", name: "太郎", nickname: "たろう" },
]

export default function ParentGoalNaviPage() {
  const [selectedChild, setSelectedChild] = useState("child1")
  const [activeTab, setActiveTab] = useState<"goal" | "result" | "tests">("goal")

  const [selectedTest, setSelectedTest] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("")
  const [classNumber, setClassNumber] = useState([20])
  const [currentThoughts, setCurrentThoughts] = useState("")
  // ... all other state from student/goal/page.tsx ...

  return (
    <div className="min-h-screen bg-background pb-20 elegant-fade-in">
      <div className="surface-gradient-primary backdrop-blur-lg border-b border-border/30 p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            ゴールナビ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">お子さんの目標を確認しましょう</p>

          <div className="flex gap-1 mt-3 sm:mt-4 bg-muted/50 backdrop-blur-sm p-1 rounded-lg border border-border/20 mb-3">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 ${
                  selectedChild === child.id
                    ? "bg-background text-foreground shadow-lg border border-border/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-muted/50 backdrop-blur-sm p-1 rounded-lg border border-border/20">
            {/* ... existing tab buttons from student/goal/page.tsx ... */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* ... all content from student/goal/page.tsx ... */}
      </div>

      <ParentBottomNavigation />
    </div>
  )
}
