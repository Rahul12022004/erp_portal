# Design: Svelte → Go Backend HTTP Layer Cleanup

**Date:** 2026-05-29  
**Status:** Approved  
**Approach:** B — Surgical layered fix

---

## Context

The ERP portal has three codebases:
- `backend/` — Node/Express (legacy, still running)
- `go-backend/` — Go/Fiber (active, port 5000)
- `frontend-svelte/` — SvelteKit 5 (Svelte runes)

**Goal:** Make Svelte work cleanly against the Go backend. Go defaults to port 5000; vite proxy already targets port 5000. No changes to Go backend.

---

## Current Problems

| Problem | File | Impact |
|---|---|---|
| `authedFetch` duplicates auth logic | `school/+page.svelte` | Triple auth layer; brittle |
| Students service is empty | `modules/students/services/` | Students page can't load data |
| Response parsing is inline, untyped | `school/+page.svelte` | Fragile; breaks on shape change |
| `PUBLIC_API_URL` guidance missing | `.env.example` | Prod deployments misconfigured |
| Interceptor role undocumented | `interceptor.ts` | Devs don't know if it's needed |

---

## Out of Scope

- Go backend changes
- Node backend changes  
- Any module UI beyond students
- Non-school-admin routes

---

## Layer 1 — Environment & HTTP Client

### `frontend-svelte/.env.example`

```
# Dev: leave empty — vite proxy handles /api → localhost:5000 (Go backend)
PUBLIC_API_URL=

# Prod: set to your Go backend URL, e.g.:
# PUBLIC_API_URL=https://api.yourdomain.com
```

### `src/lib/api/interceptor.ts`

No logic changes. Add top-of-file comment explaining:
- It is a safety net for any bare `fetch('/api/...')` calls not yet migrated to `api` client
- Once all pages use `api.*`, this can be removed
- Do NOT remove until grep confirms no bare `fetch('/api/')` calls remain

### `src/lib/api/client.ts`

No changes — already correct.

---

## Layer 2 — Go Response Normalizers

**New file:** `src/lib/api/normalize.ts`

### Go envelope unwrapper

Go backend always responds with `{ success: boolean, data: T }`.  
The `api` client returns the raw JSON body. Callers must unwrap `.data`.

```typescript
// Unwrap Go's { success, data } envelope. Throws ApiError on success:false.
export function unwrapGo<T>(json: { success?: boolean; data?: T; error?: string }): T {
  if (json.success === false) throw new ApiError(400, json.error ?? 'API error');
  return json.data as T;
}
```

### Module normalizers (map Go JSON → typed frontend models)

Each normalizer is a pure function: `(rawJson: unknown) => TypedModel[]`

| Normalizer | Input source | Output type |
|---|---|---|
| `normalizeClasses(json)` | `GET /api/classes?schoolId=` | `ClassData[]` |
| `normalizeStudents(json)` | `GET /api/students/:schoolId` | `Student[]` |
| `normalizeLeaves(json)` | `GET /api/leaves/school/:schoolId` | `LeaveApplication[]` |
| `normalizeExams(json)` | `GET /api/exams/school/:schoolId` | `ExamItem[]` |

Each normalizer:
- Accepts the full Go response (with `success`/`data` envelope)
- Handles both PascalCase and camelCase field names (Go may return either)
- Returns typed array, never throws — returns `[]` on bad shape
- Has a JSDoc comment listing the Go endpoint it normalizes

---

## Layer 3 — School Dashboard Page

**File:** `src/routes/(app)/school/+page.svelte`

### Remove

- `authedFetch` function (replaced by `api` client)
- Inline field-name normalization (e.g. `c.Name ?? c.name`)
- Move to normalizers

### Replace

All `authedFetch('/api/...')` calls → `api.get(ENDPOINTS.x.y(schoolId))`

Fetch sequence (unchanged, just cleaner):

```
fetchDashboard()
  api.get(ENDPOINTS.analytics.dashboard(schoolId))   → unwrapGo → { students, staff }
  api.get(ENDPOINTS.classes.bySchool(schoolId))      → normalizeClasses()
  api.get(ENDPOINTS.announcements.bySchool(schoolId))→ normalizeAnnouncements()
  // NOTE: ENDPOINTS.announcements.bySchool must be fixed to query-param form:
  //   (schoolId) => `/api/announcements?schoolId=${schoolId}`
  //   (Go backend reads schoolId as ?schoolId= not /:schoolId)
  api.get(ENDPOINTS.analytics.feeTrend(schoolId))    → normalizeFeeTrend()
  api.get(ENDPOINTS.exams.bySchool(schoolId))        → normalizeExams()

fetchLeaves()
  api.get(ENDPOINTS.leaves.bySchool(schoolId))       → normalizeLeaves()

fetchFinStudents()
  api.get(ENDPOINTS.finance.dashboardSummary(schoolId)) → unwrapGo → FinMetrics
  api.get(ENDPOINTS.finance.assignments + ?schoolId=)   → unwrapGo → assignments[]
```

### Error handling

Each fetch sets a typed error string, displayed as a red banner.  
No silent swallowing. `api` client already throws `ApiError` on non-2xx.

---

## Layer 4 — Students Service

**New file:** `src/modules/students/services/index.ts`

```typescript
export const studentsService = {
  list:   (schoolId: string) => api.get(ENDPOINTS.students.bySchool(schoolId)).then(normalizeStudents),
  create: (body: CreateStudentInput) => api.post(ENDPOINTS.students.create, body),
  update: (id: string, body: Partial<CreateStudentInput>) => api.put(ENDPOINTS.students.update(id), body),
  delete: (id: string) => api.delete(ENDPOINTS.students.delete(id)),
};
```

Types defined in `src/modules/students/types/index.ts` (currently `.gitkeep`).

---

## Testing

After changes, run:
```
npm run check   # zero TS errors
npm run test    # existing api.client tests still pass
```

Add one new test file: `src/modules/students/services/index.test.ts`  
- Mocks `api` client
- Verifies `studentsService.list` unwraps and normalizes correctly

---

## TODO Tags (Go migration future)

Place `// TODO(go-migration):` comments where Go endpoint paths or response shapes are assumed:
- `normalize.ts` — each normalizer documents the exact Go endpoint and field names used
- `+page.svelte` — each `ENDPOINTS.*` call has the Go route in a comment

---

## Success Criteria

- `npm run check` passes, zero new errors
- `npm run test` passes
- School dashboard loads analytics, classes, exams, leaves, finance with no `authedFetch`
- Students service exported and functional (ready to wire to UI)
- No bare `fetch('/api/')` calls remain in `+page.svelte`
