# StudySpark Sitemap & Navigation

**Spec-Version**: 0.1  
**Depends**: docs/01_requirements.md, docs/02_architecture.md  
**Document Status**: Initial Draft  
**Last Updated**: 2025-01-07

---

## 1. Route Table Overview

### 1.1 Authentication Routes
| Route ID | Path | Purpose | Main UI Components | Authorization | Meta Info |
|----------|------|---------|-------------------|---------------|-----------|
| ROUTE-001 | `/` | ログイン・新規登録 | LoginForm, TabsContainer | Public | title: "StudySpark - ログイン" |
| ROUTE-002 | `/join` | 統合登録フロー | JoinForm, RoleDetection | Public | title: "アカウント作成" |
| ROUTE-003 | `/setup/avatar` | 生徒アバター選択 | AvatarSelector | Student (first-login) | title: "アバターを選択" |
| ROUTE-004 | `/setup/name` | ニックネーム設定 | NameInput | Student (first-login) | title: "ニックネームを決めよう" |
| ROUTE-005 | `/setup/profile` | プロフィール完了 | ProfileCompletion | Student (first-login) | title: "プロフィール設定" |
| ROUTE-006 | `/setup/parent-avatar` | 保護者アバター選択 | AvatarSelector | Parent (first-login) | title: "アバターを選択" |
| ROUTE-007 | `/setup/complete` | セットアップ完了 | CompletionMessage | Authenticated | title: "セットアップ完了" |

### 1.2 Student Routes (REQ-001, REQ-004, REQ-005)
| Route ID | Path | Purpose | Main UI Components | Authorization | Meta Info |
|----------|------|---------|-------------------|---------------|-----------|
| ROUTE-101 | `/student` | 生徒ホーム | StudentDashboard, BottomNav | Student | title: "ホーム", description: "今日のミッション・学習状況" |
| ROUTE-102 | `/student/spark` | 学習記録入力 | SparkRecordForm, LevelSelector | Student | title: "スパーク - 学習記録", description: "今日の学習を記録しよう" |
| ROUTE-103 | `/student/spark/history` | 学習履歴表示 | RecordHistory, CalendarView | Student | title: "学習履歴", description: "過去の記録を確認" |
| ROUTE-104 | `/student/goal` | 目標設定・管理 | GoalNavigation, AICoaching | Student | title: "ゴールナビ", description: "目標を立てて達成しよう" |
| ROUTE-105 | `/student/goal/[goalId]` | 個別目標詳細 | GoalDetail, ProgressChart | Student (own goals) | title: "目標詳細", description: "目標の進捗と詳細" |
| ROUTE-106 | `/student/reflect` | 週間振り返り | ReflectionForm, AIFeedback | Student | title: "リフレクト", description: "今週を振り返ろう" |
| ROUTE-107 | `/student/reflect/history` | 振り返り履歴 | ReflectionHistory | Student | title: "振り返り履歴", description: "過去の振り返りを見る" |

### 1.3 Parent Routes (REQ-002)
| Route ID | Path | Purpose | Main UI Components | Authorization | Meta Info |
|----------|------|---------|-------------------|---------------|-----------|
| ROUTE-201 | `/parent` | 保護者ホーム | ParentDashboard, ChildrenTabs | Parent | title: "保護者ホーム", description: "お子様の学習状況" |
| ROUTE-202 | `/parent/children/[childId]` | 子供詳細表示 | ChildDetailView, StudyRecords | Parent (own children) | title: "お子様の詳細", description: "詳細な学習状況" |
| ROUTE-203 | `/parent/goal` | 子供の目標確認 | GoalOverview (readonly) | Parent (own children) | title: "目標確認", description: "お子様の目標と進捗" |
| ROUTE-204 | `/parent/spark` | 学習記録確認 | StudyRecordsList (readonly) | Parent (own children) | title: "学習記録", description: "お子様の学習記録" |
| ROUTE-205 | `/parent/reflect` | 振り返り確認 | ReflectionView (readonly) | Parent (own children) | title: "振り返り", description: "お子様の振り返り内容" |
| ROUTE-206 | `/parent/support` | 応援メッセージ | SupportMessageForm | Parent | title: "応援メッセージ", description: "お子様を応援しよう" |
| ROUTE-207 | `/parent/family` | 家族管理 | FamilySettings, StudentManagement | Parent | title: "家族設定", description: "生徒アカウント管理" |

