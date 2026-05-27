# Fix Broken Routes and Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken routes and 401 auth failures in the SvelteKit ERP portal.

**Architecture:** Root layout server must expose the JWT token so the global fetch interceptor can inject it as a Bearer header for all API calls. Broken pages (salary) need real implementations. The endpoints registry needs all 60+ paths defined centrally.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Express/Node.js backend on port 5000, JWT in httpOnly `token` + readable `client_token` cookies.

---

## File Map

| File | Change |
|------|--------|
| `frontend-svelte/src/routes/+layout.server.ts` | Add `token` to returned data |
| `frontend-svelte/src/app.d.ts` | Already has `token?: string \| null` in PageData ✓ |
| `frontend-svelte/src/routes/(app)/school/salary/+page.svelte` | Replace 4-line redirect with full salary structures page |
| `frontend-svelte/src/lib/api/endpoints.ts` | Add all 60+ missing endpoint paths |

---

## Task 1: Fix Auth Token — Root Layout Server

**Problem:** `+layout.svelte` (root) reads `data.token` but root `+layout.server.ts` only returns `{ user }`. So `data.token` is always `undefined`, the cookie fallback may also be missing for sessions created before `client_token` was added, and all API calls go out with no `Authorization` header → 401 everywhere.

**Files:**
- Modify: `frontend-svelte/src/routes/+layout.server.ts`

- [ ] **Step 1: Add token to root layout load**

