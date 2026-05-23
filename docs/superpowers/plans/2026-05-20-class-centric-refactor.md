# Class-Centric Finance UI Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CLASS the primary entity in all Finance-module dropdowns and filters; section becomes optional/hidden in Finance UX while remaining fully intact in Attendance, Exams, Timetable, etc.

**Architecture:** Add a `className` filter to the backend student-summary endpoint so the frontend can query "all students in Class 8" (spanning 8-A, 8-B, 8-C). Add a thin `classUtils.ts` helper to deduplicate class arrays. Patch Finance dropdowns to show class names only, not class-section concatenations.

**Tech Stack:** React + TypeScript (Vite), Express + TypeScript, MongoDB/Mongoose

---

## Business Rules (DO NOT VIOLATE)

- **Never** remove `section_id` from any database model or migration.
- **Never** break existing API contracts — only ADD `className` as a new optional query param.
- **Never** touch Attendance, Exams, Teacher Assignment, Timetable, Seating Arrangement, or Student Roster. Those modules intentionally keep class+section.
- Finance-module "class-only" means the **dropdown** shows `"Class 8"`, not the section. Data still routes through correct section IDs internally.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/lib/classUtils.ts` | **Create** | Deduplicate classes by name, build options without section |
| `backend/src/modules/finance/services/financeService.ts` | **Modify** | Add `className` filter to `StudentSummaryQuery` + `getStudentFeeSummaries` |
| `backend/src/modules/finance/routes/financeRoutes.ts` | **Modify** | Extract `className` query param, pass to service |
| `frontend/src/modules/finance/api/financeClient.ts` | **Modify** | Add `className` to `getStudentFeeSummaryPage` filters |
| `frontend/src/modules/finance/FinanceModule.tsx` | **Modify** | Deduplicate class options; switch student filter to `className` |
| `frontend/src/pages/school-admin/modules/FinanceStudentFeesPage.tsx` | **Modify** | Remove section suffix from dropdown; use `className` filter |
| `frontend/src/pages/school-admin/modules/FinanceClassFeeStructuresPage.tsx` | **Modify** | Remove section from display name, dropdown, and save payload |

---

## Task 1: Create `classUtils.ts` helper

**Files:**
- Create: `frontend/src/lib/classUtils.ts`

```ts
import type { SchoolClass } from "@/modules/finance/types";

/** Returns one entry per unique class name (first section's _id is kept). */
export const getUniqueClasses = (classes: SchoolClass[]): SchoolClass[] => {
  const seen = new Map<string, SchoolClass>();
  for (const cls of classes) {
    const key = cls.name.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, { ...cls, section: null });
  }
  return Array.from(seen.values());
};

/** Returns ALL class _ids that share the given name (across sections). */
export const getClassIdsForName = (classes: SchoolClass[], name: string): string[] => {
  const key = name.trim().toLowerCase();
  return classes.filter((c) => c.name.trim().toLowerCase() === key).map((c) => c._id);
};
```

- [ ] **Step 1:** Create `frontend/src/lib/classUtils.ts` with the code above.
- [ ] **Step 2:** Run TypeScript check — `cd frontend && npx tsc --noEmit`. Expect: 0 new errors from this file.
- [ ] **Step 3:** Commit.
  ```bash
  git add frontend/src/lib/classUtils.ts
  git commit -m "feat: add classUtils helpers for deduplicating class dropdowns"
  ```

---

## Task 2: Backend — add `className` filter to student-summary service

**Files:**
- Modify: `backend/src/modules/finance/services/financeService.ts:33-39` (type) and `lines 838–856` (query)

- [ ] **Step 1: Update `StudentSummaryQuery` type** — add `className?: string`:

```ts
type StudentSummaryQuery = {
  classId?: string;
  className?: string;   // ← add this line
  academicYear?: string;
  search?: string;
  page?: number;
  limit?: number;
};
```

- [ ] **Step 2: Add className lookup in `getStudentFeeSummaries`** — replace the existing `classId` filter block (lines 848–856) with:

```ts
const classId = String(filters.classId || "").trim();
const className = String(filters.className || "").trim();

const studentMatch: LooseRecord = {
  schoolId: schoolObjectId,
};

