# Dependency & Coupling Report

Generated from static import analysis of `backend/src/`.

## Cross-Module Import Counts

| Imported from | Times | Imported by modules |
|---------------|-------|---------------------|
| `students/models/Student` | 11 | academics, finance, library, data-import, communication |
| `core/utils/createLog` | 22 | academics, communication, data-import, finance, hostel, inventory, library, maintenance |
| `staff/models/Staff` | 7 | academics, finance |
| `school/models/School` | 6 | academics, finance, data-import |
| `academics/models/Class` | 6 | finance, data-import |
| `transport/models/Transport` | 3 | data-import |
| `finance/models/Finance` | 3 | (self) |
| `finance/models/StudentFeeAssignment` | 2 | finance, data-import |
| `finance/models/ClassFeeStructure` | 2 | finance, data-import |
| `communication/models/Announcement` | 2 | (self) |

## Tight Couplings — High Priority

### 1. `students/Student` model (CRITICAL)
**Severity:** High  
**Problem:** Student model is directly imported into 5 different modules. Any schema change cascades everywhere.  
**Fix:** Define a `StudentRef` DTO/interface in `shared/types`. Modules query students via the `students` module's public API, not direct model access.

### 2. `core/utils/createLog` (MEDIUM)
**Severity:** Medium  
**Problem:** 22 imports across all modules create hard coupling to the log implementation. Log schema changes break everything.  
**Fix:** Route through `infrastructure/logger` or expose `audit.log(event)` via the `audit` module's public API.

### 3. `academics` → `students` + `staff` + `school` (HIGH)
**Severity:** High  
**Problem:** `attendanceRoutes`, `classRoutes`, `markRoutes`, `examRoutes`, `assignmentRoutes` all import models from 3 other modules.  
**Fix:** Create application services in `academics/application/` that accept IDs and use repository patterns.

### 4. `finance` → `students` + `academics` + `staff` (HIGH)
**Severity:** High  
**Problem:** `financeRoutes` and `financeService` import Student, Class, and Staff models directly.  
**Fix:** Finance should only hold `studentId` references and call `students` module API to resolve student data.

### 5. `data-import` — hub coupling (HIGH)
**Severity:** High  
**Problem:** `dataImportRoutes` imports from 6 different modules (Class, ClassFeeStructure, School, Student, StudentFeeAssignment, Transport). It is a god-route.  
**Fix:** Extract an `ImportOrchestrationService` in `integrations/application/` that coordinates via module APIs.

## Coupling Graph (simplified)

```
data-import ──────→ students
     │         ┌──→ academics (Class)
     │         ├──→ finance (ClassFeeStructure, StudentFeeAssignment)
     │         ├──→ school
     └─────────┴──→ transport

academics ────────→ students
     └────────────→ staff
     └────────────→ school

finance ──────────→ students
     └────────────→ academics (Class)
     └────────────→ staff

library ──────────→ students

[all modules] ────→ core/utils/createLog
```

## Legacy Modules (not in target 26)

These exist in current code and need mapping decisions:

| Current Module | Maps to | Action |
|----------------|---------|--------|
| `ai/` | `ai-assistant` | Merge into new `ai-assistant` module |
| `data-import/` | `integrations` | Move to `integrations` module |
| `logs/` | `audit` | Move to `audit` module |
| `maintenance/` | `settings` or `admin` | Merge into `admin` |
| `school/` | `admin` | Merge into `admin` module |
| `social/` | `communication` | Merge into `communication` |
| `survey/` | `analytics` or `communication` | Decide ownership |
| `visitor/` | `admin` | Merge into `admin` |

## Next Refactoring Recommendations

### Phase 1 — Shared contracts (low risk)
1. Extract `StudentRef`, `StaffRef`, `SchoolRef` interfaces into `shared/types/`
2. Replace direct model imports with the shared type interfaces where only data is read
3. Add `tsc-alias` + `tsconfig-paths` to build pipeline

### Phase 2 — Module public APIs (medium risk)
4. Create `students/application/StudentService.ts` with `findById(id)`, `findByClass(classId)` methods
5. Replace all `../../students/models/Student` imports with calls to StudentService
6. Repeat for `staff`, `school`, `academics`

### Phase 3 — Event-driven decoupling (higher risk)
7. Replace synchronous cross-module calls with domain events via `core/events/EventBus`
8. Example: finance payment → `eventBus.publish("finance.payment.recorded", { studentId, amount })`
9. Move `createLog` usage to `eventBus.publish("audit.log", event)` handled by `audit` module

### Phase 4 — Module extraction readiness
10. Each module should only import from: its own files, `@shared/*`, `@core/*`, `@infrastructure/*`
11. Verify with a CI lint rule: `no-restricted-imports` for `../../[other-module]` patterns
12. At this point each module can be extracted to a microservice with minimal import changes