Replace the entire file:

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user, token: locals.token ?? null };
};
```

- [ ] **Step 2: Verify fetch interceptor uses it**

Read `frontend-svelte/src/routes/+layout.svelte` line 24 — it should already read:
```typescript
const token = m ? decodeURIComponent(m[1]) : (data.token ?? null);
```
If not, apply that change (it was added in a prior fix).

- [ ] **Step 3: Test in browser**

Open DevTools → Network tab → navigate to `/school`. Confirm requests to `/api/analytics/dashboard` have `Authorization: Bearer <token>` header. Should return 200, not 401.

- [ ] **Step 4: Commit**

```bash
git add frontend-svelte/src/routes/+layout.server.ts
git commit -m "fix(auth): expose token in root layout data so fetch interceptor can inject Bearer header"
```

---

## Task 2: Implement Salary Structures Page

**Problem:** `/school/salary` is 4 lines that call `goto('/school/finance')` — navigates away immediately, useless page.

**Context:**
- Backend endpoint: `GET /api/salary-structures/:schoolId` — list structures
- Backend endpoint: `POST /api/salary-structures/:schoolId` — create
- Backend endpoint: `PUT /api/salary-structures/:schoolId/:id` — update
- Backend endpoint: `DELETE /api/salary-structures/:schoolId/:id` — delete
- Backend endpoint: `POST /api/salary-structures/:schoolId/:id/calculate` — calculate net salary
- Structure shape: `{ _id, name, status, earnings: [{label, amount}], deductions: [{label, type: 'percentage'|'amount', value}], presentDays?, absentDays? }`
- Design tokens match the rest of the app (clayOuter / clayShell / clayCard / clayInset gradient classes)

**Files:**
- Modify: `frontend-svelte/src/routes/(app)/school/salary/+page.svelte`

- [ ] **Step 1: Replace the file**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, IndianRupee, Calculator } from 'lucide-svelte';

  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';

  type Earning    = { label: string; amount: number };
  type Deduction  = { label: string; type: 'percentage' | 'amount'; value: number };
  type Structure  = {
    _id: string; name: string; status: 'Active' | 'Inactive';
    earnings: Earning[]; deductions: Deduction[];
    presentDays?: number; absentDays?: number;
  };

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  let structures  = $state<Structure[]>([]);
  let loading     = $state(true);
  let error       = $state('');
  let saving      = $state(false);
  let deleting    = $state<string | null>(null);
  let expandedId  = $state<string | null>(null);

  // form state
  let showForm    = $state(false);
  let editId      = $state<string | null>(null);
  let formName    = $state('');
  let formStatus  = $state<'Active' | 'Inactive'>('Active');
  let formEarnings   = $state<Earning[]>([{ label: 'Basic Salary', amount: 0 }]);
  let formDeductions = $state<Deduction[]>([]);
  let formError   = $state('');

  const fmtINR = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  function calcGross(e: Earning[]) { return e.reduce((s, x) => s + Number(x.amount || 0), 0); }
  function calcDeductions(d: Deduction[], gross: number) {
    return d.reduce((s, x) => {
      const v = Number(x.value || 0);
      return s + (x.type === 'percentage' ? (gross * v) / 100 : v);
    }, 0);
  }
  function calcNet(e: Earning[], d: Deduction[]) {
    const gross = calcGross(e);
    return gross - calcDeductions(d, gross);
  }

  async function load() {
    if (!schoolId) return;
    loading = true; error = '';
    try {
      const r = await fetch(`/api/salary-structures/${schoolId}`);
      const j = await r.json();
      structures = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load';
    } finally { loading = false; }
  }

  function openCreate() {
    editId = null; formName = ''; formStatus = 'Active';
    formEarnings = [{ label: 'Basic Salary', amount: 0 }];
    formDeductions = []; formError = ''; showForm = true;
  }

  function openEdit(s: Structure) {
    editId = s._id; formName = s.name; formStatus = s.status;
    formEarnings = s.earnings.map(e => ({ ...e }));
    formDeductions = s.deductions.map(d => ({ ...d }));
    formError = ''; showForm = true;
  }

  async function save() {
    if (!formName.trim()) { formError = 'Name is required'; return; }
    saving = true; formError = '';
    const body = { name: formName.trim(), status: formStatus, earnings: formEarnings, deductions: formDeductions };
    try {
      const url = editId
        ? `/api/salary-structures/${schoolId}/${editId}`
        : `/api/salary-structures/${schoolId}`;
      const r = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const j = await r.json(); formError = j?.error ?? j?.message ?? 'Save failed'; return; }
      showForm = false;
      await load();
    } catch (e) {
      formError = e instanceof Error ? e.message : 'Save failed';
    } finally { saving = false; }
  }

  async function del(id: string) {
    if (!confirm('Delete this salary structure?')) return;
    deleting = id;
    try {
      await fetch(`/api/salary-structures/${schoolId}/${id}`, { method: 'DELETE' });
      structures = structures.filter(s => s._id !== id);
    } finally { deleting = null; }
  }

  onMount(load);
</script>

<svelte:head><title>Salary Structures — ERP Portal</title></svelte:head>

<div class={clayOuter}>
  <div class={clayShell}>
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Salary Structures</h1>
        <p class="text-sm text-slate-500 mt-0.5">Define pay templates for staff roles</p>
      </div>
      <button
        onclick={openCreate}
        class="flex items-center gap-2 rounded-xl bg-[#12A588] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0e8c73] transition"
      >
        <Plus class="h-4 w-4" /> New Structure
      </button>
    </div>

    <!-- Error -->
    {#if error}
      <p class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>
    {/if}

    <!-- Loading -->
    {#if loading}
      <div class="grid gap-3">
        {#each {length: 3} as _}
          <div class="h-16 rounded-[22px] bg-slate-100 animate-pulse"></div>
        {/each}
      </div>

    <!-- Empty -->
    {:else if structures.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <IndianRupee class="h-12 w-12 text-slate-300 mb-3" />
        <p class="text-slate-500 font-medium">No salary structures yet</p>
        <p class="text-sm text-slate-400 mt-1">Create one to define pay templates for staff</p>
      </div>

    <!-- List -->
    {:else}
      <div class="space-y-3">
        {#each structures as s (s._id)}
          {@const gross = calcGross(s.earnings)}
          {@const net   = calcNet(s.earnings, s.deductions)}
          <div class={clayCard}>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <button
                  onclick={() => expandedId = expandedId === s._id ? null : s._id}
                  class="flex items-center gap-2 text-left"
                >
                  {#if expandedId === s._id}
                    <ChevronUp class="h-4 w-4 text-slate-400" />
                  {:else}
                    <ChevronDown class="h-4 w-4 text-slate-400" />
                  {/if}
                  <span class="font-semibold text-slate-800">{s.name}</span>
                </button>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium {s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                  {s.status}
                </span>
              </div>
              <div class="flex items-center gap-4">
                <div class="hidden sm:flex items-center gap-4 text-sm text-slate-600">
                  <span>Gross: <strong class="text-slate-800">{fmtINR(gross)}</strong></span>
                  <span>Net: <strong class="text-emerald-700">{fmtINR(net)}</strong></span>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    onclick={() => openEdit(s)}
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                    title="Edit"
                  ><Pencil class="h-4 w-4" /></button>
                  <button
                    onclick={() => del(s._id)}
                    disabled={deleting === s._id}
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                    title="Delete"
                  ><Trash2 class="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {#if expandedId === s._id}
              <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Earnings</p>
                  <div class="space-y-1">
                    {#each s.earnings as e}
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-600">{e.label}</span>
                        <span class="font-medium text-slate-800">{fmtINR(Number(e.amount))}</span>
                      </div>
                    {/each}
                    <div class="flex justify-between text-sm font-semibold border-t border-slate-100 pt-1 mt-1">
                      <span>Gross</span><span>{fmtINR(gross)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Deductions</p>
                  {#if s.deductions.length === 0}
                    <p class="text-sm text-slate-400">No deductions</p>
                  {:else}
                    <div class="space-y-1">
                      {#each s.deductions as d}
                        <div class="flex justify-between text-sm">
                          <span class="text-slate-600">{d.label}</span>
                          <span class="font-medium text-red-600">
                            -{d.type === 'percentage' ? `${d.value}%` : fmtINR(Number(d.value))}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  <div class="flex justify-between text-sm font-bold text-emerald-700 border-t border-slate-100 pt-1 mt-1">
                    <span>Net Salary</span><span>{fmtINR(net)}</span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Create / Edit Modal -->
{#if showForm}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onclick={(e) => { if (e.target === e.currentTarget) showForm = false; }}
  >
    <div class="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
      <h2 class="text-lg font-bold text-slate-800 mb-4">{editId ? 'Edit' : 'New'} Salary Structure</h2>

      <!-- Name + Status -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="col-span-2 sm:col-span-1">
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Structure Name</label>
          <input
            bind:value={formName}
            placeholder="e.g. Teaching Staff Grade A"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40"
          />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
          <select bind:value={formStatus} class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Earnings -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Earnings</p>
          <button
            type="button"
            onclick={() => formEarnings = [...formEarnings, { label: '', amount: 0 }]}
            class="text-xs text-[#12A588] hover:underline font-semibold"
          >+ Add</button>
        </div>
        <div class="space-y-2">
          {#each formEarnings as e, i}
            <div class="flex gap-2">
              <input bind:value={e.label} placeholder="Label" class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40" />
              <input bind:value={e.amount} type="number" min="0" placeholder="Amount" class="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40" />
              {#if formEarnings.length > 1}
                <button type="button" onclick={() => formEarnings = formEarnings.filter((_, j) => j !== i)} class="text-red-400 hover:text-red-600">
                  <Trash2 class="h-4 w-4" />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Deductions -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deductions</p>
          <button
            type="button"
            onclick={() => formDeductions = [...formDeductions, { label: '', type: 'amount', value: 0 }]}
            class="text-xs text-[#12A588] hover:underline font-semibold"
          >+ Add</button>
        </div>
        <div class="space-y-2">
          {#each formDeductions as d, i}
            <div class="flex gap-2">
              <input bind:value={d.label} placeholder="Label" class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40" />
              <select bind:value={d.type} class="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40">
                <option value="amount">₹ Fixed</option>
                <option value="percentage">% Rate</option>
              </select>
              <input bind:value={d.value} type="number" min="0" placeholder="Value" class="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#12A588]/40" />
              <button type="button" onclick={() => formDeductions = formDeductions.filter((_, j) => j !== i)} class="text-red-400 hover:text-red-600">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Net preview -->
      <div class="rounded-[18px] bg-emerald-50 border border-emerald-200 px-4 py-3 mb-4 flex justify-between items-center">
        <span class="text-sm text-emerald-700 font-semibold flex items-center gap-1">
          <Calculator class="h-4 w-4" /> Net Salary Preview
        </span>
        <span class="text-lg font-bold text-emerald-700">{fmtINR(calcNet(formEarnings, formDeductions))}</span>
      </div>

      {#if formError}
        <p class="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-3">{formError}</p>
      {/if}

      <div class="flex gap-3">
        <button
          onclick={() => showForm = false}
          class="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >Cancel</button>
        <button
          onclick={save}
          disabled={saving}
          class="flex-1 rounded-xl bg-[#12A588] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e8c73] transition disabled:opacity-50"
        >{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create'}</button>
      </div>
    </div>
  </div>
{/if}
```