### 1.4 Coach Routes (REQ-003)
| Route ID | Path | Purpose | Main UI Components | Authorization | Meta Info |
|----------|------|---------|-------------------|---------------|-----------|
| ROUTE-301 | `/coach` | 指導者ダッシュボード | CoachDashboard, StudentsList | Coach | title: "指導者ダッシュボード", description: "担当生徒の状況一覧" |
| ROUTE-302 | `/coach/students` | 生徒一覧管理 | StudentsManagement, FilterSort | Coach | title: "生徒管理", description: "担当生徒の詳細管理" |
| ROUTE-303 | `/coach/students/[studentId]` | 個別生徒詳細 | StudentDetailView, CoachingTools | Coach (assigned students) | title: "生徒詳細", description: "個別指導支援" |
| ROUTE-304 | `/coach/goal` | 生徒目標管理 | GoalManagement, BulkActions | Coach (assigned students) | title: "目標管理", description: "生徒の目標設定支援" |
| ROUTE-305 | `/coach/spark` | 学習記録分析 | AnalyticsView, TrendCharts | Coach (assigned students) | title: "学習分析", description: "学習パターン分析" |
| ROUTE-306 | `/coach/reflect` | 振り返り支援 | ReflectionSupport, FeedbackTools | Coach (assigned students) | title: "振り返り支援", description: "生徒の振り返り支援" |
| ROUTE-307 | `/coach/alerts` | アラート管理 | AlertsCenter, NotificationSettings | Coach | title: "アラート", description: "要注意生徒の通知" |

### 1.5 Admin Routes
| Route ID | Path | Purpose | Main UI Components | Authorization | Meta Info |
|----------|------|---------|-------------------|---------------|-----------|
| ROUTE-401 | `/admin` | 管理者ダッシュボード | AdminDashboard, SystemMetrics | Admin | title: "管理画面", description: "システム全体管理" |
| ROUTE-402 | `/admin/users` | ユーザー管理 | UserManagement, BulkOperations | Admin | title: "ユーザー管理", description: "全ユーザーの管理" |
| ROUTE-403 | `/admin/invites` | 招待管理 | InviteManagement, CodeGeneration | Admin | title: "招待管理", description: "指導者招待の管理" |
| ROUTE-404 | `/admin/analytics` | 分析・レポート | SystemAnalytics, UsageReports | Admin | title: "分析レポート", description: "利用状況分析" |

---

## 2. Navigation Structure

### 2.1 Student Navigation (Mobile-First Bottom Navigation)
```yaml
Bottom Navigation (4 tabs):
  - tab: home
    icon: Home
    label: "ホーム"
    route: /student
    badge: daily_missions_count
    
  - tab: goal
    icon: Flag  
    label: "ゴールナビ"
    route: /student/goal
    badge: unachieved_goals_count
    
  - tab: spark
    icon: Zap
    label: "スパーク"
    route: /student/spark
    badge: today_missing_records
    
  - tab: reflect
    icon: MessageCircle
    label: "リフレクト"
    route: /student/reflect
    badge: weekly_reflection_due

Header Navigation (Tablet/Desktop):
  - left: logo + breadcrumbs
  - right: user_menu (avatar + dropdown)
  - center: search (if applicable)

User Menu Dropdown:
  - "プロフィール設定": /student/profile
  - "学習履歴": /student/spark/history  
  - "ヘルプ": /help
  - "ログアウト": logout action
```

### 2.2 Parent Navigation (Adaptive Layout)
```yaml
Primary Navigation (Mobile: Bottom, Desktop: Sidebar):
  - "ホーム": /parent
  - "目標": /parent/goal
  - "学習記録": /parent/spark
  - "振り返り": /parent/reflect
  - "応援": /parent/support
  - "家族設定": /parent/family

Children Selector (if multiple children):
  - position: header (mobile) / sidebar top (desktop)
  - format: tabs or dropdown
  - active_child: highlighted/selected state
  - route_context: /parent/children/[childId]/...

Header Actions:
  - notification_bell: unread alerts count
  - user_menu: parent profile & settings
  - help_button: contextual help
```

