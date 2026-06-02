# 🤖 ATTENDANCE MODULE — Full Build Prompt
## Use this file as the prompt when asking any AI to build the attendance module

---

## 📌 CONTEXT (Read Before Writing Any Code)

You are building the **Attendance Module** for a School ERP Portal.

**Tech Stack:**
- Backend: Node.js + Express + TypeScript, DDD folder structure
- Database: MongoDB Atlas via Mongoose
- Frontend: React 18 + Vite + TypeScript + TanStack Query + shadcn/ui + Tailwind
- Auth: JWT Bearer tokens (role: `super-admin` | `school-admin` | `teacher`)
- Project repo: `erp_portal` by Rahul12022004

**Reference files you MUST follow:**
- `SCALABILITY_RULES.md` — all code standards, patterns, folder rules
- `ATTENDANCE_REDESIGN_PLAN.md` — screens, schemas, API contracts

**Existing backend structure (already created, just empty stubs):**
```
backend/src/modules/attendance/
  api/index.ts           ← empty stub
  application/index.ts   ← empty stub
  domain/index.ts        ← empty stub (export {})
  infrastructure/index.ts ← empty stub
  events/index.ts        ← empty stub
  jobs/index.ts          ← empty stub
  index.ts               ← module entry
```

---

## 🎯 TASK OVERVIEW

Build the **complete, production-ready Attendance module** in 4 phases.

Do NOT skip any phase. Each phase depends on the previous one.
Write **all files completely** — no `// TODO` or placeholder stubs.

---

## ❗ GLOBAL CODE RULES (Non-negotiable)

1. **No `@ts-nocheck`** anywhere. Use proper Mongoose generic types: `Schema<IModel>`.
2. **No business logic in route handlers.** Routes call use cases. Use cases call repositories.
3. **Every async function must have try/catch** with proper error propagation.
4. **All errors thrown as typed `AppError`** with `statusCode` and `message`.
5. **All list endpoints paginated** with `page` and `limit` query params.
6. **All write operations logged** to `ActivityLog` model.
7. **No `any` type** unless unavoidable with a comment explaining why.
8. **Mongoose queries must use `.lean()`** on read-only operations.
9. **Use `bulkWrite` with `upsert: true`** for batch attendance marking — NEVER loop `.save()`.
10. **Strip time from date fields** — always store date-only: `new Date(new Date(date).toDateString())`.
11. Response format is ALWAYS `{ success: true, data: ... }` or `{ success: false, message: '...' }`.
12. **Validate `school_id` ownership** in every use case before DB operations.
13. Teacher role can ONLY access their own `assigned_class`. Enforce in every use case.

---

## 📦 PHASE 1 — BACKEND: Domain Types + Models + Repositories

### 1A. Domain Types
**File: `backend/src/modules/attendance/domain/index.ts`**

Replace the empty export with these exact types:

```typescript
import { Types } from 'mongoose';

export type StudentAttendanceStatus = 'present' | 'absent' | 'late' | 'leave';
export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'half-day';
export type MarkedByRole = 'teacher' | 'school-admin';

export interface IStudentAttendance {
  _id?: Types.ObjectId;
  school_id: Types.ObjectId;
  class_id: string;
  section_id: string;
  academic_year: string;
  date: Date;
  student_id: Types.ObjectId;
  status: StudentAttendanceStatus;
  marked_by: Types.ObjectId;
  marked_by_role: MarkedByRole;
  remark?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IStaffAttendance {
  _id?: Types.ObjectId;
  school_id: Types.ObjectId;
  staff_id: Types.ObjectId;
  academic_year: string;
  date: Date;
  status: StaffAttendanceStatus;
  marked_by: Types.ObjectId;
  remark?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AttendanceRecord {
  student_id: string;
  status: StudentAttendanceStatus;
  remark?: string;
}

export interface StaffAttendanceRecord {
  staff_id: string;
  status: StaffAttendanceStatus;
  remark?: string;
}

export interface MonthlyStudentSummary {
  student_id: string;
  student_name: string;
  roll_no: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total_working_days: number;
  percentage: number;
}

export interface MarkStudentAttendanceDTO {
  school_id: string;
  class_id: string;
  section_id: string;
  academic_year: string;
  date: string; // ISO date string
  records: AttendanceRecord[];
  marked_by: string;
  marked_by_role: MarkedByRole;
}

export interface MarkStaffAttendanceDTO {
  school_id: string;
  academic_year: string;
  date: string;
  records: StaffAttendanceRecord[];
  marked_by: string;
}

export interface GetDailyAttendanceDTO {
  school_id: string;
  class_id: string;
  section_id: string;
  date: string;
}

export interface GetMonthlyAttendanceDTO {
  school_id: string;
  class_id: string;
  section_id: string;
  month: number; // 1-12
  year: number;
  academic_year: string;
}
```