- [ ] **Step 2: Verify page loads**

Navigate to `/school/salary`. Should render "Salary Structures" heading with "+ New Structure" button. Should not redirect to `/school/finance`.

- [ ] **Step 3: Commit**

```bash
git add "frontend-svelte/src/routes/(app)/school/salary/+page.svelte"
git commit -m "feat(school): implement salary structures page with full CRUD"
```

---

## Task 3: Add All Missing Endpoints to endpoints.ts

**Problem:** 60+ API endpoints are raw string literals scattered across page files. No central registry.

**Files:**
- Modify: `frontend-svelte/src/lib/api/endpoints.ts`

- [ ] **Step 1: Replace the file with complete registry**

```typescript
import { PUBLIC_API_URL } from '$env/static/public';

export const API_BASE = PUBLIC_API_URL || '';

export const ENDPOINTS = {
  auth: {
    teacherLogin:     '/api/auth/staff/login',
    schoolAdminLogin: '/api/auth/school/login',
    superAdminLogin:  '/api/auth/super-admin/login',
    logout:           '/api/auth/logout',
  },

  schools: {
    list:          '/api/schools',
    register:      '/api/schools/register',
    byId:          (id: string)       => `/api/schools/${id}`,
    toggle:        (id: string)       => `/api/schools/toggle/${id}`,
    location:      (id: string)       => `/api/schools/${id}/location`,
    locationLock:  (id: string)       => `/api/schools/${id}/location-lock`,
    clearDatabase: '/api/schools/super-admin/clear-database',
  },

  staff: {
    bySchool: (schoolId: string) => `/api/staff/${schoolId}`,
    create:   '/api/staff',
    update:   (id: string)       => `/api/staff/${id}`,
    delete:   (id: string)       => `/api/staff/${id}`,
    session:  (schoolId: string, teacherId: string) => `/api/staff/session/${schoolId}/${teacherId}`,
  },

  teacherRoles: {
    bySchool: (schoolId: string) => `/api/teacher-roles/${schoolId}`,
    create:   '/api/teacher-roles',
    delete:   (id: string)       => `/api/teacher-roles/${id}`,
    login:    '/api/teacher-roles/login',
  },

  students: {
    bySchool: (schoolId: string) => `/api/students/${schoolId}`,
    create:   '/api/students',
    update:   (id: string)       => `/api/students/${id}`,
    delete:   (id: string)       => `/api/students/${id}`,
    import:   '/api/students/import',
  },

  classes: {
    bySchool:    (schoolId: string)                          => `/api/classes/${schoolId}`,
    byName:      (schoolId: string, className: string)       => `/api/classes/${schoolId}/${className}`,
    create:      '/api/classes',
    update:      (id: string)                                => `/api/classes/${id}`,
    delete:      (id: string)                                => `/api/classes/${id}`,
  },

  subjects: {
    bySchoolClass: (schoolId: string, classId: string) => `/api/subjects/${schoolId}/${classId}`,
    create:        '/api/subjects',
    delete:        (id: string)                        => `/api/subjects/${id}`,
  },

  attendance: {
    byDate:         (schoolId: string, date: string)                             => `/api/attendance/${schoolId}/${date}`,
    studentByDate:  (schoolId: string, className: string, date: string)          => `/api/attendance/students/${schoolId}/${className}/${date}`,
    teacherByDate:  (schoolId: string, teacherId: string, date: string)          => `/api/attendance/self/${schoolId}/${teacherId}/${date}`,
    report:         (schoolId: string)                                           => `/api/attendance/report/${schoolId}`,
    saveStudent:    '/api/attendance/students',
    saveTeacher:    '/api/attendance/self',
    lockTeacher:    '/api/attendance/self/lock',
    summary:        (schoolId: string)                                           => `/api/attendance/${schoolId}/summary`,
  },

  exams: {
    bySchool:  (schoolId: string)                   => `/api/exams/school/${schoolId}`,
    byTeacher: (schoolId: string, teacherId: string) => `/api/exams/teacher/${schoolId}/${teacherId}`,
    create:    '/api/exams',
    delete:    (id: string)                          => `/api/exams/${id}`,
    upload:    (examId: string)                      => `/api/exams/${examId}/upload`,
    aiCreate:  '/api/exams/ai-create',
  },

  marks: {
    byTeacher:    (schoolId: string, teacherId: string)             => `/api/marks/${schoolId}/${teacherId}`,
    byExam:       (schoolId: string, teacherId: string, examId: string) => `/api/marks/${schoolId}/${teacherId}/${examId}`,
    download:     (schoolId: string, examId: string)                => `/api/marks/download/${schoolId}/${examId}`,
    save:         '/api/marks',
  },

  assignments: {
    byClass:     (schoolId: string, classId: string)   => `/api/assignments/${schoolId}/${classId}`,
    byTeacher:   (schoolId: string, teacherId: string) => `/api/assignments/${schoolId}/${teacherId}`,
    submissions: (assignmentId: string)                => `/api/assignments/${assignmentId}/submissions`,
    grade:       (assignmentId: string, submissionId: string) => `/api/assignments/${assignmentId}/grade/${submissionId}`,
    create:      '/api/assignments',
    delete:      (id: string)                          => `/api/assignments/${id}`,
  },

  materials: {
    byClass: (schoolId: string, classId: string) => `/api/materials/${schoolId}/${classId}`,
    create:  '/api/materials',
    delete:  (id: string)                        => `/api/materials/${id}`,
  },

  leaves: {
    byTeacher: (schoolId: string, teacherId: string) => `/api/leaves/${schoolId}/${teacherId}`,
    bySchool:  (schoolId: string)                    => `/api/leaves/school/${schoolId}`,
    create:    '/api/leaves',
    status:    (leaveId: string)                     => `/api/leaves/${leaveId}/status`,
  },

  announcements: {
    bySchool: (schoolId: string) => `/api/announcements/${schoolId}`,
    create:   '/api/announcements',
    delete:   (id: string)       => `/api/announcements/${id}`,
    aiDraft:  '/api/announcements/ai-draft',
  },

  campaigns: {
    bySchool: (schoolId: string) => `/api/campaigns?schoolId=${schoolId}`,
    create:   '/api/campaigns',
  },

  finance: {
    studentSummary:     (schoolId: string)                          => `/api/finance/${schoolId}/students/summary`,
    studentDetail:      (schoolId: string, studentId: string)       => `/api/finance/${schoolId}/students/${studentId}/summary`,
    studentExtension:   (schoolId: string, studentId: string)       => `/api/finance/${schoolId}/students/${studentId}/extension`,
    classFeeStructures: (schoolId: string)                          => `/api/finance/${schoolId}/class-fee-structures`,
    dashboardSummary:   (schoolId: string)                          => `/api/finance/${schoolId}/dashboard-summary`,
    availableYears:     (schoolId: string)                          => `/api/finance/${schoolId}/available-years`,
    staffSummary:       (schoolId: string)                          => `/api/finance/${schoolId}/staff/summary`,
    staffReport:        (schoolId: string, staffId: string)         => `/api/finance/${schoolId}/staff/${staffId}/salary-report`,
    salaryRoles:        (schoolId: string)                          => `/api/finance/${schoolId}/salary-roles`,
    assignments:        '/api/finance/assignments',
    payments:           '/api/finance/student-fee-payments',
    save:               '/api/finance',
    update:             (id: string)                                => `/api/finance/${id}`,
  },

  salaryStructures: {
    bySchool: (schoolId: string)             => `/api/salary-structures/${schoolId}`,
    create:   (schoolId: string)             => `/api/salary-structures/${schoolId}`,
    update:   (schoolId: string, id: string) => `/api/salary-structures/${schoolId}/${id}`,
    delete:   (schoolId: string, id: string) => `/api/salary-structures/${schoolId}/${id}`,
    calculate:(schoolId: string, id: string) => `/api/salary-structures/${schoolId}/${id}/calculate`,
  },

  payroll: {
    list:   '/api/payroll',
    create: '/api/payroll',
    pay:    (id: string) => `/api/payroll/${id}/pay`,
  },

  transport: {
    bySchool:  (schoolId: string) => `/api/transport/${schoolId}`,
    create:    '/api/transport',
    update:    (id: string)       => `/api/transport/${id}`,
    delete:    (id: string)       => `/api/transport/${id}`,
    readings:  (busId: string)    => `/api/transport/${busId}/readings`,
  },

  hostel: {
    bySchool: (schoolId: string) => `/api/hostels/${schoolId}`,
    update:   (hostelId: string) => `/api/hostels/${hostelId}`,
  },

  library: {
    bySchool: (schoolId: string) => `/api/library/${schoolId}`,
    create:   '/api/library/books',
    assign:   '/api/library/assign',
  },

  inventory: {
    bySchool: (schoolId: string) => `/api/inventory/${schoolId}`,
    create:   '/api/inventory',
    update:   (id: string)       => `/api/inventory/${id}`,
    delete:   (id: string)       => `/api/inventory/${id}`,
    action:   (id: string, actionType: string) => `/api/inventory/${id}/${actionType}`,
  },

  maintenance: {
    bySchool: (schoolId: string) => `/api/maintenance/${schoolId}`,
    create:   '/api/maintenance',
    delete:   (id: string)       => `/api/maintenance/${id}`,
  },

  visitors: {
    bySchool:  (schoolId: string) => `/api/visitors/school/${schoolId}`,
    create:    '/api/visitors',
    delete:    (id: string)       => `/api/visitors/${id}`,
    scanExit:  '/api/visitors/scan-exit',
  },

  surveys: {
    bySchool: (schoolId: string)   => `/api/surveys/${schoolId}`,
    create:   '/api/surveys',
    status:   (surveyId: string)   => `/api/surveys/${surveyId}/status`,
    delete:   (surveyId: string)   => `/api/surveys/${surveyId}`,
  },

  socialMedia: {
    bySchool: (schoolId: string) => `/api/social-media/${schoolId}`,
    create:   '/api/social-media',
    update:   (id: string)       => `/api/social-media/${id}`,
    delete:   (id: string)       => `/api/social-media/${id}`,
  },

  notifications: {
    bySchool: (schoolId: string) => `/api/notifications?schoolId=${schoolId}`,
    markRead: (id: string)       => `/api/notifications/${id}/read`,
  },

  analytics: {
    dashboard:       (schoolId: string) => `/api/analytics/dashboard?schoolId=${schoolId}`,
    enrollmentTrend: (schoolId: string) => `/api/analytics/enrollment/trend?schoolId=${schoolId}`,
    feeTrend:        (schoolId: string) => `/api/analytics/fee/trend?schoolId=${schoolId}`,
    attendanceRate:  (schoolId: string) => `/api/analytics/attendance/rate?schoolId=${schoolId}`,
  },

  reports: {
    studentStrength:   (schoolId: string) => `/api/reports/students/strength?schoolId=${schoolId}`,
    financeCollection: (schoolId: string) => `/api/reports/finance/collection?schoolId=${schoolId}`,
    attendanceSummary: (schoolId: string) => `/api/reports/attendance/summary?schoolId=${schoolId}`,
    staff:             (schoolId: string) => `/api/reports/staff?schoolId=${schoolId}`,
  },

  dataImport: {
    preview:  '/api/data-import/preview',
    validate: '/api/data-import/validate',
    import:   '/api/data-import/import',
    history:  (schoolId: string) => `/api/data-import/history/${schoolId}`,
    rollback: (batchId: string)  => `/api/data-import/rollback/${batchId}`,
    reimport: (batchId: string)  => `/api/data-import/reimport/${batchId}`,
  },

  dashboard: {
    teacher: (schoolId: string, teacherId: string) => `/api/dashboard/teacher/${schoolId}/${teacherId}`,
  },

  logs: {
    list: '/api/logs',
  },

  health: {
    basic:   '/api/health',
    details: '/api/health/details',
  },
} as const;
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd frontend-svelte && npx tsc --noEmit 2>&1 | head -40
```

