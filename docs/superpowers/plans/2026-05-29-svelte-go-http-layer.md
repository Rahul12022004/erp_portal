# Svelte → Go HTTP Layer Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Svelte frontend talk to the Go backend through one HTTP client, with typed response normalizers and a working students service.

**Architecture:** Go backend (port 5000) responds with `{ success, data }` envelopes and camelCase fields. The `api` client (`src/lib/api/client.ts`) already injects auth and the base URL. We remove the duplicate `authedFetch` from the school dashboard, add typed normalizers that unwrap Go responses, fix one wrong endpoint path, and implement the empty students service.

**Tech Stack:** SvelteKit 5 (runes), TypeScript strict, Vitest, the existing `api` client + `ENDPOINTS` registry.

---

## Go Backend Contracts (verified 2026-05-29)

All wrapped in `{ success: boolean, data: T }`. All fields camelCase.

| Endpoint | `data` shape |
|---|---|
| `GET /api/analytics/dashboard?schoolId=` | `{ students: number, staff: number, feeCollection: { totalFee, paidAmount, dueAmount } }` |
| `GET /api/classes?schoolId=` | `[{ _id, name, section, studentCount, ... }]` |
| `GET /api/announcements?schoolId=` | `[{ _id, title, message, author, createdAt }]` |
| `GET /api/analytics/fee/trend?schoolId=` | `[{ _id: "2026-05", collected: number, pending: number }]` |
| `GET /api/exams/school/:schoolId` | `[{ _id, className, title, examType, subject, examDate, startTime, endTime }]` |
| `GET /api/leaves/school/:schoolId` | `[{ _id, teacherId, title, description, leaveType, status, fileName, fileData, createdAt }]` |
| `GET /api/finance/:schoolId/dashboard-summary` | `{ fee: { totalFeeAmount, collectedAmount, pendingAmount, totalStudents, paidCount, partialCount, unpaidCount, overdueCount } }` |
| `GET /api/finance/assignments?schoolId=&limit=` | `{ data: [...], total, page, limit }` |
| `GET /api/students/:schoolId` | `{ students: [...], total, page, limit }` |