### 2.3 Coach Navigation (Professional Dashboard Layout)
```yaml
Primary Navigation (Sidebar):
  - "ダッシュボード": /coach (icon: BarChart3)
  - "生徒管理": /coach/students (icon: Users, badge: alert_count)
  - "目標管理": /coach/goal (icon: Target)
  - "学習分析": /coach/spark (icon: TrendingUp)
  - "振り返り支援": /coach/reflect (icon: MessageSquare)
  - "アラート": /coach/alerts (icon: Bell, badge: urgent_count)

Top Header:
  - left: organization_selector (if multi-org coach)
  - center: global_search (students/goals)
  - right: notifications + user_menu

Quick Actions (Floating/Fixed):
  - "新規メッセージ": quick message to student
  - "アラート確認": priority alerts popup
  - "一括操作": bulk actions modal
```

---

## 3. Route Guards & Redirects

### 3.1 Authentication Guard
```typescript
// middleware.ts authentication logic
const authGuard = (request: NextRequest) => {
  const publicPaths = ['/', '/join', '/help', '/privacy', '/terms'];
  const setupPaths = ['/setup/*'];
  
  if (publicPaths.includes(pathname)) return NextResponse.next();
  
  const token = request.cookies.get('auth-token');
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Setup completion check
  if (setupPaths.some(path => pathname.startsWith(path.replace('*', '')))) {
    return NextResponse.next(); // Allow setup flow
  }
  
  const user = verifyToken(token);
  if (!user.setup_completed) {
    const setupRoute = getSetupRoute(user.role);
    return NextResponse.redirect(new URL(setupRoute, request.url));
  }
  
  return NextResponse.next();
};
```

### 3.2 Role-based Authorization
```yaml
Role Guard Matrix:
  Student Routes (/student/*):
    - allow: [student, admin]
    - deny: [parent, coach, unauthenticated]
    - redirect_to: role-specific home
    
  Parent Routes (/parent/*):
    - allow: [parent, admin]  
    - deny: [student, coach, unauthenticated]
    - redirect_to: /parent
    
  Coach Routes (/coach/*):
    - allow: [coach, admin]
    - deny: [student, parent, unauthenticated]  
    - redirect_to: /coach
    
  Admin Routes (/admin/*):
    - allow: [admin]
    - deny: [student, parent, coach, unauthenticated]
    - redirect_to: role home or /403

Resource-level Guards:
  Own Data Only: 
    - routes: /student/*, /parent/children/[childId]
    - check: user_id matches resource owner
    - fallback: 403 Forbidden
    
  Family Scope:
    - routes: /parent/children/[childId]/*
    - check: parent_student_relations table
    - fallback: 404 Not Found
    
  Organization Scope:
    - routes: /coach/students/[studentId]
    - check: memberships table (org scope)
    - fallback: 404 Not Found
```

### 3.3 Redirect Rules
```yaml
Default Role Redirects:
  unauthenticated: "/"
  student: "/student"
  parent: "/parent" 
  coach: "/coach"
  admin: "/admin"

First-time Login:
  student: "/setup/avatar"
  parent: "/setup/parent-avatar" 
  coach: "/coach" (no setup required)
  admin: "/admin"

Error Redirects:
  403_forbidden: "/error/403"
  404_not_found: "/error/404"  
  500_server_error: "/error/500"
  maintenance: "/maintenance"

Deep Link Handling:
  pattern: store intended_url in session
  after_auth: redirect to intended_url or default
  timeout: 5 minutes, then default redirect
```

---

## 4. Responsive Navigation Behavior

