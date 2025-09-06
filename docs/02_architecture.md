# StudySpark Architecture Definition

**Spec-Version**: 0.1  
**Depends**: docs/01_requirements.md, DECISIONS.md (TBD)  
**Document Status**: Initial Draft  
**Last Updated**: 2025-01-07

---

## 1. Architectural Layers & Boundaries

### Layer Definition
```
┌─────────────────────────────────────┐
│ UI Layer (React Components)         │
├─────────────────────────────────────┤
│ Application Layer (Business Logic)  │
├─────────────────────────────────────┤
│ Domain Layer (Core Models)          │
├─────────────────────────────────────┤
│ Data Layer (Persistence/External)   │
└─────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Technologies |
|-------|---------------|--------------|
| **UI** | Presentation, user interaction, routing | React, Next.js Pages, Tailwind CSS |
| **Application** | Use cases, orchestration, API handlers | Next.js API Routes, Edge Functions |
| **Domain** | Business rules, entities, value objects | TypeScript interfaces/classes |
| **Data** | Database access, external APIs, caching | Supabase, OpenAI API, Redis |

---

## 2. Dependency Rules

### Allowed Dependencies (↓ can depend on ↓)
- UI Layer → Application Layer
- Application Layer → Domain Layer  
- Application Layer → Data Layer
- Data Layer → Domain Layer (for entity mapping)

### Prohibited Dependencies (❌ MUST NOT)
- Domain Layer → ANY other layer
- Data Layer → Application Layer
- Data Layer → UI Layer
- UI Layer → Data Layer (must go through Application)
- Circular dependencies between any layers

### Cross-Cutting Concerns
- Logging/Monitoring: Injected via middleware
- Authentication: Handled at Application boundary
- Validation: Domain layer defines rules, Application enforces

---

## 3. Directory Policy (Next.js App Router)

```
/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication group
│   │   └── join/          
│   ├── student/           # Student routes (REQ-001, REQ-004, REQ-005)
│   │   ├── spark/        
│   │   ├── goal/         
│   │   └── reflect/      
│   ├── parent/            # Parent routes (REQ-002)
│   ├── coach/             # Coach routes (REQ-003)
│   └── api/               # API routes
│       ├── spark/        
│       ├── goal/         
│       └── reflect/      
├── components/            # UI components
│   ├── ui/               # Base UI components (shadcn)
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── lib/                   # Application layer
│   ├── actions/          # Server actions
│   ├── services/         # Business services
│   └── utils/            # Utilities
├── domain/               # Domain layer
│   ├── entities/         # Domain entities
│   ├── value-objects/    # Value objects
│   └── repositories/     # Repository interfaces
├── infrastructure/       # Data layer
│   ├── supabase/        # Supabase client/queries
│   ├── openai/          # OpenAI integration
│   └── repositories/     # Repository implementations
└── config/              # Configuration
    └── constants.ts     # App constants
```

### Naming Conventions
- Components: PascalCase (`StudentDashboard.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- API routes: kebab-case folders (`/api/study-records`)
- Domain entities: PascalCase (`Student.ts`)

---

## 4. Error Handling & Logging Strategy

### Error Hierarchy

| Error Type | ID Pattern | Handling | User Message |
|------------|------------|----------|--------------|
| **ValidationError** | ARCH-VAL-xxx | Return 400 | 具体的な入力エラー内容 |
| **AuthenticationError** | ARCH-AUTH-xxx | Return 401 | ログインが必要です |
| **AuthorizationError** | ARCH-AUTHZ-xxx | Return 403 | アクセス権限がありません |
| **NotFoundError** | ARCH-404-xxx | Return 404 | データが見つかりません |
| **BusinessError** | ARCH-BIZ-xxx | Return 422 | 業務ルールエラー詳細 |
| **SystemError** | ARCH-SYS-xxx | Return 500 | システムエラーが発生しました |

### Logging Levels

```typescript
// Structured logging format
{
  timestamp: ISO8601,
  level: 'error' | 'warn' | 'info' | 'debug',
  userId?: string,
  sessionId: string,
  errorCode?: string,
  message: string,
  metadata?: object
}
```

### Observability Stack
- **APM**: Vercel Analytics (built-in)
- **Error Tracking**: Sentry integration
- **Logs**: Supabase Logs + CloudWatch
- **Metrics**: Custom dashboards in Supabase

---

## 5. Configuration & Secrets Management

### Environment Variables Structure

```bash
# .env.local (development)
# .env.production (production - via Vercel)

# Public (client-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=

# Private (server-only)
SUPABASE_SERVICE_KEY=        # ARCH-SEC-001: Service role key
OPENAI_API_KEY=              # ARCH-SEC-002: AI service key
SESSION_SECRET=              # ARCH-SEC-003: JWT signing
SENTRY_DSN=                  # ARCH-SEC-004: Error tracking

# Feature Flags
ENABLE_AI_COACHING=true
ENABLE_PUSH_NOTIFICATIONS=false
```

### Secret Rotation Policy
- API keys: Rotate quarterly
- Session secrets: Rotate monthly
- Database passwords: Managed by Supabase