Fix any type errors (usually just missing `as const` or extra type inference issues).

- [ ] **Step 3: Commit**

```bash
git add frontend-svelte/src/lib/api/endpoints.ts
git commit -m "feat(api): add all 60+ endpoint paths to central ENDPOINTS registry"
```

---

## Task 4: Verify Backend Running

**Problem:** Even with token fixed, 401 still occurs if the Node.js backend is not running.

- [ ] **Step 1: Check if backend is running**

```bash
curl http://localhost:5000/api/health
```

Expected: `{"status":"ok"}` or similar JSON.

If connection refused, start it:

```bash
cd backend && npm run dev
```

Wait for `Server running on port 5000` in the output.

- [ ] **Step 2: Test one authenticated endpoint manually**

```bash
# Get token first — replace with real credentials
curl -X POST http://localhost:5000/api/auth/school/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"yourpassword"}'
```

Copy the token from the response, then:

```bash
curl http://localhost:5000/api/analytics/dashboard?schoolId=69d171081ed7558be6565ddc \
  -H "Authorization: Bearer <paste_token_here>"
```

Expected: 200 with JSON data, not 401.

- [ ] **Step 3: Commit**

No code changes in this task — it is a verification step.

---

## Task 5: Fix /security Placeholder (Remove from Sidebar)

