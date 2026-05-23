# Module Dependency Report

Generated: 2026-05-23

## Cross-Module Route Ownership (Tight Couplings)

### 🔴 HIGH — Routes owned by wrong module

| Route file | Currently in | Should be in | Impact |
|-----------|-------------|--------------|--------|
| `attendanceRoutes.ts` | `academics/routes/` | `attendance/api/` | Cannot extract `attendance` module independently — it has no active routes despite having full DDD structure |
| `examRoutes.ts` | `academics/routes/` | `exams/api/` | Same — `exams` module is a hollow scaffold |
| `markRoutes.ts` | `academics/routes/` | `exams/api/` or new `marks` module | `marks` has no dedicated module at all |
| `salaryStructureRoutes.ts` | `finance/routes/` | `payroll/api/` | Payroll domain is split: module exists in `payroll/` but salary routes live in `finance/` |

**Resolution path for each:**
1. Move route file to the correct module's `api/` folder
2. Update the originating module's `index.ts` to remove the entry
3. Add entry to the target module's `index.ts`
4. No other files change (business logic stays in route files)

---

### 🟡 MEDIUM — Multi-domain modules

| Module | Domains mixed | Recommended split |
|--------|--------------|-------------------|
| `academics` | classes, subjects, materials, assignments, attendance, exams, marks | Separate attendance + exams per HIGH couplings above |
| `finance` | fee collection, expenses, banking, salary structures | Move salary → payroll; consider banking as separate module |
| `staff` | staff profiles, leave management, teacher roles | Leave management could become `hr` module |
| `communication` | announcements + general communication | Fine at current scale; separate if volume grows |

---

### 🟢 LOW — Shared infrastructure

| Issue | Location | Notes |
|-------|----------|-------|
| Email utility | `core/utils/sendEmail.ts` | Should move to `infrastructure/email/` for extraction readiness |
| JWT utility | `core/utils/jwt.ts` | Already in `core/` — fine |
| Auth middleware | `core/middleware/auth.ts` | Already in `core/` — fine |
| Login throttle | `core/utils/loginThrottle.ts` | Move to `infrastructure/cache/` when Redis is introduced |

---

## Module Infrastructure Usage

| Module | MongoDB | Cache | Queue | Email |
|--------|---------|-------|-------|-------|
| academics | ✓ | — | — | — |
| communication | ✓ | — | — | ✓ |
| finance | ✓ | — | — | — |
| students | ✓ | — | — | — |
| staff | ✓ | — | — | — |
| transport | ✓ | — | — | — |
| hostel | ✓ | — | — | — |
| library | ✓ | — | — | — |
| inventory | ✓ | — | — | — |
| school | ✓ | — | — | ✓ |

---

## Recommended Service Extraction Order

When ready to split into microservices, extract in this order (least coupled → most coupled):

1. `analytics` — read-only aggregations, no writes other modules depend on
2. `reports` — read-only
3. `notifications` — event-driven, already has `events/` folder
4. `ai-assistant` — independent capability
5. `library`, `inventory`, `hostel` — low cross-module coupling
6. `finance` — after moving salary routes to `payroll`
7. `auth` — after moving login routes from `school`/`staff` to `auth/api/`
8. `attendance`, `exams` — after migrating routes out of `academics`
9. `students`, `staff` — high mutual coupling, extract together
10. `academics` — last; depends on all above being extracted first