if (classId && mongoose.Types.ObjectId.isValid(classId)) {
  studentMatch.class_id = new mongoose.Types.ObjectId(classId);
} else if (className) {
  const matchingIds = await Class.find({
    schoolId: schoolObjectId,
    name: new RegExp(`^${escapeRegex(className)}$`, "i"),
  })
    .distinct("_id")
    .lean();
  if (matchingIds.length > 0) {
    studentMatch.class_id = { $in: matchingIds };
  }
}
```

Verify `Class` model is imported (it already is in this file — check the import at the top of `financeService.ts` before editing).

- [ ] **Step 3:** Run `cd backend && npx tsc --noEmit`. Expect: 0 new errors.
- [ ] **Step 4:** Commit.
  ```bash
  git add backend/src/modules/finance/services/financeService.ts
  git commit -m "feat(finance): add className filter to getStudentFeeSummaries"
  ```

---

## Task 3: Backend route — expose `className` query param

**Files:**
- Modify: `backend/src/modules/finance/routes/financeRoutes.ts` — line 1500 area (inside `router.get("/:schoolId/students/summary", ...)`)

Current code at ~line 1500:
```ts
const classId = getSingleString(req.query.classId);
const academicYear = getSingleString(req.query.academicYear);
const search = getSingleString(req.query.search);

const summary = await financeService.getStudentFeeSummaries(schoolId, {
  classId,
  academicYear,
  search,
  page,
  limit,
});
```

- [ ] **Step 1:** Add `className` extraction and pass to service:

```ts
const classId = getSingleString(req.query.classId);
const className = getSingleString(req.query.className);   // ← add
const academicYear = getSingleString(req.query.academicYear);
const search = getSingleString(req.query.search);

const summary = await financeService.getStudentFeeSummaries(schoolId, {
  classId,
  className,   // ← add
  academicYear,
  search,
  page,
  limit,
});
```

- [ ] **Step 2:** Run `cd backend && npx tsc --noEmit`. Expect: 0 errors.
- [ ] **Step 3:** Commit.
  ```bash
  git add backend/src/modules/finance/routes/financeRoutes.ts
  git commit -m "feat(finance): expose className query param in students/summary route"
  ```

---

## Task 4: `financeClient.ts` — add `className` to page filter

**Files:**
- Modify: `frontend/src/modules/finance/api/financeClient.ts:312-333`

Current `getStudentFeeSummaryPage` accepts `{ classId?, ... }`. Add `className?`:

- [ ] **Step 1:** Update function signature and params construction:

```ts
export const getStudentFeeSummaryPage = async (
  schoolId: string,
  filters: {
    page?: number;
    limit?: number;
    classId?: string;
    className?: string;    // ← add
    academicYear?: string;
    search?: string;
  }
): Promise<StudentSummaryResponse> => {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 20),
  });
  if (filters.classId) params.set("classId", filters.classId);
  if (filters.className) params.set("className", filters.className);   // ← add
  if (filters.academicYear) params.set("academicYear", filters.academicYear);
  if (filters.search) params.set("search", filters.search);
  const res = await requestJson<{ success: boolean; data: StudentSummaryResponse }>(
    `${API_BASE}/finance/${encodeURIComponent(schoolId)}/students/summary?${params.toString()}`
  );
  return res.data;
};
```

- [ ] **Step 2:** Run `cd frontend && npx tsc --noEmit`. Expect: 0 new errors.
- [ ] **Step 3:** Commit.
  ```bash
  git add frontend/src/modules/finance/api/financeClient.ts
  git commit -m "feat(finance): add className filter to getStudentFeeSummaryPage"
  ```

---

## Task 5: `FinanceModule.tsx` — deduplicate class dropdown + use className filter

**Files:**
- Modify: `frontend/src/modules/finance/FinanceModule.tsx`

Four targeted changes:

### 5a — Import classUtils

At the top of `FinanceModule.tsx`, add:
```ts
import { getUniqueClasses } from "@/lib/classUtils";
```

### 5b — Fix `buildClassLabel` (line ~850)

Change the function body to never append section:
```ts
const buildClassLabel = (name?: string | null, _section?: string | null) =>
  String(name || "").trim();
