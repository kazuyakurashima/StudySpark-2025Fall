"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/bottom-navigation";
import { UserProfileHeader } from "@/components/common/user-profile-header";
import { PageHeader } from "@/components/common/page-header";
import {
  Calendar,
  Flag,
  Save,
  Bot,
  Sparkles,
  Target,
  PartyPopper,
  Award,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { GoalNavigationChat } from "./goal-navigation-chat";
import {
  getAvailableTests,
  saveTestGoal,
  getAllTestGoals,
  getAvailableTestsForResult,
  saveTestResult,
  getAllTestResults,
  saveSimpleTestResult,
} from "@/app/actions/goal";
import { createClient } from "@/lib/supabase/client";

interface TestSchedule {
  id: string;
  test_type_id: string;
  test_date: string;
  detailed_name?: string | null;
  result_entry_start_date?: string | null;
  result_entry_end_date?: string | null;
  test_types: {
    id: string;
    name: string;
    type_category: string;
    grade?: number;
  };
}

interface TestGoal {
  id: string;
  test_schedule_id: string;
  target_course: string;
  target_class: number;
  goal_thoughts: string;
  created_at: string;
  test_schedules: {
    id: string;
    test_date: string;
    detailed_name?: string | null;
    result_entry_start_date?: string | null;
    result_entry_end_date?: string | null;
    test_types: {
      id: string;
      name: string;
      grade?: number;
      type_category?: string;
    };
  };
}

interface TestResult {
  id: string;
  test_schedule_id: string;
  math_score: number;
  japanese_score: number;
  science_score: number;
  social_score: number;
  total_score: number;
  math_deviation?: number;
  japanese_deviation?: number;
  science_deviation?: number;
  social_deviation?: number;
  total_deviation?: number;
  result_course?: string;
  result_class?: number;
  result_entered_at: string;
  test_schedules: {
    id: string;
    test_date: string;
    test_types: {
      id: string;
      name: string;
    };
  };
  goal: TestGoal | null;
}

const courses = [
  { id: "S", name: "Sコース", description: "最難関校" },
  { id: "C", name: "Cコース", description: "難関校" },
  { id: "B", name: "Bコース", description: "有名校" },
  { id: "A", name: "Aコース", description: "標準校" },
];

const getAvatarSrc = (avatarId?: string) => {
  if (avatarId && avatarId.startsWith("http")) {
    return avatarId;
  }

  const avatarMap: { [key: string]: string } = {
    student1:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student1-xZFJU5uXJO4DEfUbq1jbTMQUXReyM0.png",
    student2:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student2-mZ9Q9oVm43IQoRyxSYytVFYgp3JS1V.png",
    student3:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student3-teUpOKnopXNhE2vGFtvz9RWtC7O6kv.png",
    student4:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student4-pKazGXekCT1H5kzHBqmfOrM1968hML.png",
    student5:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student5-kehwNSIKsgkTL6EkAPO2evB3qJWnRM.png",
    student6:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/student6-dJrMk7uUxYSRMp5tMJ3t4KYDOEIuNl.png",
  };
  return avatarMap[avatarId || ""] || avatarMap["student1"];
};

export default function GoalPage() {
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState<number | null>(null);
  const [studentAvatar, setStudentAvatar] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"input" | "result" | "test">(
    "test",
  );

  // 目標入力タブ用
  const [availableTests, setAvailableTests] = useState<TestSchedule[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestSchedule | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [classNumber, setClassNumber] = useState([20]);
  const [currentThoughts, setCurrentThoughts] = useState("");
  const [isGoalSet, setIsGoalSet] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showInputChoice, setShowInputChoice] = useState(false);
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingGoal, setExistingGoal] = useState<TestGoal | null>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  // 結果入力タブ用
  const [testGoals, setTestGoals] = useState<TestGoal[]>([]);
  const [availableTestsForResult, setAvailableTestsForResult] = useState<
    TestGoal[]
  >([]);
  const [selectedGoalForResult, setSelectedGoalForResult] =
    useState<TestGoal | null>(null);
  const [resultCourse, setResultCourse] = useState("");
  const [resultClass, setResultClass] = useState([20]);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [existingResult, setExistingResult] = useState<TestResult | null>(null);

  // テスト結果タブ用
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    loadStudentInfo();
    loadAvailableTests();
    loadTestGoals();
    loadAvailableTestsForResult();
    loadTestResults();
  }, []);

  // プロフィール変更のリアルタイム購読
  useEffect(() => {
    const supabase = createClient();

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // profilesテーブルの変更を購読
      const channel = supabase
        .channel("profile-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Profile updated:", payload);
            // アバターが更新されたら即座に反映（avatar_idを使用）
            if (payload.new && "avatar_id" in payload.new) {
              setStudentAvatar((payload.new as any).avatar_id || "student1");
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  const loadStudentInfo = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: student } = await supabase
        .from("students")
        .select("full_name, grade")
        .eq("user_id", user.id)
        .single();

      if (student) {
        setStudentName(student.full_name);
        setStudentGrade(student.grade);
      }

      // プロフィールからアバター情報を取得（avatar_idを使用）
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStudentAvatar(profile.avatar_id || "student1");
      }
    }
  };

  const loadAvailableTests = async () => {
    const result = await getAvailableTests();
    if (result.tests) {
      setAvailableTests(result.tests);
    }
  };

  const loadTestGoals = async () => {
    console.log("🔍 [CLIENT] loadTestGoals: Starting...");
    const result = await getAllTestGoals();
    console.log("🔍 [CLIENT] loadTestGoals result:", result);
    if (result.goals) {
      console.log("🔍 [CLIENT] loadTestGoals: Setting goals, count:", result.goals.length);
      setTestGoals(result.goals as any);
    } else {
      console.log("🔍 [CLIENT] loadTestGoals: No goals found or error:", result.error);
    }
  };

  const loadAvailableTestsForResult = async () => {
    const result = await getAvailableTestsForResult();
    console.log("🔍 [loadAvailableTestsForResult] result:", result);
    if (result.goals) {
      console.log("🔍 [loadAvailableTestsForResult] Available tests:");
      result.goals.forEach((goal: any, idx: number) => {
        console.log(`  [${idx}] Schedule ID: ${goal.test_schedule_id}, Has Goal: ${!!goal.id}, Test: ${goal.test_schedules?.test_types?.name}`);
      });
      setAvailableTestsForResult(result.goals as any);
    }
  };

  const loadTestResults = async () => {
    console.log("🔍 [CLIENT] loadTestResults: Starting...");
    const result = await getAllTestResults();
    console.log("🔍 [CLIENT] loadTestResults result:", result);
    if (result.results) {
      console.log("🔍 [CLIENT] loadTestResults: Setting results, count:", result.results.length);
      console.log("🔍 [CLIENT] loadTestResults: Results data:", JSON.stringify(result.results, null, 2));
      setTestResults(result.results as any);
    } else {
      console.log("🔍 [CLIENT] loadTestResults: No results found or error:", result.error);
    }
  };

  // テスト選択時に既存の目標をチェック
  useEffect(() => {
    if (selectedTest) {
      const goal = testGoals.find(
        (g) => g.test_schedule_id === selectedTest.id,
      );
      if (goal) {
        setExistingGoal(goal);
        setSelectedCourse(goal.target_course);
        setClassNumber([goal.target_class]);
        setCurrentThoughts(goal.goal_thoughts);
        setIsGoalSet(true);
      } else {
        setExistingGoal(null);
        setSelectedCourse("");
        setClassNumber([20]);
        setCurrentThoughts("");
        setIsGoalSet(false);
      }
    }
  }, [selectedTest, testGoals]);

  useEffect(() => {
    if (availableTestsForResult.length === 0) {
      setSelectedGoalForResult(null);
      return;
    }

    if (
      !selectedGoalForResult ||
      !availableTestsForResult.some(
        (goal) => goal.id === selectedGoalForResult.id,
      )
    ) {
      setSelectedGoalForResult(availableTestsForResult[0]);
    }
  }, [availableTestsForResult, selectedGoalForResult]);

  // 選択されたテストの既存結果をチェック
  useEffect(() => {
    if (selectedGoalForResult) {
      const result = testResults.find(
        (r) => r.test_schedule_id === selectedGoalForResult.test_schedule_id,
      );
      if (result) {
        setExistingResult(result);
        setResultCourse(result.result_course || "");
        setResultClass([result.result_class || 20]);
      } else {
        setExistingResult(null);
        setResultCourse("");
        setResultClass([20]);
      }
    }
  }, [selectedGoalForResult, testResults]);

  const handleGoalDecision = () => {
    setIsGoalSet(true);
    setShowInputChoice(true);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const handleInputMethodChoice = (method: "ai" | "direct" | "later") => {
    setShowInputChoice(false);
    setShowCelebration(false); // お祝いアニメーションを停止
    if (method === "ai") {
      // AIコーチと作成する - すぐにAI対話を開始
      setShowAIChat(true);
    } else if (method === "direct") {
      setShowDirectInput(true);
      setIsAIGenerated(false);
    } else {
      // あとで入力する - 空の思いで保存可能にする
      setShowDirectInput(true);
      setIsAIGenerated(false);
    }
  };

  const handleAIChatComplete = (goalThoughts: string) => {
    setCurrentThoughts(goalThoughts);
    setShowAIChat(false);
    setShowDirectInput(true);
    setIsAIGenerated(true);
  };

  const handleAIChatCancel = () => {
    setShowAIChat(false);
    setShowInputChoice(true);
  };

  const handleSaveGoal = async () => {
    if (!selectedTest || !selectedCourse) {
      alert("テストとコースを選択してください");
      return;
    }
    // 「今回の思い」は空でもOK（あとで入力する場合）

    setIsSaving(true);

    try {
      const { success, error } = await saveTestGoal(
        selectedTest.id,
        selectedCourse,
        classNumber[0],
        currentThoughts,
      );

      if (success) {
        alert("目標を保存しました！");
        // リセット
        setSelectedTest(null);
        setSelectedCourse("");
        setClassNumber([20]);
        setCurrentThoughts("");
        setIsGoalSet(false);
        setShowInputChoice(false);
        setShowDirectInput(false);
        setShowAIChat(false);
        // リロード
        loadTestGoals();
        loadAvailableTestsForResult();
      } else {
        alert(error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveResult = async () => {
    if (!selectedGoalForResult) {
      alert("テストを選択してください");
      return;
    }

    if (!resultCourse) {
      alert("結果のコースを選択してください");
      return;
    }

    console.log("🔍 [handleSaveResult] selectedGoalForResult:", selectedGoalForResult);
    console.log("🔍 [handleSaveResult] test_schedule_id:", selectedGoalForResult.test_schedule_id);
    console.log("🔍 [handleSaveResult] resultCourse:", resultCourse);
    console.log("🔍 [handleSaveResult] resultClass:", resultClass[0]);

    setIsSavingResult(true);

    try {
      const { success, error } = await saveSimpleTestResult(
        selectedGoalForResult.test_schedule_id,
        resultCourse,
        resultClass[0],
      );

      if (success) {
        alert("テスト結果を保存しました！");
        // リセット
        setSelectedGoalForResult(null);
        setResultCourse("");
        setResultClass([20]);
        setExistingResult(null);
        // リロード（順序が重要：データを先に読み込んでからタブを切り替え）
        await loadAvailableTestsForResult();
        await loadTestResults();
        setActiveTab("test");
      } else {
        alert(error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("結果保存エラー:", error);
      alert("保存に失敗しました");
    } finally {
      setIsSavingResult(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || courseId;
  };

  return (
    <>
      <UserProfileHeader />
      <div className="min-h-screen bg-background pb-20 elegant-fade-in">
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#0891b2", "#0284c7", "#0369a1", "#1e40af"][
                  Math.floor(Math.random() * 4)
                ],
                width: "10px",
                height: "10px",
                borderRadius: "50%",
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl premium-glow">
              <div className="text-center">
                <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-primary mb-2">
                  目標決定！
                </h2>
                <p className="text-muted-foreground">
                  素晴らしい目標が設定されました！
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        icon={Flag}
        title={studentGrade ? `ゴールナビ (小学${studentGrade}年生)` : "ゴールナビ"}
        subtitle="目標を設定して、合格に向けて頑張ろう！"
        variant="student"
      />

      <div className="max-w-screen-xl mx-auto p-3 sm:p-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "input" | "result" | "test")}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">目標入力</TabsTrigger>
            <TabsTrigger value="result">結果入力</TabsTrigger>
            <TabsTrigger value="test">目標と結果の履歴</TabsTrigger>
          </TabsList>

          {/* 目標入力タブ */}
          <TabsContent value="input" className="space-y-4 sm:space-y-6 mt-6">
            {!showAIChat && (
              <Card className="card-elevated border-0 shadow-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"
                        alt="AIコーチ"
                        className="w-12 h-12 rounded-full border-2 border-blue-200 shadow-md"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-900">
                          AIコーチからのアドバイス
                        </span>
                      </div>
                      <p className="text-blue-800/90 leading-relaxed">
                        {studentName && `${studentName}さん、`}
                        今日も目標に向かって頑張ろう！まずは自分の現在の気持ちを正直に選んで、無理のない目標設定をしていこう。小さな積み重ねが大きな成果につながるよ。一緒に合格を目指そう！✨
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="card-elevated border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-50">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-gray-100 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-700" />
                  <span className="text-slate-800">テスト選択</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <Label className="text-sm sm:text-base font-medium">
                  対象テストをクリックして選択してください
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {availableTests.map((test) => {
                    const hasGoal = testGoals.some((g) => g.test_schedule_id === test.id);

                    return (
                      <button
                        key={test.id}
                        onClick={() => !hasGoal && setSelectedTest(test)}
                        disabled={hasGoal}
                        className={`p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                          hasGoal
                            ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                            : selectedTest?.id === test.id
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-border bg-background hover:border-primary/50 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-base">
                                {test.test_types.name}
                              </div>
                              {hasGoal && (
                                <Badge variant="secondary" className="text-xs">
                                  入力済み
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              実施日: {formatDate(test.test_date)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              種類: {test.test_types.type_category === "gohan"
                                ? "合不合判定テスト"
                                : "公開組分けテスト"}
                            </div>
                          </div>
                          {selectedTest?.id === test.id && !hasGoal && (
                            <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                          )}
                          {hasGoal && (
                            <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {availableTests.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    現在、目標設定可能なテストはありません
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedTest && existingGoal && (
              <Card className="card-elevated border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-700" />
                    <span className="text-green-900">設定済みの目標</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm">目標</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">
                          目標コース
                        </div>
                        <div className="font-bold text-lg text-blue-600">
                          {getCourseName(existingGoal.target_course)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">
                          目標の組
                        </div>
                        <div className="font-bold text-lg text-blue-600">
                          {existingGoal.target_class}組
                        </div>
                      </div>
                    </div>
                    {existingGoal.goal_thoughts && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="text-xs text-gray-600 mb-2">
                          今回の思い
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {existingGoal.goal_thoughts}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※
                    目標は一度設定すると変更できません。結果入力タブで結果を入力してください。
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedTest && !existingGoal && (
              <Card
                className={`card-elevated border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50 ${isGoalSet ? "opacity-75" : ""}`}
              >
                <CardHeader className="bg-gradient-to-r from-amber-100 to-yellow-100 border-b border-amber-200">
                  <CardTitle className="text-amber-900">目標の設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">
                      目標コースを決めよう
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {courses.map((course) => (
                        <button
                          key={course.id}
                          onClick={() =>
                            !isGoalSet && setSelectedCourse(course.id)
                          }
                          disabled={isGoalSet}
                          className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all duration-300 min-h-[60px] sm:min-h-[70px] ${
                            selectedCourse === course.id
                              ? "border-primary bg-primary/10 shadow-lg"
                              : "border-border bg-background hover:border-primary/50 hover:shadow-md"
                          } ${isGoalSet ? "cursor-not-allowed" : ""}`}
                        >
                          <div className="font-bold text-base sm:text-lg">
                            {course.name}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {course.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-sm sm:text-base font-medium text-amber-900">
                      目標の組を決めよう
                    </Label>
                    <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-br from-white to-amber-50/50 rounded-2xl border-2 border-amber-200 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm sm:text-base font-semibold text-amber-900">
                          目標の組
                        </span>
                        <div className="px-4 sm:px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full text-sm sm:text-base font-bold shadow-lg">
                          {classNumber[0]}組
                        </div>
                      </div>
                      <div className="px-2 py-1">
                        <Slider
                          value={classNumber}
                          onValueChange={setClassNumber}
                          max={40}
                          min={1}
                          step={1}
                          className="w-full"
                          disabled={isGoalSet}
                        />
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm text-amber-700 mt-3 font-semibold">
                        <span>1組</span>
                        <span>40組</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isGoalSet && selectedTest && selectedCourse && (
              <Card className="card-elevated border-0 shadow-lg bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
                <CardContent className="p-6 text-center">
                  <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-purple-900 mb-2">
                    目標を決定しよう！
                  </h3>
                  <p className="text-sm text-purple-700 mb-4">
                    テスト、コース、組を選択したら、目標を決定してください
                  </p>
                  <Button
                    onClick={handleGoalDecision}
                    className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    今回の目標はこれにする！
                  </Button>
                </CardContent>
              </Card>
            )}

            {showInputChoice && selectedTest && (
              <Card className="card-elevated bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center mb-4">
                    <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-primary mb-2">
                      「今回の思い」をどう作る？
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      3つの方法から選んでね
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => handleInputMethodChoice("ai")}
                      variant="outline"
                      className="w-full h-auto py-4 text-left border-2 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-white">
                          <AvatarImage
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"
                            alt="AIコーチ"
                          />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-bold text-base mb-1">
                            AIコーチと作成する
                          </div>
                          <div className="text-xs text-muted-foreground">
                            3つの質問に答えて、AIが思いをまとめてくれるよ
                          </div>
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleInputMethodChoice("direct")}
                      variant="outline"
                      className="w-full h-auto py-4 text-left border-2 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-white">
                          <AvatarImage
                            src={getAvatarSrc(studentAvatar)}
                            alt={studentName}
                          />
                          <AvatarFallback>
                            {studentName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-bold text-base mb-1">
                            自分で入力する
                          </div>
                          <div className="text-xs text-muted-foreground">
                            自由に気持ちを書いてみよう
                          </div>
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleInputMethodChoice("later")}
                      variant="outline"
                      className="w-full h-auto py-4 text-left border-2 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <Calendar className="h-8 w-8 mt-1 flex-shrink-0 text-primary" />
                        <div className="flex-1">
                          <div className="font-bold text-base mb-1">
                            あとで入力する
                          </div>
                          <div className="text-xs text-muted-foreground">
                            今は保存して、後で思いを追加できるよ
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {showAIChat && selectedTest && (
              <GoalNavigationChat
                studentName={studentName}
                studentAvatar={getAvatarSrc(studentAvatar)}
                testName={selectedTest.test_types.name}
                testDate={formatDate(selectedTest.test_date)}
                targetCourse={selectedCourse}
                targetClass={classNumber[0]}
                onComplete={handleAIChatComplete}
                onCancel={handleAIChatCancel}
              />
            )}

            {showDirectInput && !showAIChat && !showInputChoice && (
              <Card className="card-elevated border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    今回の思い
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isAIGenerated
                      ? "✅ AIコーチがまとめてくれました"
                      : "💭 直接入力した内容です"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAIGenerated && currentThoughts.length > 0 && (
                    <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai_coach-oDEKn6ZVqTbEdoExg9hsYQC4PTNbkt.png"
                          alt="AIコーチ"
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-gray-800">
                            素晴らしいね！{studentName}さんの今回の思いをまとめてみたよ。
                          </p>
                          <p className="text-xs text-gray-600">
                            このまま保存してもOK、編集してから保存してもOKです！
                          </p>
                          <ul className="text-xs text-gray-600 space-y-1 pl-4">
                            <li className="list-disc">
                              内容を変更したい場合は、下のテキストを編集してください
                            </li>
                            <li className="list-disc">
                              このまま良ければ、そのまま「目標を保存する」ボタンを押してください
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {!isAIGenerated && (
                    <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <div className="text-lg">💡</div>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-gray-800">
                            このまま保存してもOK、編集してから保存してもOKです！
                          </p>
                          <ul className="text-xs text-gray-600 space-y-1 pl-4">
                            <li className="list-disc">
                              内容を変更したい場合は、下のテキストを編集してください
                            </li>
                            <li className="list-disc">
                              このまま良ければ、そのまま「目標を保存する」ボタンを押してください
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  <Textarea
                    placeholder="目標に向けて、今の気持ちを自由に書こう"
                    value={currentThoughts}
                    onChange={(e) => setCurrentThoughts(e.target.value)}
                    className="min-h-[120px] sm:min-h-[150px] resize-none text-sm sm:text-base border-2 focus:border-primary"
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      {currentThoughts.length > 0 ? (
                        <>
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          編集できます
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                          空のまま保存すると「あとで入力」になります
                        </>
                      )}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {currentThoughts.length}/300文字
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {showDirectInput && !showAIChat && !showInputChoice && (
              <Button
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {isSaving ? "保存中..." : "目標を保存する"}
              </Button>
            )}
          </TabsContent>

          {/* 結果入力タブ */}
          <TabsContent value="result" className="space-y-4 mt-6">
            {availableTestsForResult.length === 0 ? (
              <Card className="card-elevated border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-50">
                <CardContent className="py-10 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-200">
                      <Award className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-medium text-gray-900">
                        現在入力可能なテストはありません
                      </p>
                      <p className="text-sm text-gray-600">
                        結果入力期間内のテストがありません。
                        <br />
                        結果入力期間は、テスト実施日から開始されます。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="card-elevated border-0 shadow-md bg-gradient-to-br from-cyan-50 to-blue-50">
                  <CardHeader className="bg-gradient-to-r from-cyan-100 to-blue-100 border-b border-cyan-200">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-cyan-700" />
                      <span className="text-cyan-900">テスト選択</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-6">
                    <Label className="text-sm sm:text-base font-medium">
                      結果を入力するテストをクリックして選択してください
                    </Label>
                    <div className="grid grid-cols-1 gap-3">
                      {availableTestsForResult.map((goal) => {
                        const hasResult = testResults.some((r) => r.test_schedule_id === goal.test_schedule_id);

                        return (
                          <button
                            key={goal.test_schedule_id}
                            onClick={() => !hasResult && setSelectedGoalForResult(goal)}
                            disabled={hasResult}
                            className={`p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                              hasResult
                                ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                                : selectedGoalForResult?.test_schedule_id === goal.test_schedule_id
                                ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                                : "border-border bg-background hover:border-primary/50 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-bold text-base">
                                    {goal.test_schedules.detailed_name ||
                                      goal.test_schedules.test_types.name}
                                  </div>
                                  {hasResult && (
                                    <Badge variant="secondary" className="text-xs">
                                      入力済み
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  実施日: {formatDate(goal.test_schedules.test_date)}
                                </div>
                                {goal.target_course && (
                                  <div className="mt-2 text-xs">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      <Flag className="h-3 w-3" />
                                      目標: {getCourseName(goal.target_course)} {goal.target_class}組
                                    </span>
                                  </div>
                                )}
                                {!goal.target_course && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    目標未設定（結果のみ入力可）
                                  </div>
                                )}
                              </div>
                              {selectedGoalForResult?.test_schedule_id === goal.test_schedule_id && !hasResult && (
                                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                              )}
                              {hasResult && (
                                <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {availableTestsForResult.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        現在、結果入力可能なテストはありません
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedGoalForResult && !existingResult && (
                  <>
                    <Card className="card-elevated border-0 shadow-md bg-gradient-to-br from-teal-50 to-cyan-50">
                      <CardHeader className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b border-teal-200">
                        <CardTitle className="text-teal-900">結果の入力</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 sm:space-y-6 pt-6">
                        <div className="space-y-2">
                          <Label className="text-sm sm:text-base">
                            結果のコースを入力しよう
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            {courses.map((course) => (
                              <button
                                key={course.id}
                                onClick={() => setResultCourse(course.id)}
                                className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all duration-300 min-h-[60px] sm:min-h-[70px] ${
                                  resultCourse === course.id
                                    ? "border-primary bg-primary/10 shadow-lg"
                                    : "border-border bg-background hover:border-primary/50 hover:shadow-md"
                                }`}
                              >
                                <div className="font-bold text-base sm:text-lg">
                                  {course.name}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  {course.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                          <Label className="text-sm sm:text-base font-medium">
                            結果の組を入力しよう
                          </Label>
                          <div className="px-4 sm:px-6 py-4 sm:py-5 surface-gradient-primary rounded-2xl border-2 border-primary/20 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm sm:text-base font-semibold text-primary">
                                結果の組
                              </span>
                              <div className="px-4 sm:px-5 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full text-sm sm:text-base font-bold shadow-lg">
                                {resultClass[0]}組
                              </div>
                            </div>
                            <div className="px-2 py-1">
                              <Slider
                                value={resultClass}
                                onValueChange={setResultClass}
                                max={40}
                                min={1}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm text-primary/70 mt-3 font-semibold">
                              <span>1組</span>
                              <span>40組</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      onClick={handleSaveResult}
                      disabled={isSavingResult || !resultCourse}
                      className="w-full h-11 sm:h-12 text-sm sm:text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {isSavingResult ? "保存中..." : "結果を保存する"}
                    </Button>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* 目標と結果の履歴タブ */}
          <TabsContent value="test" className="space-y-4 mt-6">
            {(() => {
              // 目標と結果を統合したリストを作成
              const allScheduleIds = new Set<string>();
              testGoals.forEach(g => allScheduleIds.add(g.test_schedule_id));
              testResults.forEach(r => allScheduleIds.add(r.test_schedule_id));

              const combinedItems = Array.from(allScheduleIds).map(scheduleId => {
                const goal = testGoals.find(g => g.test_schedule_id === scheduleId);
                const result = testResults.find(r => r.test_schedule_id === scheduleId);
                return { scheduleId, goal, result };
              }).sort((a, b) => {
                // 日付でソート（新しい順）
                const dateA = a.goal?.test_schedules?.test_date || a.result?.test_schedules?.test_date || '';
                const dateB = b.goal?.test_schedules?.test_date || b.result?.test_schedules?.test_date || '';
                return dateB.localeCompare(dateA);
              });

              if (combinedItems.length === 0) {
                return (
                  <Card className="card-elevated border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-50">
                    <CardContent className="py-10 text-center">
                      <p className="text-gray-700">
                        まだ目標や結果が登録されていません。
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div className="space-y-4">
                  {combinedItems.map((item) => {
                    const { scheduleId, goal, result } = item;

                    // テスト情報を取得（goalまたはresultから）
                    const testInfo = goal?.test_schedules || result?.test_schedules;
                    if (!testInfo) return null;

                    return (
                      <Card key={scheduleId} className="card-elevated border-0 shadow-md bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                        <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b border-indigo-200">
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-indigo-700" />
                            <span className="text-indigo-900">{testInfo.test_types.name}</span>
                          </CardTitle>
                          <p className="text-sm text-indigo-700">
                            {formatDate(testInfo.test_date)}
                          </p>
                        </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        {/* 目標表示 */}
                        {goal ? (
                          <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg border border-indigo-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Flag className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-sm">目標</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">
                                  目標コース
                                </div>
                                <div className="font-bold text-lg text-blue-600">
                                  {getCourseName(goal.target_course)}
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">
                                  目標の組
                                </div>
                                <div className="font-bold text-lg text-blue-600">
                                  {goal.target_class}組
                                </div>
                              </div>
                            </div>
                            {goal.goal_thoughts && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="text-xs text-gray-600 mb-2">
                                  今回の思い
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {goal.goal_thoughts}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Flag className="h-4 w-4" />
                              <span className="text-sm">目標は設定されていません</span>
                            </div>
                          </div>
                        )}

                        {/* 結果表示 */}
                        {result ? (
                          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-700" />
                                <span className="font-semibold text-green-900">
                                  結果
                                </span>
                              </div>
                              <Badge
                                className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                入力済み
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">
                                  結果コース
                                </div>
                                <div className="font-bold text-lg text-primary">
                                  {getCourseName(result.result_course)}
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-xs text-gray-600 mb-1">
                                  結果の組
                                </div>
                                <div className="font-bold text-lg text-primary">
                                  {result.result_class}組
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-500">
                              入力日時:{" "}
                              {new Date(
                                result.result_entered_at,
                              ).toLocaleString("ja-JP")}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Award className="h-4 w-4" />
                              <span className="text-sm">
                                結果はまだ入力されていません
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
            })()}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
    </>
  );
}