> NOTE: Go returns `teacherId` on leaves as a bare string ID (not a populated object). UI falls back to "Unknown" for teacher name. Tagged `TODO(go-migration)` in code.

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend-svelte/.env.example` | Document `PUBLIC_API_URL` for dev (empty) vs prod |
| `frontend-svelte/src/lib/api/endpoints.ts` | Fix `announcements.bySchool` to query-param form |
| `frontend-svelte/src/lib/api/interceptor.ts` | Add explanatory comment (no logic change) |
| `frontend-svelte/src/lib/api/normalize.ts` | NEW — `unwrapGo` + 5 typed normalizers + shared types |
| `frontend-svelte/src/lib/api/normalize.test.ts` | NEW — unit tests for normalizers |
| `frontend-svelte/src/modules/students/types/index.ts` | NEW — `Student`, `CreateStudentInput` types |
| `frontend-svelte/src/modules/students/services/index.ts` | NEW — `studentsService` CRUD |
| `frontend-svelte/src/modules/students/services/index.test.ts` | NEW — service unit test |
| `frontend-svelte/src/routes/(app)/school/+page.svelte` | Remove `authedFetch`; use `api` + normalizers |

---

## Task 1: Fix endpoint path + env docs

**Files:**
- Modify: `frontend-svelte/src/lib/api/endpoints.ts:110`
- Modify: `frontend-svelte/.env.example`

- [ ] **Step 1: Fix the announcements endpoint to query-param form**

The Go backend reads `schoolId` from the query string (`c.Query("schoolId")`), not a path param. Change line 110.

In `frontend-svelte/src/lib/api/endpoints.ts`, replace:

```typescript
  announcements: {
    bySchool: (schoolId: string) => `/api/announcements/${schoolId}`,
    create:   '/api/announcements',
    delete:   (id: string)       => `/api/announcements/${id}`,
    aiDraft:  '/api/announcements/ai-draft',
```

with:

```typescript
  announcements: {
    // Go backend reads schoolId from query string, not a path param.
    bySchool: (schoolId: string) => `/api/announcements?schoolId=${schoolId}`,
    create:   '/api/announcements',
    delete:   (id: string)       => `/api/announcements/${id}`,
    aiDraft:  '/api/announcements/ai-draft',
```

- [ ] **Step 2: Rewrite `.env.example` with dev/prod guidance**

Replace the entire contents of `frontend-svelte/.env.example` with:

```
# ── API base URL ────────────────────────────────────────────────────────────
# DEV: leave EMPTY. The vite dev server proxies /api → http://localhost:5000
#      (the Go backend). An empty base means fetch('/api/...') hits the proxy.
PUBLIC_API_URL=

# PROD: set to the absolute Go backend URL, e.g.
#   PUBLIC_API_URL=https://api.yourdomain.com
# The api client then builds `${PUBLIC_API_URL}/api/...` for every request.
#
# NOTE: The Go backend (go-backend/) and the legacy Node backend (backend/)
# both default to port 5000. Run only one at a time in dev, or change ports.
```

- [ ] **Step 3: Verify the dev `.env` matches dev guidance**

Run: `cat frontend-svelte/.env`

If it contains `PUBLIC_API_URL=http://localhost:5000`, change it to an empty value so dev relies on the proxy (avoids double-origin requests and CORS):

```
PUBLIC_API_URL=
```

Expected: `.env` now has an empty `PUBLIC_API_URL`.

- [ ] **Step 4: Type-check**

Run: `cd frontend-svelte && npm run check`
Expected: 0 errors (warnings about other files are pre-existing and fine).

- [ ] **Step 5: Commit**

```bash
git add frontend-svelte/src/lib/api/endpoints.ts frontend-svelte/.env.example frontend-svelte/.env
git commit -m "fix(api): correct announcements endpoint to query-param; document PUBLIC_API_URL"
```

---

## Task 2: Create normalize.ts (unwrapGo + types)

**Files:**
- Create: `frontend-svelte/src/lib/api/normalize.ts`
- Test: `frontend-svelte/src/lib/api/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend-svelte/src/lib/api/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ApiError } from '$lib/types';
import {
  unwrapGo,
  normalizeClasses,
  normalizeAnnouncements,
  normalizeFeeTrend,
  normalizeExams,
  normalizeLeaves,
} from './normalize';

describe('unwrapGo', () => {
  it('returns data on success', () => {
    expect(unwrapGo({ success: true, data: { x: 1 } })).toEqual({ x: 1 });
  });
  it('returns data when success flag is absent', () => {
    expect(unwrapGo({ data: [1, 2] })).toEqual([1, 2]);
  });
  it('throws ApiError when success is false', () => {
    expect(() => unwrapGo({ success: false, error: 'boom' })).toThrowError(ApiError);
  });
});

describe('normalizeClasses', () => {
  it('maps Go class rows to ClassData with section suffix', () => {
    const json = { success: true, data: [
      { _id: '1', name: 'Grade 1', section: 'A', studentCount: 30 },
      { _id: '2', name: 'Grade 2', section: '', studentCount: 25 },
    ]};
    expect(normalizeClasses(json)).toEqual([
      { name: 'Grade 1-A', students: 30 },
      { name: 'Grade 2', students: 25 },
    ]);
  });
  it('returns [] on a non-array data field', () => {
    expect(normalizeClasses({ success: true, data: null })).toEqual([]);
  });
});

describe('normalizeAnnouncements', () => {
  it('maps Go announcement rows', () => {
    const json = { success: true, data: [
      { _id: 'a1', title: 'Hi', message: 'Body', author: 'Admin', createdAt: '2026-05-01T00:00:00Z' },
    ]};
    const out = normalizeAnnouncements(json);
    expect(out[0].id).toBe('a1');
    expect(out[0].title).toBe('Hi');
    expect(out[0].desc).toBe('Body');
    expect(out[0].author).toBe('Admin');
  });
});

describe('normalizeFeeTrend', () => {
  it('derives fees/expense/profit from collected+pending', () => {
    const json = { success: true, data: [
      { _id: '2026-05', collected: 800, pending: 200 },
    ]};
    expect(normalizeFeeTrend(json)).toEqual([
      { month: '2026-05', fees: 1000, expense: 200, profit: 800 },
    ]);
  });
});

describe('normalizeExams', () => {
  it('passes through Go exam fields', () => {
    const json = { success: true, data: [
      { _id: 'e1', className: 'Grade 1', title: 'Midterm', examType: 'Written',
        subject: 'Math', examDate: '2026-06-01', startTime: '09:00', endTime: '10:00' },
    ]};
    const out = normalizeExams(json);
    expect(out[0]._id).toBe('e1');
    expect(out[0].subject).toBe('Math');
    expect(out[0].className).toBe('Grade 1');
  });
});

describe('normalizeLeaves', () => {
  it('maps Go leave rows and tolerates string teacherId', () => {
    const json = { success: true, data: [
      { _id: 'l1', teacherId: 'tid', title: 'Sick', description: 'flu',
        leaveType: 'Paid', status: 'Pending', createdAt: '2026-05-01T00:00:00Z' },
    ]};
    const out = normalizeLeaves(json);
    expect(out[0]._id).toBe('l1');
    expect(out[0].leaveType).toBe('Paid');
    expect(out[0].status).toBe('Pending');
    // teacherId is a bare string from Go → no populated object
    expect(out[0].teacherId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend-svelte && npx vitest run src/lib/api/normalize.test.ts`
Expected: FAIL — `Failed to resolve import "./normalize"` / module not found.

- [ ] **Step 3: Implement normalize.ts**

Create `frontend-svelte/src/lib/api/normalize.ts`:

```typescript
import { ApiError } from '$lib/types';

// ─── Go envelope ──────────────────────────────────────────────────────────────
// The Go backend always responds with { success, data }. The api client returns
// the raw JSON body, so callers unwrap .data here.
export interface GoEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Unwrap Go's { success, data } envelope. Throws ApiError on success:false. */
export function unwrapGo<T>(json: GoEnvelope<T>): T {
  if (json && json.success === false) {
    throw new ApiError(400, json.error ?? json.message ?? 'API error');
  }
  return json?.data as T;
}

// Pull a plain array out of an envelope, tolerating `data: [...]` or a bare array.
function toArray(json: unknown): Record<string, unknown>[] {
  const data = (json as GoEnvelope<unknown>)?.data ?? json;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

// ─── Frontend models (shared with the school dashboard) ─────────────────────────
export type ClassData = { name: string; students: number };
export type FinanceData = { month: string; fees: number; expense: number; profit: number };
export type NotificationItem = { id?: string; title: string; desc: string; time: string; author?: string };
export type ExamItem = {
  _id: string; title: string; examType: string; className: string;
  subject: string; examDate: string; startTime: string; endTime: string;
};
export type LeaveApplication = {
  _id: string; title: string; description: string;
  leaveType: 'Paid' | 'Unpaid' | 'Emergency';
  fileName?: string; fileData?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  teacherId?: { _id: string; name: string; email: string; position: string };
};

// ─── Normalizers (Go camelCase JSON → typed models) ─────────────────────────────

/** GET /api/classes?schoolId= → ClassData[] */
export function normalizeClasses(json: unknown): ClassData[] {
  return toArray(json).map((c) => {
    const section = String(c.section ?? '');
    return {
      name: String(c.name ?? '') + (section ? `-${section}` : ''),
      students: Number(c.studentCount ?? 0),
    };
  });
}

/** GET /api/announcements?schoolId= → NotificationItem[] */
export function normalizeAnnouncements(json: unknown): NotificationItem[] {
  return toArray(json).map((a) => ({
    id: String(a._id ?? ''),
    title: String(a.title ?? ''),
    desc: String(a.message ?? ''),
    time: a.createdAt ? new Date(String(a.createdAt)).toLocaleDateString('en-IN') : '',
    author: String(a.author ?? ''),
  }));
}

/** GET /api/analytics/fee/trend?schoolId= → FinanceData[] */
export function normalizeFeeTrend(json: unknown): FinanceData[] {
  return toArray(json).map((r) => {
    const collected = Number(r.collected ?? 0);
    const pending = Number(r.pending ?? 0);
    return {
      month: String(r._id ?? ''),
      fees: collected + pending,
      expense: pending,
      profit: collected,
    };
  });
}

/** GET /api/exams/school/:schoolId → ExamItem[] */
export function normalizeExams(json: unknown): ExamItem[] {
  return toArray(json).map((e) => ({
    _id: String(e._id ?? ''),
    title: String(e.title ?? ''),
    examType: String(e.examType ?? ''),
    className: String(e.className ?? ''),
    subject: String(e.subject ?? ''),
    examDate: String(e.examDate ?? ''),
    startTime: String(e.startTime ?? ''),
    endTime: String(e.endTime ?? ''),
  }));
}

/** GET /api/leaves/school/:schoolId → LeaveApplication[]
 *  TODO(go-migration): Go returns teacherId as a bare string ID, not a populated
 *  object. Until the backend populates teacher details, teacherId is left
 *  undefined so the UI falls back to "Unknown". */
export function normalizeLeaves(json: unknown): LeaveApplication[] {
  return toArray(json).map((l) => ({
    _id: String(l._id ?? ''),
    title: String(l.title ?? ''),
    description: String(l.description ?? ''),
    leaveType: String(l.leaveType ?? 'Paid') as LeaveApplication['leaveType'],
    status: String(l.status ?? 'Pending') as LeaveApplication['status'],
    fileName: l.fileName ? String(l.fileName) : undefined,
    fileData: l.fileData ? String(l.fileData) : undefined,
    createdAt: String(l.createdAt ?? ''),
    teacherId: undefined,
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend-svelte && npx vitest run src/lib/api/normalize.test.ts`
Expected: PASS — all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add frontend-svelte/src/lib/api/normalize.ts frontend-svelte/src/lib/api/normalize.test.ts
git commit -m "feat(api): add Go envelope unwrapper and typed response normalizers"
```

---

## Task 3: Students module types + service

**Files:**
- Create: `frontend-svelte/src/modules/students/types/index.ts`
- Create: `frontend-svelte/src/modules/students/services/index.ts`
- Test: `frontend-svelte/src/modules/students/services/index.test.ts`

> Delete the `.gitkeep` files in those folders as part of this task.

- [ ] **Step 1: Create the student types file**

Create `frontend-svelte/src/modules/students/types/index.ts`:

```typescript
// Mirrors the Go backend Student domain (camelCase JSON).
export interface Student {
  _id: string;
  schoolId: string;
  name: string;
  email: string;
  class: string;
  classSection: string;
  rollNumber: string;
  academicYear: string;
  phone: string;
  gender: string;
  status: string;
  needsTransport: boolean;
  admissionCompleted: boolean;
}

// Minimum fields the Go create/update handlers require.
export interface CreateStudentInput {
  name: string;
  email: string;
  class: string;
  rollNumber: string;
  schoolId: string;
  classSection?: string;
  academicYear?: string;
  phone?: string;
  gender?: string;
  needsTransport?: boolean;
}
```

- [ ] **Step 2: Write the failing service test**

Create `frontend-svelte/src/modules/students/services/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api client BEFORE importing the service.
vi.mock('$lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const { api } = await import('$lib/api/client');
const { studentsService } = await import('./index');

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe('studentsService.list', () => {
  it('unwraps Go { data: { students } } into a Student array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      success: true,
      data: { students: [{ _id: 's1', name: 'Asha', class: 'Grade 1' }], total: 1 },
    });

    const out = await studentsService.list('school-1');

    expect(api.get).toHaveBeenCalledWith('/api/students/school-1');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Asha');
  });

  it('returns [] when students field is missing', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, data: {} });
    const out = await studentsService.list('school-1');
    expect(out).toEqual([]);
  });
});