```
This makes existing call sites safe — they pass section but it gets ignored.

### 5c — Fix `buildClassOption` (line ~959)

```ts
const buildClassOption = (schoolClass: SchoolClass): ClassOption => ({
  label: schoolClass.name.trim(),
  value: schoolClass._id,
  classId: schoolClass._id,
  className: schoolClass.name.trim(),
  section: "",
});
```

### 5d — Deduplicate `classStructureOptions` (~line 1939)

Find:
```ts
const classStructureOptions = schoolClasses.map(buildClassOption);
```
Replace with:
```ts
const classStructureOptions = getUniqueClasses(schoolClasses).map(buildClassOption);
```

### 5e — Use `className` param in `fetchStudentSummaryData` (~line 1508-1524)

Find and replace the block that resolves `selectedClassId` and sets `classId` param:

**Before:**
```ts
const selectedClassId =
  isLikelyObjectId(selectedFeeClass)
    ? selectedFeeClass
    : (
        schoolClasses.find((schoolClass) =>
          matchesClassValue(buildClassLabel(schoolClass.name, schoolClass.section), selectedFeeClass)
        )?._id || ""
      );

const params = new URLSearchParams({
  page: String(studentRecordsPage),
  limit: "50",
});

if (selectedClassId) {
  params.set("classId", selectedClassId);
}
```

**After:**
```ts
const params = new URLSearchParams({
  page: String(studentRecordsPage),
  limit: "50",
});

// selectedFeeClass is now always a class name (no section), never an ObjectId
if (selectedFeeClass && !isLikelyObjectId(selectedFeeClass)) {
  params.set("className", selectedFeeClass);
} else if (selectedFeeClass && isLikelyObjectId(selectedFeeClass)) {
  params.set("classId", selectedFeeClass);
}
```

### 5f — Store className when class is selected

Find `handleClassFeeStructureSelect` (~line 2326):
```ts
const handleClassFeeStructureSelect = (option: SingleValue<ClassOption>) => {
  setSelectedClassStructureId("");
  selectClassFeeStructure(option?.label || "", option || null);
};
```

This already calls `selectClassFeeStructure(option?.label, ...)` which sets `selectedFeeClass` to `option?.value` (the ObjectId). Change the call so we always store the class **name**:

```ts
const handleClassFeeStructureSelect = (option: SingleValue<ClassOption>) => {
  setSelectedClassStructureId("");
  selectClassFeeStructure(option?.className || option?.label || "", option || null);
};
```

And inside `selectClassFeeStructure` (~line 2287), change the `setSelectedFeeClass` call:
```ts
// Before:
if (className) {
  setSelectedFeeClass(String(fallbackOption?.value || normalizedClassName));
}
// After:
if (className) {
  setSelectedFeeClass(normalizedClassName);
}
```

### 5g — Run checks and commit

- [ ] **Step 1:** Apply all 5a–5f changes.
- [ ] **Step 2:** Run `cd frontend && npx tsc --noEmit`. Fix any type errors before continuing.
- [ ] **Step 3:** Start dev server (`npm run dev` in frontend), open the Finance module, confirm class dropdown shows "Class 8" not "Class 8 - A / 8 - B / 8 - C". Confirm student list loads when a class is selected.
- [ ] **Step 4:** Commit.
  ```bash
  git add frontend/src/modules/finance/FinanceModule.tsx
  git commit -m "feat(finance): deduplicate class dropdown and filter by className in Finance module"
  ```

---

## Task 6: `FinanceStudentFeesPage.tsx` — class dropdown + className filter

**Files:**
- Modify: `frontend/src/pages/school-admin/modules/FinanceStudentFeesPage.tsx`

Two changes:

### 6a — Remove section from dropdown label (~line 386)

**Before:**
```tsx
{c.name}{c.section ? ` - ${c.section}` : ""}
```
**After:**
```tsx
{c.name}
```

But if multiple class docs share the same name (8-A, 8-B, 8-C), the `<option key={c._id}` uniqueness is fine — we need to deduplicate by name first. Wrap the map:

**Before:**
```tsx
{(classesQuery.data ?? []).map((c) => (
  <option key={c._id} value={c._id}>
    {c.name}{c.section ? ` - ${c.section}` : ""}
  </option>
))}
```

**After:**
```tsx
{getUniqueClasses(classesQuery.data ?? []).map((c) => (
  <option key={c._id} value={c.name}>
    {c.name}
  </option>
))}
```

Note: `value` is now `c.name` (not `c._id`) so the filter passes a class **name** to the API.

### 6b — Add import and switch filter to `className`

At the top of `FinanceStudentFeesPage.tsx`, add:
```ts
import { getUniqueClasses } from "@/lib/classUtils";
```

Find where `classId` state is set and used in the query. The page uses `useQuery` / `getStudentFeeSummaryPage`. Change the filter:
- rename state from `classId` → `selectedClassName` (or just reuse `classId` state but store name value)
- in the query call, pass `className: classId` (if keeping existing state name) or `className: selectedClassName`

Find the query that calls `getStudentFeeSummaryPage` and update the filter key:
```ts
// Before:
filters: { classId, academicYear, search, page, limit }
// After:
filters: { className: classId, academicYear, search, page, limit }
```
(Here `classId` state now holds a class **name** string like `"Class 8"` — the naming is misleading but avoids large refactor. Alternatively rename state to `selectedClass` for clarity.)

- [ ] **Step 1:** Apply 6a and 6b.
- [ ] **Step 2:** Run `cd frontend && npx tsc --noEmit`. Fix errors.
- [ ] **Step 3:** Open Student Fees page, select "Class 8" from dropdown, confirm students from all sections appear.
- [ ] **Step 4:** Commit.
  ```bash
  git add frontend/src/pages/school-admin/modules/FinanceStudentFeesPage.tsx
  git commit -m "feat(finance): student fees page uses class name filter, no section in dropdown"
  ```

---

## Task 7: `FinanceClassFeeStructuresPage.tsx` — dropdown + display + save

**Files:**
- Modify: `frontend/src/pages/school-admin/modules/FinanceClassFeeStructuresPage.tsx`

Three changes:

### 7a — Fix `getDisplayName` (~line 148)

**Before:**
```ts
const getDisplayName = (classId: string, sectionId: string | null) => {
  const c = classMap.get(classId);
  if (!c) return classId;
  const sec = sectionId || c.section;
  return sec ? `${c.name} – ${sec}` : c.name;
};
```

**After:**
```ts
const getDisplayName = (classId: string, _sectionId?: string | null) => {
  const c = classMap.get(classId);
  return c ? c.name : classId;
};
```

### 7b — Remove section from class dropdown (~line 289-293)

**Before:**
```tsx
<option key={c._id} value={c._id}>
  {c.name}
  {c.section ? ` – ${c.section}` : ""}
