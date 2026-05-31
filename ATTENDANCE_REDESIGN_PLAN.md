# 🗓️ ATTENDANCE MODULE — Full Redesign Plan
## ERP Portal | Dual-Mode: Student Attendance + Staff/Teacher Attendance

> **Reference this file for EVERY change to the Attendance module.**
> Last updated: May 31, 2026

---

## 🧭 Overview

The attendance module has **two completely separate modes**:

| Mode | Who Marks | Who Can See |
|------|-----------|-------------|
| **Student Attendance** | Teacher (their own class) + School Admin (all classes) | Teacher (own class), Admin (all) |
| **Staff/Teacher Attendance** | School Admin marks for teachers | School Admin only |

Both modes share the same backend architecture but use **separate collections** and **separate UI tabs**.

---

## 🏗️ Architecture: What Already Exists

The backend follows DDD (Domain Driven Design) under:
```
backend/src/modules/attendance/
├── api/            ← Route handlers (thin layer)
├── application/    ← Use cases / service logic
├── domain/         ← Types, interfaces, value objects
├── infrastructure/ ← Mongoose models, repositories
├── events/         ← Event emitters (absence alerts)
├── jobs/           ← Cron jobs (daily reminders)
└── index.ts        ← Module export
```

---

## 📦 Database Schema (MongoDB)

### Collection 1: `student_attendances`
```typescript
interface IStudentAttendance {
  _id: ObjectId;
  school_id: ObjectId;          // ref: School
  class_id: string;             // e.g., "Class 10"
  section_id: string;           // e.g., "A"
  academic_year: string;        // e.g., "2025-2026"
  date: Date;                   // ISO date (no time)
  student_id: ObjectId;         // ref: Student
  status: 'present' | 'absent' | 'late' | 'leave';
  marked_by: ObjectId;          // ref: Staff (teacher or admin)
  marked_by_role: 'teacher' | 'school-admin';
  remark?: string;              // optional note
  created_at: Date;
  updated_at: Date;
}
// Compound Unique Index: school_id + class_id + section_id + date + student_id
// Query Indexes: school_id+date, school_id+class_id+date, school_id+student_id
```

### Collection 2: `staff_attendances`
```typescript
interface IStaffAttendance {
  _id: ObjectId;
  school_id: ObjectId;          // ref: School
  staff_id: ObjectId;           // ref: Staff
  academic_year: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'leave' | 'half-day';
  marked_by: ObjectId;          // always school-admin
  remark?: string;
  created_at: Date;
  updated_at: Date;
}
// Compound Unique Index: school_id + staff_id + date
// Query Indexes: school_id+date, school_id+staff_id
```

---

## 🔌 API Endpoints

### Student Attendance

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/attendance/student/mark` | teacher, school-admin | Mark/update batch for a class+date |
| `GET` | `/api/attendance/student/daily` | teacher, school-admin | Get attendance for class on a date |
| `GET` | `/api/attendance/student/monthly` | teacher, school-admin | Monthly summary for a class |
| `GET` | `/api/attendance/student/:studentId/report` | school-admin | Single student full report |
| `GET` | `/api/attendance/student/low-attendance` | school-admin | Students below threshold% |

### Staff Attendance

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/attendance/staff/mark` | school-admin | Mark/update batch for all staff on a date |
| `GET` | `/api/attendance/staff/daily` | school-admin | Get staff attendance on a date |
| `GET` | `/api/attendance/staff/monthly` | school-admin | Monthly summary for all staff |
| `GET` | `/api/attendance/staff/:staffId/report` | school-admin | Single staff member report |