### 4.1 Breakpoint-specific Layouts
```yaml
Mobile (< 768px):
  layout: bottom_navigation + header
  navigation: 
    primary: bottom fixed tabs (4 items)
    secondary: hamburger menu (less common items)
    user: header right (avatar + dropdown)
  
Tablet (768px - 1024px):  
  layout: sidebar + header
  navigation:
    primary: collapsible left sidebar
    secondary: header tabs (if applicable)
    user: header right expanded
    
Desktop (> 1024px):
  layout: full sidebar + top header  
  navigation:
    primary: permanent left sidebar (expanded)
    secondary: header navigation tabs
    user: header right with full menu
    quick_actions: floating action buttons
```

### 4.2 Navigation State Management  
```typescript
// Navigation state for active tabs/routes
interface NavigationState {
  activeRoute: string;           // current route path
  activeTab: string;            // current bottom tab (mobile)
  sidebarCollapsed: boolean;    // sidebar state (tablet+)
  breadcrumbs: BreadcrumbItem[]; // navigation breadcrumbs
  backButton?: {                // back navigation context
    label: string;
    href: string;
  };
}

// Route-specific navigation overrides
const navigationOverrides = {
  '/student/spark/new': {
    backButton: { label: 'スパークに戻る', href: '/student/spark' },
    hideBottomNav: false,
  },
  '/parent/children/[childId]': {
    breadcrumbs: ['保護者ホーム', '${childName}'],
    contextualActions: ['応援メッセージを送る'],
  },
  '/coach/students/[studentId]': {
    breadcrumbs: ['ダッシュボード', '生徒管理', '${studentName}'],
    quickActions: ['メッセージ', 'アラート設定', '保護者連絡'],
  },
};
```

---

## 5. SEO & Meta Information

### 5.1 Page Metadata Strategy
```yaml
Global Defaults:
  site_name: "StudySpark"
  title_template: "%s | StudySpark"
  description: "中学受験を支援する学習記録アプリ"
  og_image: "/images/og-default.png"
  favicon: "/favicon.ico"

Role-specific Defaults:
  student:
    title_prefix: ""
    description: "今日の学習を記録して、目標に向かって成長しよう"
    og_type: "website"
    
  parent:  
    title_prefix: "保護者 - "
    description: "お子様の学習状況を確認し、適切なサポートを提供"
    og_type: "website"
    
  coach:
    title_prefix: "指導者 - "  
    description: "担当生徒の学習状況を分析し、効果的な指導をサポート"
    og_type: "website"

Dynamic Meta (based on data):
  '/student/goal/[goalId]':
    title: "${goalTitle} - 目標詳細"
    description: "目標「${goalTitle}」の進捗: ${progress}/${target}"
    
  '/parent/children/[childId]':
    title: "${childName}の学習状況"  
    description: "${childName}の今週の学習記録と理解度"
```

---

## 6. Error & Loading States

### 6.1 Error Pages
```yaml
Error Routes:
  '/error/403':
    component: ForbiddenPage
    message: "このページにアクセスする権限がありません"
    actions: ["ホームに戻る", "別のアカウントでログイン"]
    
  '/error/404':
    component: NotFoundPage  
    message: "お探しのページが見つかりません"
    actions: ["ホームに戻る", "検索する", "サポートに問い合わせ"]
    
  '/error/500':
    component: ServerErrorPage
    message: "一時的な問題が発生しています"
    actions: ["再読み込み", "しばらく待ってから再試行"]

Maintenance Mode:
  '/maintenance':
    component: MaintenancePage
    message: "メンテナンス中です。しばらくお待ちください"
    estimated_time: dynamic from config
```

### 6.2 Loading States
```yaml
Route-level Loading:
  component: RouteLoading (skeleton + spinner)
  timeout: 5 seconds → show error message
  
Data-specific Loading:
  dashboard: SkeletonCards + progressive loading
  charts: ChartSkeleton → data population
  forms: optimistic updates + error rollback

Navigation Loading:
  page_transitions: fade in/out animation
  tab_switching: instant (cached) or skeleton
  deep_links: loading state → auth check → redirect
```

---

## 7. Traceability Matrix

### Requirements to Route Mapping