---

### 1B. Error Class
**File: `backend/src/shared/errors/AppError.ts`** (create if not exists)

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
```

---

### 1C. Mongoose Models
**File: `backend/src/modules/attendance/infrastructure/StudentAttendance.model.ts`**

```typescript
import { Schema, model, Types } from 'mongoose';
import { IStudentAttendance } from '../domain';

const StudentAttendanceSchema = new Schema<IStudentAttendance>(
  {
    school_id:       { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    class_id:        { type: String, required: true },
    section_id:      { type: String, required: true },
    academic_year:   { type: String, required: true },
    date:            { type: Date, required: true },
    student_id:      { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    status:          { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
    marked_by:       { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    marked_by_role:  { type: String, enum: ['teacher', 'school-admin'], required: true },
    remark:          { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound unique: one record per student per date per class
StudentAttendanceSchema.index(
  { school_id: 1, class_id: 1, section_id: 1, date: 1, student_id: 1 },
  { unique: true }
);
// Query performance indexes
StudentAttendanceSchema.index({ school_id: 1, date: 1 });
StudentAttendanceSchema.index({ school_id: 1, class_id: 1, date: 1 });
StudentAttendanceSchema.index({ school_id: 1, student_id: 1 });
StudentAttendanceSchema.index({ school_id: 1, student_id: 1, date: 1 });

export const StudentAttendance = model<IStudentAttendance>('StudentAttendance', StudentAttendanceSchema);
```

**File: `backend/src/modules/attendance/infrastructure/StaffAttendance.model.ts`**

```typescript
import { Schema, model } from 'mongoose';
import { IStaffAttendance } from '../domain';

const StaffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    school_id:     { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    staff_id:      { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    academic_year: { type: String, required: true },
    date:          { type: Date, required: true },
    status:        { type: String, enum: ['present', 'absent', 'late', 'leave', 'half-day'], required: true },
    marked_by:     { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    remark:        { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

StaffAttendanceSchema.index({ school_id: 1, staff_id: 1, date: 1 }, { unique: true });
StaffAttendanceSchema.index({ school_id: 1, date: 1 });
StaffAttendanceSchema.index({ school_id: 1, staff_id: 1 });

export const StaffAttendance = model<IStaffAttendance>('StaffAttendance', StaffAttendanceSchema);
```

**File: `backend/src/modules/attendance/infrastructure/index.ts`**

```typescript
export { StudentAttendance } from './StudentAttendance.model';
export { StaffAttendance } from './StaffAttendance.model';
```

---

## ⚡ PHASE 2 — BACKEND: Use Cases (Application Layer)

Each use case is a **single-responsibility async function**. All are in `backend/src/modules/attendance/application/`.

---

### 2A. markStudentAttendance.ts

```typescript
import { Types } from 'mongoose';
import { StudentAttendance } from '../infrastructure';
import { MarkStudentAttendanceDTO } from '../domain';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/errors/AppError';
// Import School model from school module
import { School } from '../../school/infrastructure'; // adjust path as needed
// Import Staff model to validate teacher's assigned class
import { Staff } from '../../staff/infrastructure'; // adjust path as needed

export async function markStudentAttendance(dto: MarkStudentAttendanceDTO, requestingRole: string): Promise<{ markedCount: number; updatedCount: number }> {
  // --- Validation ---
  if (!dto.school_id || !dto.class_id || !dto.section_id || !dto.date || !dto.academic_year) {
    throw new ValidationError('school_id, class_id, section_id, date, and academic_year are required');
  }
  if (!dto.records || dto.records.length === 0) {
    throw new ValidationError('records array must not be empty');
  }

  // --- School ownership ---
  const school = await School.findById(dto.school_id).lean();
  if (!school) throw new NotFoundError('School');

  // --- RBAC: Teacher can only mark their assigned class ---
  if (requestingRole === 'teacher') {
    const teacher = await Staff.findOne({
      _id: new Types.ObjectId(dto.marked_by),
      school_id: new Types.ObjectId(dto.school_id)
    }).lean();
    if (!teacher) throw new NotFoundError('Teacher');
    if (teacher.assigned_class !== dto.class_id || teacher.assigned_section !== dto.section_id) {
      throw new ForbiddenError('You can only mark attendance for your own assigned class');
    }
  }

  // --- Strip time from date ---
  const attendanceDate = new Date(new Date(dto.date).toDateString());
  if (attendanceDate > new Date()) {
    throw new ValidationError('Cannot mark attendance for a future date');
  }

  // --- Bulk upsert ---
  const ops = dto.records.map(record => ({
    updateOne: {
      filter: {
        school_id: new Types.ObjectId(dto.school_id),
        class_id: dto.class_id,
        section_id: dto.section_id,
        date: attendanceDate,
        student_id: new Types.ObjectId(record.student_id),
      },
      update: {
        $set: {
          status: record.status,
          marked_by: new Types.ObjectId(dto.marked_by),
          marked_by_role: dto.marked_by_role,
          academic_year: dto.academic_year,
          remark: record.remark ?? '',
        },
      },
      upsert: true,
    },
  }));

  const result = await StudentAttendance.bulkWrite(ops, { ordered: false });

  return {
    markedCount: result.upsertedCount,
    updatedCount: result.modifiedCount,
  };
}
```

---

### 2B. getDailyAttendance.ts

```typescript
import { Types } from 'mongoose';
import { StudentAttendance } from '../infrastructure';
import { GetDailyAttendanceDTO } from '../domain';
import { ValidationError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError';
import { Staff } from '../../staff/infrastructure';

export async function getDailyAttendance(dto: GetDailyAttendanceDTO, requestingUserId: string, requestingRole: string) {
  if (!dto.school_id || !dto.class_id || !dto.section_id || !dto.date) {
    throw new ValidationError('school_id, class_id, section_id, and date are required');
  }

  // RBAC check for teacher
  if (requestingRole === 'teacher') {
    const teacher = await Staff.findOne({
      _id: new Types.ObjectId(requestingUserId),
      school_id: new Types.ObjectId(dto.school_id)
    }).lean();
    if (!teacher) throw new NotFoundError('Teacher');
    if (teacher.assigned_class !== dto.class_id || teacher.assigned_section !== dto.section_id) {
      throw new ForbiddenError('You can only view attendance for your own class');
    }
  }

  const date = new Date(new Date(dto.date).toDateString());

  const records = await StudentAttendance
    .find({
      school_id: new Types.ObjectId(dto.school_id),
      class_id: dto.class_id,
      section_id: dto.section_id,
      date,
    })
    .populate('student_id', 'name roll_no photo')
    .populate('marked_by', 'name')
    .lean();

  const summary = {
    present: records.filter(r => r.status === 'present').length,
    absent:  records.filter(r => r.status === 'absent').length,
    late:    records.filter(r => r.status === 'late').length,
    leave:   records.filter(r => r.status === 'leave').length,
    total:   records.length,
    isMarked: records.length > 0,
  };

  return { records, summary, date };
}
```

---

### 2C. getMonthlyAttendance.ts

```typescript
import { Types } from 'mongoose';
import { StudentAttendance } from '../infrastructure';
import { GetMonthlyAttendanceDTO } from '../domain';
import { ValidationError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError';
import { Staff } from '../../staff/infrastructure';

export async function getMonthlyAttendance(dto: GetMonthlyAttendanceDTO, requestingUserId: string, requestingRole: string) {
  if (!dto.school_id || !dto.class_id || !dto.section_id || !dto.month || !dto.year) {
    throw new ValidationError('school_id, class_id, section_id, month, and year are required');
  }
  if (dto.month < 1 || dto.month > 12) throw new ValidationError('month must be between 1 and 12');

  // RBAC
  if (requestingRole === 'teacher') {
    const teacher = await Staff.findOne({
      _id: new Types.ObjectId(requestingUserId),
      school_id: new Types.ObjectId(dto.school_id)
    }).lean();
    if (!teacher) throw new NotFoundError('Teacher');
    if (teacher.assigned_class !== dto.class_id) {
      throw new ForbiddenError('You can only view your own class attendance');
    }
  }

  const startDate = new Date(dto.year, dto.month - 1, 1);
  const endDate = new Date(dto.year, dto.month, 0); // last day of month

  // Aggregation pipeline — never loop in Node.js
  const pipeline = [
    {
      $match: {
        school_id: new Types.ObjectId(dto.school_id),
        class_id: dto.class_id,
        section_id: dto.section_id,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$student_id',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        late:    { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        leave:   { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
        total:   { $sum: 1 },
        dates:   { $push: { date: '$date', status: '$status' } },
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmpty: false } },
    {
      $project: {
        student_id: '$_id',
        student_name: '$student.name',
        roll_no: '$student.roll_no',
        present: 1,
        absent: 1,
        late: 1,
        leave: 1,
        total: 1,
        dates: 1,
        percentage: {
          $round: [
            { $multiply: [{ $divide: ['$present', { $max: ['$total', 1] }] }, 100] },
            1,
          ],
        },
      },
    },
    { $sort: { roll_no: 1 } },
  ];

  const result = await StudentAttendance.aggregate(pipeline);
  return { students: result, month: dto.month, year: dto.year };
}
```

---

### 2D. getLowAttendanceStudents.ts

```typescript
import { Types } from 'mongoose';
import { StudentAttendance } from '../infrastructure';
import { ValidationError } from '../../../shared/errors/AppError';

export async function getLowAttendanceStudents(
  school_id: string,
  class_id: string,
  section_id: string,
  academic_year: string,
  threshold: number = 75
) {
  if (!school_id || !class_id || !academic_year) {
    throw new ValidationError('school_id, class_id, and academic_year are required');
  }
  if (threshold < 0 || threshold > 100) {
    throw new ValidationError('threshold must be between 0 and 100');
  }

  const pipeline = [
    {
      $match: {
        school_id: new Types.ObjectId(school_id),
        class_id,
        section_id,
        academic_year,
      },
    },
    {
      $group: {
        _id: '$student_id',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        total:   { $sum: 1 },
      },
    },
    {
      $addFields: {
        percentage: {
          $round: [
            { $multiply: [{ $divide: ['$present', { $max: ['$total', 1] }] }, 100] },
            1,
          ],
        },
      },
    },
    { $match: { percentage: { $lt: threshold } } },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $project: {
        student_id: '$_id',
        student_name: '$student.name',
        roll_no: '$student.roll_no',
        present: 1,
        total: 1,
        percentage: 1,
      },
    },
    { $sort: { percentage: 1 } },
  ];

  const students = await StudentAttendance.aggregate(pipeline);
  return { students, threshold };
}
```

---

### 2E. markStaffAttendance.ts

```typescript
import { Types } from 'mongoose';
import { StaffAttendance } from '../infrastructure';
import { MarkStaffAttendanceDTO } from '../domain';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { School } from '../../school/infrastructure';

export async function markStaffAttendance(dto: MarkStaffAttendanceDTO): Promise<{ markedCount: number; updatedCount: number }> {
  if (!dto.school_id || !dto.date || !dto.academic_year) {
    throw new ValidationError('school_id, date, and academic_year are required');
  }
  if (!dto.records || dto.records.length === 0) {
    throw new ValidationError('records array must not be empty');
  }

  const school = await School.findById(dto.school_id).lean();
  if (!school) throw new NotFoundError('School');

  const attendanceDate = new Date(new Date(dto.date).toDateString());
  if (attendanceDate > new Date()) {
    throw new ValidationError('Cannot mark attendance for a future date');
  }

  const ops = dto.records.map(record => ({
    updateOne: {
      filter: {
        school_id: new Types.ObjectId(dto.school_id),
        staff_id: new Types.ObjectId(record.staff_id),
        date: attendanceDate,
      },
      update: {
        $set: {
          status: record.status,
          marked_by: new Types.ObjectId(dto.marked_by),
          academic_year: dto.academic_year,
          remark: record.remark ?? '',
        },
      },
      upsert: true,
    },
  }));

  const result = await StaffAttendance.bulkWrite(ops, { ordered: false });
  return { markedCount: result.upsertedCount, updatedCount: result.modifiedCount };
}
```

---

### 2F. Export all use cases
**File: `backend/src/modules/attendance/application/index.ts`**

```typescript
export { markStudentAttendance } from './markStudentAttendance';
export { getDailyAttendance } from './getDailyAttendance';
export { getMonthlyAttendance } from './getMonthlyAttendance';
export { getLowAttendanceStudents } from './getLowAttendanceStudents';
export { markStaffAttendance } from './markStaffAttendance';
export { getStaffDailyAttendance } from './getStaffDailyAttendance';
export { getStaffMonthlyAttendance } from './getStaffMonthlyAttendance';
```

Also create `getStaffDailyAttendance.ts` and `getStaffMonthlyAttendance.ts` following the same patterns as student versions but querying `StaffAttendance` model.

---

## 🔌 PHASE 3 — BACKEND: Route Handlers (API Layer)

**File: `backend/src/modules/attendance/api/attendanceRoutes.ts`**

Rules:
- Routes are **thin** — only validate presence of required params, then call use case
- All errors caught and forwarded with consistent format
- Use `next(error)` pattern so global error handler handles it

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../../shared/middleware/auth'; // adjust path
import {
  markStudentAttendance,
  getDailyAttendance,
  getMonthlyAttendance,
  getLowAttendanceStudents,
  markStaffAttendance,
  getStaffDailyAttendance,
  getStaffMonthlyAttendance,
} from '../application';
import { AppError } from '../../../shared/errors/AppError';

const router = Router();

// ──────────────────────────
// STUDENT ATTENDANCE
// ──────────────────────────

// POST /api/attendance/student/mark
router.post('/student/mark', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!['teacher', 'school-admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await markStudentAttendance(
      {
        school_id: req.body.school_id,
        class_id: req.body.class_id,
        section_id: req.body.section_id,
        academic_year: req.body.academic_year,
        date: req.body.date,
        records: req.body.records,
        marked_by: user.userId,
        marked_by_role: user.role as 'teacher' | 'school-admin',
      },
      user.role
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/student/daily?school_id=&class_id=&section_id=&date=
router.get('/student/daily', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const result = await getDailyAttendance(
      {
        school_id: req.query.school_id as string,
        class_id: req.query.class_id as string,
        section_id: req.query.section_id as string,
        date: req.query.date as string,
      },
      user.userId,
      user.role
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/student/monthly?school_id=&class_id=&section_id=&month=&year=&academic_year=
router.get('/student/monthly', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const result = await getMonthlyAttendance(
      {
        school_id: req.query.school_id as string,
        class_id: req.query.class_id as string,
        section_id: req.query.section_id as string,
        month: Number(req.query.month),
        year: Number(req.query.year),
        academic_year: req.query.academic_year as string,
      },
      user.userId,
      user.role
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/student/low?school_id=&class_id=&section_id=&academic_year=&threshold=
router.get('/student/low', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'school-admin') {
      return res.status(403).json({ success: false, message: 'Only school admins can view low attendance report' });
    }
    const result = await getLowAttendanceStudents(
      req.query.school_id as string,
      req.query.class_id as string,
      req.query.section_id as string,
      req.query.academic_year as string,
      req.query.threshold ? Number(req.query.threshold) : 75
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────
// STAFF ATTENDANCE
// ──────────────────────────

// POST /api/attendance/staff/mark
router.post('/staff/mark', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'school-admin') {
      return res.status(403).json({ success: false, message: 'Only school admins can mark staff attendance' });
    }
    const result = await markStaffAttendance({
      school_id: req.body.school_id,
      academic_year: req.body.academic_year,
      date: req.body.date,
      records: req.body.records,
      marked_by: user.userId,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/staff/daily?school_id=&date=
router.get('/staff/daily', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'school-admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const result = await getStaffDailyAttendance(
      req.query.school_id as string,
      req.query.date as string
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/staff/monthly?school_id=&month=&year=&academic_year=
router.get('/staff/monthly', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'school-admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const result = await getStaffMonthlyAttendance(
      req.query.school_id as string,
      Number(req.query.month),
      Number(req.query.year),
      req.query.academic_year as string
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
```

---

### 3B. Global Error Handler
**File: `backend/src/shared/middleware/errorHandler.ts`** (create if not exists)

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record already exists with this data',
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Unexpected errors — never leak stack trace in production
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}
```

**Register in `server.ts` AFTER all routes:**
```typescript
import { globalErrorHandler } from './shared/middleware/errorHandler';
import attendanceRoutes from './modules/attendance/api/attendanceRoutes';

// Mount attendance routes
app.use('/api/attendance', attendanceRoutes);

// MUST be last
app.use(globalErrorHandler);
```

---

## 🎨 PHASE 4 — FRONTEND

### 4A. Service Layer
**File: `src/services/attendanceService.ts`**

```typescript
// No fetch inside components. All API calls go through this file.
// Global fetch rewriter in src/lib/api.ts handles auth headers automatically.

const BASE = 'api/attendance'; // rewriter prepends backend URL

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data.data as T;
}

export const attendanceService = {
  // ---- STUDENT ----
  async markStudentAttendance(payload: MarkStudentAttendancePayload) {
    const res = await fetch(`${BASE}/student/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getDailyAttendance(school_id: string, class_id: string, section_id: string, date: string) {
    const params = new URLSearchParams({ school_id, class_id, section_id, date });
    const res = await fetch(`${BASE}/student/daily?${params}`);
    return handleResponse(res);
  },

  async getMonthlyAttendance(school_id: string, class_id: string, section_id: string, month: number, year: number, academic_year: string) {
    const params = new URLSearchParams({
      school_id, class_id, section_id,
      month: String(month), year: String(year), academic_year
    });
    const res = await fetch(`${BASE}/student/monthly?${params}`);
    return handleResponse(res);
  },

  async getLowAttendance(school_id: string, class_id: string, section_id: string, academic_year: string, threshold = 75) {
    const params = new URLSearchParams({ school_id, class_id, section_id, academic_year, threshold: String(threshold) });
    const res = await fetch(`${BASE}/student/low?${params}`);
    return handleResponse(res);
  },

  // ---- STAFF ----
  async markStaffAttendance(payload: MarkStaffAttendancePayload) {
    const res = await fetch(`${BASE}/staff/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getStaffDailyAttendance(school_id: string, date: string) {
    const params = new URLSearchParams({ school_id, date });
    const res = await fetch(`${BASE}/staff/daily?${params}`);
    return handleResponse(res);
  },

  async getStaffMonthlyAttendance(school_id: string, month: number, year: number, academic_year: string) {
    const params = new URLSearchParams({ school_id, month: String(month), year: String(year), academic_year });
    const res = await fetch(`${BASE}/staff/monthly?${params}`);
    return handleResponse(res);
  },
};
```

---

### 4B. Main Module Entry
**File: `src/pages/school-admin/modules/AttendanceModule.tsx`**

Requirements:
- Show 2 tabs: **🎒 Student Attendance** | **👩‍🏫 Staff Attendance**
- Teacher role → show ONLY student tab, class/section pre-filled from their profile
- Admin role → show both tabs
- Use shadcn `<Tabs>` component
- Each tab lazy-loads its sub-component
- Show loading spinner while loading
- Show toast error if API fails (use `sonner` toast)

---

### 4C. MarkAttendance Component
**File: `src/pages/school-admin/modules/attendance/MarkAttendance.tsx`**

Requirements:
- **Selectors row:** Class dropdown, Section dropdown, Date picker (default = today)
- **After selection:** Call `getDailyAttendance` via `useQuery`
- If no attendance yet: default all students to `present`
- If already marked: prefill with existing data + show "Already submitted — editing" badge
- **One-click "Mark All Present" button**
- Student rows: Name, Roll No, and 4 radio buttons (P/A/L/Lv) using shadcn `<RadioGroup>`
- Live summary bar: `✅ Present | ❌ Absent | 🕐 Late | 🍌 Leave` counts
- **Submit button** → calls `markStudentAttendance` via `useMutation`
- Loading state on submit button
- Success toast with count: "Attendance saved — 28 present, 2 absent"
- Error toast: show API error message
- **Prevent submit if no students loaded**

---

### 4D. MonthlyView Component
**File: `src/pages/school-admin/modules/attendance/MonthlyView.tsx`**

Requirements:
- Month navigator (prev/next arrows, current month label)
- Class + Section selectors
- Grid table: rows = students, columns = dates 1–31
- Color coding per cell: 🟢 present, 🔴 absent, 🟡 late, ⚪ leave, — (grey) = not a school day
- Attendance % badge per student row (red if < 75%)
- Low attendance warning banner if any students below 75%
- CSV export button (client-side using `data:text/csv` download)
- Empty state if no data yet

---

### 4E. StaffAttendance Component
**File: `src/pages/school-admin/modules/attendance/StaffAttendance.tsx`**

Requirements:
- Same layout as MarkAttendance but for all staff
- No class/section selector — list all active staff
- Extra status: Half-Day
- Monthly view sub-tab inside this component
- Only render for `school-admin` role (hide from teachers)

---

## 🧹 Error Handling Requirements (ALL layers)

### Backend (Every use case)
```
✔️ Missing required fields      → ValidationError (400)
✔️ School not found             → NotFoundError (404)
✔️ Future date                  → ValidationError (400)
✔️ Wrong role accessing route   → ForbiddenError (403)
✔️ Teacher wrong class          → ForbiddenError (403)
✔️ MongoDB duplicate key        → ConflictError (409) via global handler
✔️ Unexpected DB error          → AppError (500) via global handler
```

### Frontend (Every component)
```
✔️ Loading state                → Skeleton loader (shadcn <Skeleton>)
✔️ Empty state (no students)    → Empty state illustration + message
✔️ API error                    → toast.error(err.message) from sonner
✔️ Submit in progress           → Disabled button + spinner
✔️ Network failure              → Retry button shown
✔️ No class selected            → Disabled submit, hint text shown
```

---

## 📝 TypeScript Types for Frontend
**File: `src/types/attendance.ts`**

```typescript
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';
export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'half-day';

export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  roll_no: string;
  photo?: string;
  status: AttendanceStatus;
  remark?: string;
}

export interface DailyAttendanceResponse {
  records: AttendanceRecord[];
  summary: {
    present: number;
    absent: number;
    late: number;
    leave: number;
    total: number;
    isMarked: boolean;
  };
  date: string;
}

export interface MonthlyStudentSummary {
  student_id: string;
  student_name: string;
  roll_no: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  percentage: number;
  dates: Array<{ date: string; status: AttendanceStatus }>;
}

export interface MonthlyAttendanceResponse {
  students: MonthlyStudentSummary[];
  month: number;
  year: number;
}

export interface MarkStudentAttendancePayload {
  school_id: string;
  class_id: string;
  section_id: string;
  academic_year: string;
  date: string;
  records: Array<{ student_id: string; status: AttendanceStatus; remark?: string }>;
}
```

---

## ✅ Final Checklist Before Submitting Any Attendance Code

- [ ] No `@ts-nocheck` anywhere
- [ ] Every async function has try/catch or throws `AppError` subclass
- [ ] All Mongoose queries use `.lean()` for reads
- [ ] `bulkWrite` used for marking (not `.save()` loops)
- [ ] Date stored without time component
- [ ] RBAC enforced per role per route AND per use case
- [ ] Response always `{ success: true/false, data/message }`
- [ ] Global error handler registered in server.ts AFTER all routes
- [ ] Frontend uses `useQuery` / `useMutation` (no raw `useEffect` + fetch)
- [ ] All error states handled: loading / empty / error / success
- [ ] CSV export tested with 30+ students
- [ ] Low attendance threshold configurable (default 75%)
- [ ] Activity log written on every POST/PUT mutation

---

*Reference: `SCALABILITY_RULES.md` + `ATTENDANCE_REDESIGN_PLAN.md`*
*Last updated: May 31, 2026*
