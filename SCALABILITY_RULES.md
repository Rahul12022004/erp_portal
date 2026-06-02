# 📐 SCALABILITY_RULES.md
## ERP Portal — Scalable Code Standards & Architecture Reference

> **IMPORTANT:** Every developer and AI assistant working on this repo MUST read and follow this file before making any code change. This is the single source of truth for architecture, naming, patterns, and best practices.

---

## 🗂️ 1. Project Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + Vite + TypeScript      |
| UI Library  | shadcn/ui + Radix UI + Tailwind   |
| Backend     | Node.js + Express + TypeScript    |
| Primary DB  | MongoDB Atlas (via Mongoose)      |
| Secondary DB| PostgreSQL (for relational/structured data via new microservices) |
| Auth        | JWT (HS256, 12h TTL)              |
| Email       | Nodemailer (SMTP)                 |
| State       | TanStack Query + React Context    |
| Build       | Vite (frontend) + tsc (backend)   |

---

## 🏗️ 2. Folder Structure (Non-Negotiable)

### Frontend (`src/`)
```
src/
├── components/         # Shared, reusable UI components only
│   └── ui/             # shadcn/ui auto-generated components
├── pages/              # Route-level page components
│   ├── school-admin/   # School admin role pages
│   │   └── modules/    # 25 school admin modules
│   ├── superadmin/     # Super admin pages
│   └── teacher/        # Teacher role pages
├── services/           # All API call functions (NO fetch inside components)
├── lib/                # Utilities: api.ts (fetch rewriter), auth.ts
├── context/            # React Context providers (RoleContext, etc.)
├── hooks/              # Custom React hooks only
└── types/              # Global TypeScript interfaces and types
```

### Backend (`backend/src/`)
```
backend/src/
├── routes/             # Express route handlers — thin layer only
├── services/           # Business logic — ALL heavy logic goes here
├── models/             # Mongoose schemas and models
├── middleware/         # Auth, RBAC, error handlers
├── utils/              # jwt.ts, sendEmail.ts, helpers
├── seeds/              # DB seed scripts
└── server.ts           # Entry point — mounts routes only
```

---

## 🧩 3. Microservice & Database Rules

### Database Assignment (Follow Strictly)
| Database     | Use For                                                         |
|--------------|-----------------------------------------------------------------|
| **MongoDB**  | School data, students, staff, fees, imports, logs, dynamic data |
| **PostgreSQL**| User accounts, billing, subscriptions, audit logs (structured) |

### Rules
- **One service = One database.** Never connect one service to both MongoDB AND PostgreSQL.
- Services communicate via **REST API calls** or **message queue** — never by sharing a database connection.
- All new microservices must define their database in a `README.md` at the service root.
- Cross-service data must go through the **API layer**, not direct DB access.

### Microservice Structure (New Services)
```
services/
├── auth-service/        # PostgreSQL
├── school-service/      # MongoDB
├── finance-service/     # MongoDB
├── analytics-service/   # PostgreSQL or MongoDB (define per README)
└── notification-service/# MongoDB
```

---

## 🔐 4. Authentication & Authorization Rules

- All protected routes MUST use `authenticateToken` middleware.
- RBAC check MUST be done on every route: `req.user.role === 'school-admin'`
- JWT secret MUST come from `process.env.JWT_SECRET` — never hardcode or fallback in production.
- Throw an error if `JWT_SECRET` is missing in non-dev environments.
- Never return `password` field in any API response.
- Never store auth token anywhere except `httpOnly` cookie (migrate from localStorage).

```typescript
// ✅ CORRECT — RBAC guard pattern
router.get('/resource', authenticateToken, requireRole('school-admin'), handler);

// ❌ WRONG — no auth, no role check
router.get('/resource', handler);
```

---

## 📡 5. API Design Rules

### Response Format (Always consistent)
```typescript
// Success
{ success: true, data: { ...payload } }

// Error
{ success: false, message: "Human-readable error", code?: "ERROR_CODE" }
```

### Naming Convention
- Routes: **kebab-case** → `/api/class-fee-structures`
- Response fields: **camelCase** → `academicFee`, `totalFee`
- DB fields: **snake_case** (Mongoose) → `academic_fee`, `school_id`
- Always transform snake_case → camelCase before sending API response.

### Pagination (Required on all list endpoints)
```typescript
// Every GET list endpoint MUST support:
GET /api/resource?page=1&limit=20&sort=createdAt&order=desc
```

### Versioning (For new APIs)
```
/api/v1/schools   ← new APIs use versioning
/api/schools      ← legacy, keep for backward compat
```

---

## 🧠 6. Backend Service Layer Rules

- **Routes are thin** — only validate input, call service, return response.
- **All business logic lives in `/services/`** — no logic in routes.
- All service functions must be **async** and wrapped in **try/catch**.
- Use **Mongoose transactions** for multi-document writes.
- Always convert string `schoolId` to `ObjectId` before queries:

```typescript
// ✅ CORRECT
const id = new mongoose.Types.ObjectId(schoolId);

// ❌ WRONG — causes silent query failures
const id = schoolId;
```

- Remove all `// @ts-nocheck` pragmas. Use proper Mongoose generic types:
```typescript
// ✅ CORRECT
const model = new Model<ISchool>(data);
await model.save();
```

---

## ⚛️ 7. Frontend Component Rules

- **No fetch/axios calls inside components** — always use `src/services/`.
- Use **TanStack Query** (`useQuery`, `useMutation`) for all server state.
- Components must be split: `<500 lines`. If larger, extract sub-components.
- Use `shadcn/ui` components — do not write custom UI primitives.
- All forms use **React Hook Form** — no manual `useState` form tracking.
- Loading, error, and empty states must be handled in every data component.