### Config Loading Priority
1. Environment variables
2. Config files (non-secret only)
3. Default values in code

---

## 6. Component Architecture Patterns

### UI Components (React)
- **Pattern**: Composition over inheritance
- **State**: React hooks + Zustand for global state
- **Data Fetching**: Server Components + SWR for client

### API Design (RESTful)
```
GET    /api/students/{id}/records     # List
POST   /api/students/{id}/records     # Create
GET    /api/students/{id}/records/{id} # Read
PUT    /api/students/{id}/records/{id} # Update
DELETE /api/students/{id}/records/{id} # Delete
```

### Database Access Pattern
- **Repository Pattern**: Interface in Domain, implementation in Infrastructure
- **Unit of Work**: Transaction management via Supabase
- **Query Builder**: Supabase client with type safety

---

## 7. Security Architecture

### Authentication Flow (ARCH-AUTH-001)
```
User → Next.js → Supabase Auth → JWT → Protected Route
        ↓
    Middleware validates session
```

### Authorization Matrix (ARCH-AUTHZ-001)

| Resource | Student | Parent | Coach | Admin |
|----------|---------|--------|-------|-------|
| Own Records | RW | R | - | R |
| Child Records | - | R | - | R |
| Student Records | - | - | R | RW |
| System Config | - | - | - | RW |

### Data Protection
- **At Rest**: Supabase encryption (AES-256)
- **In Transit**: HTTPS only (TLS 1.3)
- **PII Handling**: Masked in logs, encrypted in DB

---

## 8. Performance Architecture

### Caching Strategy (ARCH-PERF-001)

| Data Type | Cache Location | TTL | Invalidation |
|-----------|---------------|-----|--------------|
| User Profile | Browser | 1h | On update |
| Learning Records | SWR | 5m | On mutation |
| AI Responses | Edge Cache | 24h | Manual |
| Static Assets | CDN | 30d | Deploy |

### Optimization Techniques
- **Code Splitting**: Per-route automatic (Next.js)
- **Image Optimization**: Next/Image with responsive sizes
- **API Response**: Pagination (limit: 50 items)
- **Database**: Indexed on (user_id, date, subject)

---

## 9. Traceability Matrix

### Requirements to Architecture Mapping

| Req ID | Arch Component | Arch ID | Implementation Notes |
|--------|---------------|---------|---------------------|
| REQ-001 | Learning Record API | ARCH-API-001 | REST endpoints for Spark feature |
| REQ-001 | StudyRecord Entity | ARCH-DOM-001 | Domain model with validation |
| REQ-001 | Heatmap Component | ARCH-UI-001 | React component with D3.js |
| REQ-002 | Parent Dashboard | ARCH-API-002 | Aggregation service layer |
| REQ-002 | Family Relation | ARCH-DOM-002 | Domain model for parent-child |
| REQ-003 | Coach Overview | ARCH-API-003 | Multi-tenant data access |
| REQ-003 | Alert System | ARCH-SVC-001 | Background job for notifications |
| REQ-004 | AI Coaching Service | ARCH-AI-001 | OpenAI integration layer |
| REQ-004 | Goal Entity | ARCH-DOM-003 | SMART goal validation |
| REQ-005 | Reflection Service | ARCH-SVC-002 | Weekly aggregation logic |

### Architecture Decision Records (ADR)

| ADR ID | Decision | Rationale | Status |
|--------|----------|-----------|--------|
| ADR-001 | Use Next.js App Router | Server Components for performance | Approved |
| ADR-002 | Supabase for Backend | Integrated auth + RLS | Approved |
| ADR-003 | Repository Pattern | Testability & flexibility | Approved |
| ADR-004 | Edge Functions for AI | Reduce latency for users | Proposed |

---

## 10. Deployment Architecture

### Environment Strategy
```
Development → Staging → Production
  (local)     (Vercel)   (Vercel)
```

### Infrastructure Components
- **Hosting**: Vercel (Next.js optimized)
- **Database**: Supabase (PostgreSQL)
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry

### CI/CD Pipeline
1. Push to GitHub
2. Vercel preview deployment
3. Automated tests (Jest + Playwright)
4. Manual approval for production
5. Automatic rollback on errors

---

## 11. Disaster Recovery

### Backup Strategy
- **Database**: Daily automated (Supabase)
- **User Files**: Not applicable (no file uploads)
- **Retention**: 30 days rolling backup

### RTO/RPO Targets
- **RTO**: 4 hours (from requirements)
- **RPO**: 24 hours (daily backup)
- **Failover**: Automatic via Vercel

---

## Appendix A: Technology Decisions

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Runtime | Node.js | 20.x LTS | Stability & performance |
| Framework | Next.js | 14.2.x | App Router benefits |
| Language | TypeScript | 5.5.x | Type safety |
| Database | PostgreSQL | 15.x | Via Supabase |
| Auth | Supabase Auth | Latest | Integrated solution |
| AI | OpenAI | GPT-5-mini | Cost-effective |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-07 | System | Initial architecture from requirements |