| Req ID | Route IDs | Purpose | API Dependencies | UI Components |
|--------|-----------|---------|------------------|---------------|
| REQ-001 | ROUTE-101, ROUTE-102, ROUTE-103 | 学習記録機能 | API-001, API-002, API-003 | SparkRecordForm, CalendarView |
| REQ-002 | ROUTE-201, ROUTE-202, ROUTE-206 | 保護者進捗把握 | API-004 | ParentDashboard, SupportMessage |
| REQ-003 | ROUTE-301, ROUTE-302, ROUTE-307 | 指導者管理機能 | API-007 | CoachDashboard, AlertsCenter |
| REQ-004 | ROUTE-104, ROUTE-105, ROUTE-304 | AI目標設定 | API-005 | GoalNavigation, AICoaching |
| REQ-005 | ROUTE-106, ROUTE-107, ROUTE-306 | AI振り返り | API-006 | ReflectionForm, AIFeedback |

### Route to API Mapping

| Route ID | Primary APIs | Secondary APIs | Data Flow |
|----------|--------------|----------------|-----------|
| ROUTE-101 | API-003 (dashboard) | API-002 (calendar) | GET → display |
| ROUTE-102 | API-001 (record CRUD) | - | POST/PUT → optimistic UI |
| ROUTE-104 | API-005 (AI coaching) | API-003 (context) | POST → streaming response |
| ROUTE-106 | API-006 (AI reflection) | API-003 (weekly summary) | POST → feedback display |
| ROUTE-201 | API-004 (parent dashboard) | - | GET → children overview |
| ROUTE-301 | API-007 (coach students) | - | GET → student list + alerts |

### Navigation to Component Mapping

| Navigation Element | Component | Props/State | Conditional Rendering |
|-------------------|-----------|-------------|----------------------|
| BottomNavigation | BottomNav | activeTab, badgeCounts | role === 'student' |
| CoachSidebar | Sidebar | collapsed, activeRoute | role === 'coach' |
| ParentHeader | Header | childSelector, notifications | role === 'parent' |
| UserMenu | UserDropdown | user, logoutAction | all authenticated |
| BreadcrumbsNav | Breadcrumbs | routeHistory, backAction | tablet+ only |

---

## 8. Route Implementation Notes

### 8.1 Next.js App Router Structure
```
app/
├── (auth)/                     # Auth layout group
│   ├── page.tsx               # ROUTE-001: Login
│   └── join/
│       └── page.tsx           # ROUTE-002: Join
├── setup/                     # Setup flow
│   ├── avatar/
│   ├── name/  
│   ├── profile/
│   ├── parent-avatar/
│   └── complete/
├── student/                   # Student routes group  
│   ├── layout.tsx            # StudentLayout + BottomNav
│   ├── page.tsx              # ROUTE-101: Dashboard
│   ├── spark/
│   │   ├── page.tsx          # ROUTE-102: Record form
│   │   └── history/
│   │       └── page.tsx      # ROUTE-103: History
│   ├── goal/
│   │   ├── page.tsx          # ROUTE-104: Goal nav
│   │   └── [goalId]/
│   │       └── page.tsx      # ROUTE-105: Goal detail
│   └── reflect/
│       ├── page.tsx          # ROUTE-106: Reflection
│       └── history/
│           └── page.tsx      # ROUTE-107: History
├── parent/                   # Parent routes group
│   ├── layout.tsx            # ParentLayout
│   ├── page.tsx              # ROUTE-201: Dashboard  
│   └── children/
│       └── [childId]/
│           └── page.tsx      # ROUTE-202: Child detail
└── coach/                    # Coach routes group
    ├── layout.tsx            # CoachLayout + Sidebar
    ├── page.tsx              # ROUTE-301: Dashboard
    └── students/
        └── [studentId]/
            └── page.tsx      # ROUTE-303: Student detail
```

### 8.2 Layout Composition Strategy
```typescript
// app/student/layout.tsx
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="pb-16 md:pb-0">
        {children}
      </main>
      <StudentBottomNavigation />
    </div>
  );
}

// Role-based layout switching in root layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <RouteGuard>
            <NavigationProvider>
              {children}
            </NavigationProvider>
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-07 | System | Initial sitemap from requirements and architecture |