```typescript
// ✅ CORRECT pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['students', schoolId],
  queryFn: () => studentService.getAll(schoolId)
});

// ❌ WRONG — fetch inside component
useEffect(() => { fetch('/api/students').then(...) }, []);
```

---

## 🗃️ 8. MongoDB Model Rules

- Every model file in `backend/src/models/` must export:
  1. An `I[ModelName]` TypeScript interface
  2. A Mongoose schema
  3. A compiled Model
- Always define **indexes** for fields used in filters/sorts.
- Always add `timestamps: true` to every schema.
- Use `unique` index to prevent duplicates at DB level.

```typescript
// Template
export interface IStudent {
  school_id: mongoose.Types.ObjectId;
  name: string;
  roll_no: string;
  created_at?: Date;
}

const StudentSchema = new Schema<IStudent>({
  school_id: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true },
  roll_no: { type: String, required: true },
}, { timestamps: true });

export const Student = model<IStudent>('Student', StudentSchema);
```

---

## 🔒 9. Security Checklist (Every PR)

- [ ] No hardcoded secrets or API keys in code
- [ ] All routes behind `authenticateToken`
- [ ] RBAC role check on sensitive routes
- [ ] Input validated with Zod or express-validator before service call
- [ ] No raw user input passed to DB queries
- [ ] No `password` field in any response
- [ ] All write operations logged to activity log
- [ ] No `ts-nocheck` added to new files
- [ ] CORS `allowedOrigins` not expanded without approval

---

## 📦 10. Module Development Checklist

When building a new ERP module (e.g., Hostel, Library):

- [ ] **Backend:** Create model in `backend/src/models/`
- [ ] **Backend:** Create service in `backend/src/services/`
- [ ] **Backend:** Create routes in `backend/src/routes/`
- [ ] **Backend:** Register route in `server.ts` with `authenticateToken`
- [ ] **Frontend:** Create service functions in `src/services/`
- [ ] **Frontend:** Create module page in `src/pages/school-admin/modules/`
- [ ] **Frontend:** Use `useQuery`/`useMutation` for data fetching
- [ ] **Docs:** Update `CODE_REVIEW_GRAPH.md` module completion status
- [ ] **Tests:** Add curl test commands in module's quickstart doc

---

## 📝 11. Logging & Audit Trail

- Every `POST`, `PUT`, `PATCH`, `DELETE` request MUST write to the `ActivityLog` or `Logs` model.
- Log fields: `schoolId`, `userId`, `role`, `action`, `targetModel`, `targetId`, `timestamp`.
- Never skip logging for mutations — it is required for audit compliance.

```typescript
await Log.create({
  school_id: schoolId,
  user_id: req.user.userId,
  role: req.user.role,
  action: 'CREATE_STUDENT',
  target_model: 'Student',
  target_id: newStudent._id,
});
```

---

## 🚀 12. Performance Rules

- Use `.lean()` on all read-only Mongoose queries (returns plain JS objects, faster).
- Paginate ALL list queries — never return unbounded lists.
- Use `select()` to fetch only required fields.
- Index every field used in `WHERE`/filter conditions.
- For large imports, use `insertMany` with `ordered: false` — not looped `.save()`.

```typescript
// ✅ CORRECT — lean + select + paginate
const students = await Student
  .find({ school_id: id })
  .select('name roll_no class_id')
  .lean()
  .skip((page - 1) * limit)
  .limit(limit);
```

---

## 🔄 13. Environment Variables

All env vars must be documented in `.env.example`. Required vars:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://...

# PostgreSQL (for new microservices)
POSTGRES_URI=postgresql://user:pass@host:5432/dbname

# Auth
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_EXPIRES_IN=12h

# CORS
FRONTEND_ORIGINS=https://erp-portal-seven.vercel.app,http://localhost:8081

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@erp-portal.com

# Optional
GROQ_API_KEY=your-key-for-ai-mapping
```

---

## 📋 14. Git & PR Rules

- Branch naming: `feature/module-name`, `fix/bug-description`, `docs/update-name`
- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- Every PR must:
  1. Reference the module or feature it touches
  2. Not break existing API contracts
  3. Pass TypeScript compiler (no new `ts-nocheck`)
  4. Update this file if architecture changes

---

## 🗺️ 15. Module Completion Status

| Module             | Backend | Frontend | Status     |
|--------------------|---------|----------|------------|
| School Signup      | ✅      | ✅       | Done       |
| Auth System        | ✅      | ✅       | Done       |
| Finance Module     | ✅      | ✅       | Done       |
| Data Import        | ✅      | ✅       | Done       |
| Super Admin        | ✅      | ✅       | Done       |
| Student Module     | ✅      | ⚠️       | Partial    |
| Staff Module       | ✅      | ⚠️       | Partial    |
| Attendance         | ⚠️      | ⚠️       | Partial    |
| Exams & Marks      | ⚠️      | ⚠️       | Partial    |
| Hostel             | ❌      | 🔲       | Stub       |
| Library            | ❌      | 🔲       | Stub       |
| Transport          | ❌      | 🔲       | Stub       |
| Inventory          | ❌      | 🔲       | Stub       |
| Visitor            | ❌      | 🔲       | Stub       |
| Social Media       | ❌      | 🔲       | Stub       |
| Surveys            | ❌      | 🔲       | Stub       |
| Maintenance        | ❌      | 🔲       | Stub       |
| Notifications      | ⚠️      | ❌       | Partial    |
| Payment Gateway    | 🔲      | 🔲       | Started    |
| RBAC Enforcement   | ❌      | ❌       | Pending    |

> Legend: ✅ Done | ⚠️ Partial | ❌ Not built | 🔲 Stub only

---

*Last updated: May 31, 2026 — Always keep this file current with every architectural change.*