</option>
```

**After (with deduplication):**
```tsx
{getUniqueClasses(classes ?? []).map((c) => (
  <option key={c._id} value={c._id}>
    {c.name}
  </option>
))}
```

Add `import { getUniqueClasses } from "@/lib/classUtils";` at top of file.

### 7c — Remove `section_id` from save call (~line 220-222)

**Before:**
```ts
await saveClassFeeStructure(schoolId, {
  class_id: form.classId,
  section_id: cls?.section ?? undefined,
  ...
```

**After:**
```ts
await saveClassFeeStructure(schoolId, {
  class_id: form.classId,
  section_id: undefined,   // class-level fee — applies to all sections
  ...
```

- [ ] **Step 1:** Apply 7a, 7b, 7c.
- [ ] **Step 2:** Run `cd frontend && npx tsc --noEmit`. Fix errors.
- [ ] **Step 3:** Open Fee Structures page. Confirm dropdown shows "Class 8" not "Class 8 – A". Confirm saved structures show class name only in the table.
- [ ] **Step 4:** Commit.
  ```bash
  git add frontend/src/pages/school-admin/modules/FinanceClassFeeStructuresPage.tsx
  git commit -m "feat(finance): fee structures page shows class name only, saves without section_id"
  ```

---

## Self-Review Checklist

After all tasks complete, verify:

- [ ] Finance student dropdown: shows `["Class 1", "Class 2", ..., "Class 8"]` — no section suffixes, no duplicates.
- [ ] Fee structures dropdown: same.
- [ ] Selecting "Class 8" in Student Fees page: returns students from ALL sections (8-A, 8-B, 8-C combined).
- [ ] Saving a fee structure for "Class 8": `section_id` is `null/undefined` in the request payload.
- [ ] Attendance, Exams, Timetable pages: unchanged (still show class+section).
- [ ] `npx tsc --noEmit` in both `frontend/` and `backend/`: zero errors.
- [ ] No existing API routes return 404 or 500 after changes.
