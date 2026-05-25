# ERP Coupling Fix — Design Spec
Date: 2026-05-23

## Scope
Fix all violations from `docs/COUPLING_AUDIT.md` without breaking the running application.
4 sequential phases, each verified by build + server start.

## Phase 1 — Config & Shared Utils

### Backend
- `core/config/env.ts` becomes validated env object. Throws at startup if required vars missing.
  Required vars: `MONGO_URI`, `JWT_SECRET`. Optional with defaults: `PORT`, `SMTP_*`, `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `FRONTEND_ORIGINS`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SEED_LOCAL_DATA`.
- All `process.env.*` access outside `core/config/env.ts` and `core/utils/` → replaced with `import { env } from "@core/config/env"`.
- 22 `createLog()` call sites → `eventBus.publish("audit.entry", payload)`.
- `modules/audit/events/index.ts` subscribes to `"audit.entry"` and writes to Logs collection (moves `createLog` logic here).

### Frontend
- `lib/session.ts` — typed, schema-validated wrapper for localStorage.
  Exported: `getSchool()`, `setSchool()`, `getTeacher()`, `setTeacher()`, `getAuthToken()`, `setAuthToken()`, `getRole()`, `setRole()`, `getTeacherPermissions()`, `setTeacherPermissions()`, `clearAll()`.
- `lib/apiClient.ts` — thin typed wrapper around `window.fetch` (uses `API_URL` from `lib/api`).
  Exported: `apiClient.get<T>(path)`, `apiClient.post<T>(path, body)`, `apiClient.put<T>(path, body)`, `apiClient.patch<T>(path, body)`, `apiClient.delete<T>(path)`.

## Phase 2 — Break Circular Dependencies

### New `modules/auth/` module
```
modules/auth/
├── api/authRoutes.ts          Express router mounted at /api/auth
├── application/AuthService.ts JWT sign/verify, bcrypt, throttle, credential email
└── index.ts
```

New URL map:
| New URL | Old URL | Notes |
|---------|---------|-------|
| POST /api/auth/school/login | /api/schools/login | |
| POST /api/auth/staff/login | /api/staff/login | |
| POST /api/auth/school/register | /api/schools/register | |
| POST /api/auth/super-admin/login | /api/schools/super-admin-login | |

- `school/routes/schoolRoutes.ts` loses: JWT imports, throttle imports, bcrypt, login/register handlers.
- `staff/routes/staffRoutes.ts` loses: JWT imports, throttle imports, bcrypt, login handlers.
- Old URL paths kept as 301 redirects or removed (frontend updated in Phase 4).

### Break `students ↔ finance`
- `finance/routes/financeRoutes.ts` + `finance/services/financeService.ts`: stop importing `Student` model. Use `studentId: string` only. Student name/email resolved from `StudentFeeAssignment.studentName` field (already stored) or omitted from response.
- `modules/finance/seeds/financeSeeds.ts`: stop importing `Student`. Seed by studentId string directly.
- `students/routes/studentRoutes.ts`: stop importing `Finance` model and `finance/utils/classFeeStructure`. Finance summary for student profile fetched by querying `StudentFeeAssignment` collection directly (students module gets read-only access to fee assignment data by studentId).

## Phase 3 — Split God Routes

### `school/routes/` (after auth extracted, ~1012L → ~500L remaining)
```
modules/school/routes/
├── schoolProfileRoutes.ts     School CRUD, settings, profile update
└── schoolDataRoutes.ts        Bulk export, data deletion, stats
```
`server.ts` mounts both. Existing route paths unchanged.

### `students/routes/` (1010L → 2 files)
```
modules/students/routes/
├── studentCrudRoutes.ts       Create, list, update, delete, import
└── studentProfileRoutes.ts    Profile details, documents, transport assignment
```

### `data-import/` (1471L → thin route + service)
- `modules/data-import/application/ImportOrchestrationService.ts` owns: XLSX parsing, OCR (Tesseract), AI (GROQ), bulk upsert coordination.
- `data-import/routes/dataImportRoutes.ts` becomes: validate → call service → respond (~150L).

### `finance/routes/financeRoutes.ts` (2589L → thin route + extended service)
- All inline mongoose operations move into `finance/services/financeService.ts`.
- Route file: validate → call service → respond (~300L).

## Phase 4 — Frontend Migration

### Auth URL update
- `lib/auth.ts` login functions updated to new `/api/auth/*` endpoints.

### localStorage migration
- All 127 direct `localStorage.*` accesses outside `lib/session.ts` replaced with `session.*` calls.
- Files: `modules/finance/FinanceModule.tsx` (24 hits), `contexts/RoleContext.tsx`, `modules/communication/*`, `modules/attendance/*`, `modules/classes/*`, `modules/hr/*`, `modules/data-import/*`, `modules/downloads/*`, `modules/exams/*`, `modules/finance/components/*`, `modules/house/*`, `modules/transport/*`, `pages/teacher/modules/*`, `pages/school-admin/*`, `components/RoleSwitcher.tsx`, `components/SalaryStructureModule.tsx`, `components/SchoolAdminDashboard.tsx`, `components/TopNavbar.tsx`, `services/timetableService.ts`.

### fetch() migration
- All 30+ raw `fetch()` call sites replaced with `apiClient.*`.
- `modules/finance/components/AddExpenseForm.tsx`, `BudgetMonitoring.tsx`, `ExpenseApprovalWorkflow.tsx`, `ExpenseAuditLog.tsx`, `ExpenseCategoryManagement.tsx`, `ExpenseDashboard.tsx`, `ExpenseList.tsx`, `VendorManagement.tsx` — all use `apiClient` with auth handled centrally.

### VITE_API_URL deduplication
- `modules/hr/HRModule.tsx`, `modules/social-media/SocialMediaModule.tsx`, `modules/transport/TransportModule.tsx`, `services/timetableService.ts` — remove local URL parsing, import `API_URL` from `@/lib/api`.

## Constraints
- `npm run build` passes after each phase.
- Backend starts (`npm run dev:backend`) after each phase.
- No business logic rewritten — only moved or wrapped.
- `eng.traineddata` stays at `backend/eng.traineddata`.
- No test files deleted.