### Shared
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/attendance/summary` | school-admin | Dashboard: today's stats for both modes |

---

## 🎨 Frontend Design — 5 Screens

### Screen 0: Entry Point (Tab Switcher)
**File:** `src/pages/school-admin/modules/AttendanceModule.tsx`

```
┌─────────────────────────────────────────────┐
│  📋 Attendance                               │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 🎒 Students  │  │ 👩‍🏫 Staff     │         │  ← Tab switcher
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```
- **Teacher login** → Only sees the Student tab (their own class)
- **Admin login** → Sees both tabs, class dropdown shows ALL classes

---

### Screen 1: Mark Daily Attendance
**File:** `src/pages/school-admin/modules/attendance/MarkAttendance.tsx`

```
┌─────────────────────────────────────────────────────┐
│  Mark Attendance — Students                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Class 10 ▼│  │ Sec A   ▼│  │ 📅 31 May 2026  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                      │
│  [ ✅ Mark All Present ]  [ Status: Not Submitted ]  │
│                                                      │
│  ┌────┬────────────────┬──────────────────────────┐ │
│  │ #  │ Student Name   │ P  |  A  |  L  |  Lv    │ │
│  ├────┼────────────────┼──────────────────────────┤ │
│  │ 1  │ Aarav Sharma   │ ●  |  ○  |  ○  |  ○     │ │
│  │ 2  │ Priya Mehta    │ ○  |  ●  |  ○  |  ○     │ │  ← Radio toggle per row
│  │ 3  │ Ravi Kumar     │ ○  |  ○  |  ●  |  ○     │ │
│  └────┴────────────────┴──────────────────────────┘ │
│                                                      │
│  Summary: ✅ 28 Present  ❌ 1 Absent  🕐 1 Late     │
│                                  [ Submit Attendance ]│
└─────────────────────────────────────────────────────┘
```

**UX Rules:**
- Default all students to **Present** on page load
- Show **already-marked badge** if attendance exists for the selected date
- Allow **editing** submitted attendance (re-submit updates records)
- Disable future dates
- Keyboard shortcut: `P/A/L` keys to mark focused row
- Mobile: Swipe card per student

---

### Screen 2: Monthly Calendar View
**File:** `src/pages/school-admin/modules/attendance/MonthlyView.tsx`

```
┌──────────────────────────────────────────────────────┐
│  Monthly View — Class 10A — May 2026                 │
│  ◀ Apr                                      Jun ▶    │
│                                                      │
│  Student        | 1  2  3  4  5 ...27 28 29 30 31 | % │
│  ─────────────────────────────────────────────────── │
│  Aarav Sharma   | 🟢 🟢 🔴 🟢 🟡 ...🟢 🟢 🟢 🟢 🟢 | 94%│
│  Priya Mehta    | 🟢 🔴 🔴 🟢 🟢 ...🟢 🟢 🟢 🟢 🟢 | 87%│
│  Ravi Kumar     | 🟡 🟢 🟢 🟢 🟢 ...🔴 🟢 🟢 🟢 🟢 | 91%│
│                                                      │
│  🟢 Present  🔴 Absent  🟡 Late  ⚪ Leave  ─ Holiday │
│                                                      │
│  [ ⚠️ 2 students below 75% ]  [ 📥 Export CSV ]      │
└──────────────────────────────────────────────────────┘
```

**UX Rules:**
- Clicking a red cell → shows who marked it and when
- Students below 75% → **highlighted row in red/yellow**
- Export generates CSV: Student Name, Roll No, Present, Absent, Late, Leave, %
- Non-school days (Sunday/holidays) shown as `─` (grey)

---

### Screen 3: Student Individual Report
**File:** `src/pages/school-admin/modules/attendance/StudentReport.tsx`

```
┌──────────────────────────────────────────────────────┐
│  Aarav Sharma — Class 10A — Roll No: 23              │
│                                                      │
│  📊 Overall: 94.2%   [ Select Month ▼ ]             │
│                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │ 🟢 58    │ 🔴 3     │ 🟡 1     │ ⚪ 0     │      │
│  │ Present  │ Absent   │ Late     │ Leave    │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
│                                                      │
│  Calendar heatmap (month grid)                       │
│  [Jan][Feb][Mar][Apr][May][Jun]...                   │
└──────────────────────────────────────────────────────┘
```

---

### Screen 4: Staff Attendance (Admin Only)
**File:** `src/pages/school-admin/modules/attendance/StaffAttendance.tsx`

- Same layout as Screen 1 but for **all teachers/staff**
- No class/section selector — shows all staff in one list
- Status options: Present / Absent / Late / Leave / Half-Day
- Monthly report tab same as Screen 2 but for staff

---

## 🔐 RBAC Rules

```typescript
// Teacher: can only mark/view their own assigned class
if (role === 'teacher') {
  // Validate class_id matches teacher.assigned_class
  // Cannot access staff attendance endpoints
  // Cannot view other classes' attendance
}

// School Admin: full access
if (role === 'school-admin') {
  // Can mark all classes
  // Can view all reports
  // Can access staff attendance
  // Can override teacher-marked records
}
```

---

## 🧩 Frontend Component Tree

```
AttendanceModule.tsx          ← Entry, tab switcher
├── MarkAttendance.tsx        ← Screen 1 (Student)
│   ├── ClassSectionSelector  ← Shared component
│   ├── DatePicker            ← Shared component
│   ├── StudentAttendanceRow  ← Per-student radio toggle
│   └── AttendanceSummaryBar  ← Count summary + submit
├── MonthlyView.tsx           ← Screen 2 (Student)
│   ├── ClassSectionSelector
│   ├── MonthNavigator
│   ├── AttendanceGrid        ← Calendar grid table
│   └── LowAttendanceAlert
├── StudentReport.tsx         ← Screen 3
│   ├── StudentSearch
│   ├── AttendanceStats       ← 4-stat cards
│   └── MonthlyHeatmap
└── StaffAttendance.tsx       ← Screen 4 (Admin only)
    ├── MarkStaffAttendance
    └── StaffMonthlyView
```

---

## 📡 Frontend Service Layer

**File:** `src/services/attendanceService.ts`

```typescript
// All functions follow SCALABILITY_RULES.md — no fetch inside components