describe('studentsService.create', () => {
  it('posts the body to the create endpoint', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ success: true, data: { _id: 's2' } });
    await studentsService.create({
      name: 'Ravi', email: 'r@x.com', class: 'Grade 2', rollNumber: '5', schoolId: 'school-1',
    });
    expect(api.post).toHaveBeenCalledWith('/api/students', expect.objectContaining({ name: 'Ravi' }));
  });
});

describe('studentsService.delete', () => {
  it('calls delete with the student id path', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ success: true });
    await studentsService.delete('s9');
    expect(api.delete).toHaveBeenCalledWith('/api/students/s9');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend-svelte && npx vitest run src/modules/students/services/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 4: Implement the students service**

Create `frontend-svelte/src/modules/students/services/index.ts`:

```typescript
import { api } from '$lib/api/client';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { GoEnvelope } from '$lib/api/normalize';
import type { Student, CreateStudentInput } from '../types';

// Go: GET /api/students/:schoolId → { success, data: { students, total, page, limit } }
interface StudentListData {
  students: Student[];
  total: number;
  page: number;
  limit: number;
}

export const studentsService = {
  /** List all students for a school. */
  async list(schoolId: string): Promise<Student[]> {
    const json = await api.get<GoEnvelope<StudentListData>>(ENDPOINTS.students.bySchool(schoolId));
    return json?.data?.students ?? [];
  },

  /** Create a new student. */
  create(body: CreateStudentInput): Promise<GoEnvelope<Student>> {
    return api.post<GoEnvelope<Student>>(ENDPOINTS.students.create, body);
  },

  /** Update an existing student by id. */
  update(id: string, body: Partial<CreateStudentInput>): Promise<GoEnvelope<Student>> {
    return api.put<GoEnvelope<Student>>(ENDPOINTS.students.update(id), body);
  },

  /** Delete a student by id. */
  delete(id: string): Promise<GoEnvelope<unknown>> {
    return api.delete<GoEnvelope<unknown>>(ENDPOINTS.students.delete(id));
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend-svelte && npx vitest run src/modules/students/services/index.test.ts`
Expected: PASS — all three describe blocks green.

- [ ] **Step 6: Remove the now-redundant .gitkeep files**

```bash
git rm -f frontend-svelte/src/modules/students/types/.gitkeep frontend-svelte/src/modules/students/services/.gitkeep
```

(If git reports they are not tracked, delete them directly with `rm`.)

- [ ] **Step 7: Type-check**

Run: `cd frontend-svelte && npm run check`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add frontend-svelte/src/modules/students/
git commit -m "feat(students): implement students service and types over api client"
```

---

## Task 4: Refactor school dashboard onto api client

**Files:**
- Modify: `frontend-svelte/src/routes/(app)/school/+page.svelte`

This task swaps the page's custom `authedFetch` and inline parsing for the `api` client + normalizers. The UI markup is unchanged.

> **Pre-existing state:** The `finError` state variable (`let finError = $state('')`) and the red error banner in the Finance tab already exist in the current file — do NOT re-add them. Likewise the chart `$effect`s and the calendar month-grid are already present and must be left untouched. This task only changes imports, type declarations, and the data-fetching functions.

- [ ] **Step 1: Add imports for api, ENDPOINTS, and normalizers**

In `frontend-svelte/src/routes/(app)/school/+page.svelte`, just after the existing `lucide-svelte` and `chart.js` import blocks (before the `// ─── types` comment), add:

```typescript
  import { api } from '$lib/api/client';
  import { ENDPOINTS } from '$lib/api/endpoints';
  import {
    normalizeClasses,
    normalizeAnnouncements,
    normalizeFeeTrend,
    normalizeExams,
    normalizeLeaves,
    type ClassData,
    type FinanceData,
    type NotificationItem,
    type ExamItem,
    type LeaveApplication,
  } from '$lib/api/normalize';
```

> The page reads `.data` directly via inline typed shapes, so `unwrapGo` is **not** imported here (it would be an unused import). `unwrapGo` is exercised by the students service indirectly and by `normalize.test.ts` directly.

- [ ] **Step 2: Remove the now-duplicated local type aliases**

The types `ClassData`, `FinanceData`, `NotificationItem`, `ExamItem`, and `LeaveApplication` are now imported. Delete their local `type ... =` declarations from the `// ─── types` block so there are no duplicate-identifier errors. Delete exactly these lines:

```typescript
  type ClassData        = { name: string; students: number };
  type FinanceData      = { month: string; fees: number; expense: number; profit: number };
  type NotificationItem = { id?: string; title: string; desc: string; time: string; author?: string };
  type ExamItem         = { _id: string; title: string; examType: string; className: string; subject: string; examDate: string; startTime: string; endTime: string };
```

and the multi-line `type LeaveApplication = { ... };` block:

```typescript
  type LeaveApplication = {
    _id: string; title: string; description: string;
    leaveType: 'Paid' | 'Unpaid' | 'Emergency';
    fileName?: string; fileData?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
    teacherId?: { _id: string; name: string; email: string; position: string };
  };
```

Leave the other local types (`DashboardStats`, `CalendarFeedItem`, `DashTab`, `FinDueDateItem`, `FinMetrics`) in place.

- [ ] **Step 3: Delete the `authedFetch` helper and the `normalizeLeave` helper**

Delete the entire `authedFetch` function:

```typescript
  function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const m = typeof document !== 'undefined' && document.cookie.match(/(?:^|;\s*)client_token=([^;]*)/);
    const token = m ? decodeURIComponent(m[1]) : null;
    return fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  }
```

Delete the entire local `normalizeLeave` function (replaced by the imported `normalizeLeaves`):

```typescript
  function normalizeLeave(raw: Record<string, unknown>): LeaveApplication {
    return {
      _id: String(raw.ID ?? raw._id ?? ''),
      title: String(raw.Title ?? raw.title ?? ''),
      description: String(raw.Description ?? raw.description ?? ''),
      leaveType: String(raw.LeaveType ?? raw.leaveType ?? 'Paid') as LeaveApplication['leaveType'],
      status: String(raw.Status ?? raw.status ?? 'Pending') as LeaveApplication['status'],
      fileName: String(raw.FileName ?? raw.fileName ?? '') || undefined,
      fileData: String(raw.FileData ?? raw.fileData ?? '') || undefined,
      createdAt: String(raw.CreatedAt ?? raw.createdAt ?? ''),
    };
  }
```

- [ ] **Step 4: Replace `fetchDashboard` body with api + normalizers**

Replace the entire `fetchDashboard` function with:

```typescript
  const fetchDashboard = async () => {
    if (!schoolId) { error = 'School not found. Please log in again.'; loading = false; return; }
    try {
      loading = true; error = '';
      activeSchoolId = schoolId;
      dismissedIds = loadDismissed(schoolId);

      // Go: GET /api/analytics/dashboard?schoolId= → { students, staff, feeCollection }
      const analyticsP = api
        .get<{ data?: { students?: number; staff?: number } }>(ENDPOINTS.analytics.dashboard(schoolId))
        .catch(() => null);
      // Go: GET /api/classes?schoolId= → ClassData[]
      const classesP = api.get(ENDPOINTS.classes.bySchool(schoolId)).catch(() => null);
      // Go: GET /api/announcements?schoolId= → NotificationItem[]
      const annP = api.get(ENDPOINTS.announcements.bySchool(schoolId)).catch(() => null);
      // Go: GET /api/analytics/fee/trend?schoolId= → FinanceData[]
      const feeTrendP = api.get(ENDPOINTS.analytics.feeTrend(schoolId)).catch(() => null);
      // Go: GET /api/exams/school/:schoolId → ExamItem[]
      const examsP = api.get(ENDPOINTS.exams.bySchool(schoolId)).catch(() => null);

      const [analyticsJson, classesJson, annJson, feeTrendJson, examsJson] =
        await Promise.all([analyticsP, classesP, annP, feeTrendP, examsP]);

      let totalStudents = 0, totalTeachers = 0;
      if (analyticsJson) {
        const d = analyticsJson.data ?? {};
        totalStudents = Number(d.students ?? 0);
        totalTeachers = Number(d.staff ?? 0);
      }

      classData = normalizeClasses(classesJson);
      stats = { totalClasses: classData.length, totalStudents, totalTeachers, attendance: 0 };

      notifications = normalizeAnnouncements(annJson);
      financeData = normalizeFeeTrend(feeTrendJson);
      exams = normalizeExams(examsJson);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  };
```

- [ ] **Step 5: Replace `fetchLeaves` body**

Replace the entire `fetchLeaves` function with:

```typescript
  const fetchLeaves = async () => {
    if (!schoolId) return;
    leavesLoading = true;
    try {
      // Go: GET /api/leaves/school/:schoolId → LeaveApplication[]
      const json = await api.get(ENDPOINTS.leaves.bySchool(schoolId));
      leaves = normalizeLeaves(json);
    } catch { leaves = []; }
    finally { leavesLoading = false; }
  };
```

- [ ] **Step 6: Replace `fetchFinStudents` body**

Replace the entire `fetchFinStudents` function with:

```typescript
  const fetchFinStudents = async () => {
    if (!schoolId) return;
    finStudentsLoading = true;
    finError = '';
    try {
      // Go: GET /api/finance/:schoolId/dashboard-summary → { fee: {...} }
      const summaryJson = await api
        .get<{ data?: { fee?: Record<string, number> } }>(ENDPOINTS.finance.dashboardSummary(schoolId))
        .catch((e) => { finError = e instanceof Error ? e.message : 'Finance summary failed'; return null; });
      if (summaryJson) {
        const fee = summaryJson.data?.fee ?? {};
        finMetrics = {
          totalStudents:        Number(fee.totalStudents   ?? 0),
          currentTotalFee:      Number(fee.totalFeeAmount  ?? 0),
          currentPaidAmount:    Number(fee.collectedAmount ?? 0),
          currentPendingAmount: Number(fee.pendingAmount   ?? 0),
          paidCount:    Number(fee.paidCount    ?? 0),
          partialCount: Number(fee.partialCount ?? 0),
          pendingCount: Number(fee.unpaidCount  ?? 0),
          overdueCount: Number(fee.overdueCount ?? 0),
        };
      }

      // Go: GET /api/finance/assignments?schoolId=&limit= → { data: [...], total }
      const listJson = await api
        .get<{ data?: { data?: Record<string, unknown>[] } }>(`${ENDPOINTS.finance.assignments}?schoolId=${schoolId}&limit=50`)
        .catch(() => null);
      const assignments: Record<string, unknown>[] = Array.isArray(listJson?.data?.data) ? listJson!.data!.data! : [];
      const now = Date.now();
      finDueDates = assignments
        .filter((a) => String(a.feeStatus ?? '') !== 'PAID' && a.dueDate)
        .sort((a, b) => new Date(String(a.dueDate ?? '')).getTime() - new Date(String(b.dueDate ?? '')).getTime())
        .slice(0, 8)
        .map((a) => {
          const dueDate = String(a.dueDate ?? '');
          return {
            studentName: String(a.studentId ?? 'Student'),
            className:   String(a.classFeeStructureId ?? ''),
            dueAmount:   Number(a.dueAmount ?? 0),
            status:      String(a.feeStatus ?? 'UNPAID').toLowerCase(),
            dueDate,
            daysLeft: dueDate ? Math.ceil((new Date(dueDate).getTime() - now) / 86_400_000) : 0,
          };
        });
    } catch (err) {
      finError = err instanceof Error ? err.message : 'Failed to load finance data';
    } finally {
      finStudentsLoading = false;
    }
  };
```

- [ ] **Step 7: Replace `updateLeaveStatus` to use api.patch**

Replace the entire `updateLeaveStatus` function with:

```typescript
  const updateLeaveStatus = async (leaveId: string, status: LeaveApplication['status']) => {
    try {
      updatingLeaveId = leaveId;
      // Go: PATCH /api/leaves/:id/status → { success, data: {...} }
      const json = await api.patch<{ success?: boolean; data?: Record<string, unknown>; message?: string }>(
        ENDPOINTS.leaves.status(leaveId),
        { status },
      );
      const updated = json?.data ?? {};
      const newStatus = String(updated?.status ?? status) as LeaveApplication['status'];
      leaves = leaves.map((l) => l._id === leaveId ? { ...l, status: newStatus } : l);
    } catch { /* surfaced via disabled state; no destructive change on failure */ }
    finally { updatingLeaveId = null; }
  };
```

- [ ] **Step 8: Confirm no bare `/api/` fetches remain in the page**

Run: `cd frontend-svelte && grep -n "authedFetch\|fetch('/api\|fetch(\`/api" "src/routes/(app)/school/+page.svelte"`
Expected: no matches (exit code 1, empty output).

- [ ] **Step 9: Type-check**

Run: `cd frontend-svelte && npm run check`
Expected: 0 errors in `+page.svelte`.

- [ ] **Step 10: Commit**

```bash
git add "frontend-svelte/src/routes/(app)/school/+page.svelte"
git commit -m "refactor(school): route dashboard data through api client and normalizers"
```

---

## Task 5: Document the fetch interceptor

**Files:**
- Modify: `frontend-svelte/src/lib/api/interceptor.ts`

- [ ] **Step 1: Add an explanatory header comment**

At the very top of `frontend-svelte/src/lib/api/interceptor.ts` (above `let patched = false;`), add:

```typescript
// AUTH INTERCEPTOR — safety net only.
//
// The canonical way to call the backend is the `api` client (src/lib/api/client.ts),
// which already injects the Authorization header from the `client_token` cookie.
// This interceptor patches window.fetch so that any *remaining* bare
// `fetch('/api/...')` calls (e.g. in not-yet-migrated pages) still get the token.
//
// Once every page uses the `api` client, this file can be deleted. Before removing,
// confirm no bare fetch('/api/...') calls remain:
//   grep -rn "fetch('/api\|fetch(\`/api" frontend-svelte/src
// TODO(go-migration): remove after full migration to the api client.
```

- [ ] **Step 2: Type-check**

Run: `cd frontend-svelte && npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend-svelte/src/lib/api/interceptor.ts
git commit -m "docs(api): explain interceptor role and removal criteria"
```

---

## Task 6: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `cd frontend-svelte && npm run test`
Expected: PASS — including the existing `client.test.ts` and `utils.test.ts`, plus the new `normalize.test.ts` and `students/services/index.test.ts`.

- [ ] **Step 2: Run the type checker**

Run: `cd frontend-svelte && npm run check`
Expected: 0 errors (pre-existing a11y warnings in other files are acceptable).

- [ ] **Step 3: Manual smoke test (requires Go backend running on :5000)**

Run the Go backend, then `cd frontend-svelte && npm run dev`. In a browser:
1. Log in as a school admin.
2. Open `/school`.
3. Confirm in the Network tab that calls go to `/api/analytics/dashboard`, `/api/classes`, `/api/announcements`, `/api/analytics/fee/trend`, `/api/exams/school/...`, `/api/leaves/school/...`, `/api/finance/.../dashboard-summary`, each carrying an `Authorization: Bearer` header.
4. Confirm the Overview tab shows class counts and the class-distribution chart, the Finance tab shows real metrics (or a clear red error banner if the backend errors), the Approvals tab lists leaves, and the Calendar tab shows exam events.

Expected: data loads; no `authedFetch`; errors (if any) appear as red banners, not silent blanks.

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(svelte): finalize Go HTTP layer migration"
```

---

## Self-Review Notes

- **Spec coverage:** Env docs (T1), interceptor doc (T5), normalizers (T2), students service (T3), dashboard refactor (T4), tests + check (T2/T3/T6) — all spec sections mapped.
- **Endpoint correctness:** `announcements.bySchool` fixed to query param (T1) to match Go's `c.Query("schoolId")`.
- **Type consistency:** `GoEnvelope`, `ClassData`, `FinanceData`, `NotificationItem`, `ExamItem`, `LeaveApplication` defined once in `normalize.ts` and imported by the page (T4) and service (T3). `studentsService` method names (`list/create/update/delete`) match the test in T3.
- **Finance field names:** `feeStatus`, `dueDate`, `dueAmount`, `studentId` (camelCase) match the Go finance domain JSON tags.