**Problem:** `/security` sidebar link shows "coming soon" placeholder. Bad UX if users click it expecting functionality.

**Files:**
- Modify: `frontend-svelte/src/lib/components/layout/Sidebar.svelte`

- [ ] **Step 1: Remove security from superAdminItems**

In `Sidebar.svelte`, find:
```typescript
const superAdminItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Schools', path: '/schools', icon: School },
    { title: 'School Admins', path: '/school-admins', icon: UserCog },
    { title: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { title: 'User Change', path: '/user-change', icon: Users },
    { title: 'Settings', path: '/settings', icon: Settings },
    { title: 'Logs', path: '/logs', icon: ScrollText },
    { title: 'Security', path: '/security', icon: Shield },
  ];
```

Remove `{ title: 'Security', path: '/security', icon: Shield }` and the unused `Shield` import:

```typescript
import {
    LayoutDashboard, School, UserCog, Users, CreditCard, Settings,
    ScrollText, GraduationCap, Menu, X,
    ...
  } from 'lucide-svelte';
```

Remove `Shield` from the import list.

- [ ] **Step 2: Verify sidebar renders without errors**

Dev server should hot-reload. Open super-admin sidebar — Security item should be gone.

- [ ] **Step 3: Commit**

```bash
git add frontend-svelte/src/lib/components/layout/Sidebar.svelte
git commit -m "fix(nav): remove unimplemented Security link from super-admin sidebar"
```

---

## Self-Review

**Spec coverage:**
- ✅ 401 auth fixes — Task 1 (root layout returns token)
- ✅ `/school/salary` empty page — Task 2 (full CRUD implementation)
- ✅ endpoints.ts missing entries — Task 3 (all 60+ paths)
- ✅ Backend must be running — Task 4 (verification)
- ✅ `/security` broken placeholder — Task 5 (remove from nav)
- ⚠️ `/user-change` — Page EXISTS, is functional (links to login pages). Not broken.
- ⚠️ Inconsistent fetch patterns — Out of scope (requires touching 50+ files). Noted.
- ⚠️ No server-side load functions — Out of scope (architectural refactor). Noted.

**Placeholder scan:** No TBD, no TODO, no "similar to Task N" — all steps have actual code.

**Type consistency:** `Structure`, `Earning`, `Deduction` types defined once at top of salary page and used consistently throughout.