export const attendanceService = {
  // Student
  markStudentAttendance(schoolId, classId, sectionId, date, records): Promise,
  getDailyAttendance(schoolId, classId, sectionId, date): Promise,
  getMonthlyAttendance(schoolId, classId, sectionId, month, year): Promise,
  getStudentReport(schoolId, studentId, month?, year?): Promise,
  getLowAttendance(schoolId, classId, threshold = 75): Promise,

  // Staff
  markStaffAttendance(schoolId, date, records): Promise,
  getStaffDailyAttendance(schoolId, date): Promise,
  getStaffMonthlyAttendance(schoolId, month, year): Promise,
  getStaffReport(schoolId, staffId, month?, year?): Promise,

  // Dashboard
  getTodaySummary(schoolId): Promise,
};
```

---

## ⚡ Backend Service Layer (Use Cases)

**File:** `backend/src/modules/attendance/application/`

| Use Case File | Function |
|---|---|
| `markStudentAttendance.ts` | Upsert batch records for class+date |
| `getClassDailyAttendance.ts` | Fetch all records for class on date |
| `getMonthlyClassSummary.ts` | Aggregate monthly stats per student |
| `getStudentAttendanceReport.ts` | Full report for one student |
| `getLowAttendanceStudents.ts` | Filter students below threshold |
| `markStaffAttendance.ts` | Upsert staff records for date |
| `getMonthlyStaffSummary.ts` | Aggregate monthly stats for staff |

**Key logic rules:**
- Use `bulkWrite` with `upsert: true` for marking (handles re-submission)
- Always validate `school_id` ownership before any query
- Strip time from `date` field — store date-only: `new Date(date.toDateString())`
- Monthly aggregation uses MongoDB `$group` pipeline — never loop in Node.js

```typescript
// ✅ CORRECT — bulkWrite upsert pattern
const ops = records.map(r => ({
  updateOne: {
    filter: { school_id, class_id, section_id, date, student_id: r.student_id },
    update: { $set: { status: r.status, marked_by, marked_by_role, remark: r.remark } },
    upsert: true
  }
}));
await StudentAttendance.bulkWrite(ops);
```

---

## 🛠️ Build Order (Step-by-Step)

### Phase 1 — Backend Foundation
- [ ] 1. Create `StudentAttendance` Mongoose model in `infrastructure/`
- [ ] 2. Create `StaffAttendance` Mongoose model in `infrastructure/`
- [ ] 3. Implement all use cases in `application/`
- [ ] 4. Create route handlers in `api/` (thin, just validate + call use case)
- [ ] 5. Register routes in `server.ts` with `authenticateToken`
- [ ] 6. Add RBAC middleware: teacher can only access own class

### Phase 2 — Frontend Core
- [ ] 7. Create `src/services/attendanceService.ts`
- [ ] 8. Build `AttendanceModule.tsx` with tab switcher
- [ ] 9. Build `MarkAttendance.tsx` — daily marking screen
- [ ] 10. Wire `useQuery` + `useMutation` for daily mark flow
- [ ] 11. Test end-to-end: Teacher marks → Admin sees

### Phase 3 — Reporting
- [ ] 12. Build `MonthlyView.tsx` with attendance grid
- [ ] 13. Build `StudentReport.tsx` with stats cards
- [ ] 14. Build `StaffAttendance.tsx` (admin only)
- [ ] 15. Add CSV export to monthly view
- [ ] 16. Add low-attendance alert banner

### Phase 4 — Polish & Notifications (optional)
- [ ] 17. Wire absence event in `events/` → trigger Nodemailer
- [ ] 18. Add cron job in `jobs/` for daily reminder if attendance not marked
- [ ] 19. Add keyboard shortcuts to mark screen
- [ ] 20. Mobile-responsive swipe card view

---

## ✅ Definition of Done (DoD)

The attendance module is **complete** when:
- [ ] Teacher can mark student attendance and cannot see other classes
- [ ] Admin can mark all classes and view all reports
- [ ] Admin can mark staff attendance
- [ ] Monthly grid shows color-coded attendance
- [ ] Low-attendance students are flagged (<75%)
- [ ] Re-submission of attendance (edit) works correctly
- [ ] All endpoints protected with `authenticateToken` + RBAC
- [ ] CSV export works for monthly view
- [ ] No `@ts-nocheck` in any attendance file
- [ ] All list endpoints paginated
- [ ] Logged to `ActivityLog` on every mark/update

---

## 🚨 Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Teacher marks attendance for wrong class | RBAC check: compare `class_id` against `teacher.assigned_class` in DB |
| Duplicate records on re-submission | Use `bulkWrite` with `upsert: true` — never `insertMany` |
| Slow monthly aggregation for large schools | Use MongoDB aggregation pipeline + compound index on `school_id+date` |
| Future date marking | Validate `date <= today` in backend service |
| Time zone issues (India = IST +5:30) | Strip time, store date only. Use `dayjs` on frontend for date display |
| Admin overrides teacher's record | Log `marked_by` + `marked_by_role` on every record for audit trail |

---

*Always check `SCALABILITY_RULES.md` before writing any code for this module.*
