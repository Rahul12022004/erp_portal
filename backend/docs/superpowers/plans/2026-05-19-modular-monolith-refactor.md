# Modular Monolith Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the ERP portal backend and frontend from flat technical-layer folders into a module-based ("modular monolith") architecture organized by business domain, with Finance as the reference example.

**Architecture:** Backend: `backend/src/core/` (config, middleware, utils) + `backend/src/modules/<domain>/` (models, routes, services, utils per domain). Frontend: keep `src/components/ui/` and `src/layouts/` in place; add `src/modules/finance/` as the reference domain module with api/, components/, hooks/, types/ sub-folders. A new developer should answer "where is Finance?" in under 10 seconds.

**Tech Stack:** Node 18 + Express 4 + TypeScript + Mongoose + MongoDB (backend); Vite 5 + React 18 + TypeScript + Tailwind + shadcn/ui + React Router 6 (frontend).

---

## Current State Snapshot

```
backend/src/
  config/   db.ts, env.ts
  middleware/  auth.ts
  models/   ~35 files — ALL domains mixed (Finance, Student, Staff, Transport…)
  routes/   ~30 files — ALL domains mixed
  services/ financeService.ts, salaryStructureService.ts, fakeProvider.ts, triggerEngine.ts
  utils/    createLog.ts, feeStructure.ts, classFeeStructure.ts, financeImportAi.ts,
            loginThrottle.ts, sendEmail.ts, jwt.ts
  seeds/    financeSeeds.ts
  server.ts imports 30+ routes — one giant file

src/
  components/finance/  14 finance components  ← already domain-grouped!
  components/ui/       shadcn primitives
  pages/school-admin/modules/FinanceModule.tsx  ← 312KB monolith
  services/financeIntegration.ts  ← API client
  services/pages/      DEAD CODE — mirrors src/pages/, not imported anywhere
  services/academics/  types.ts + 4 service files  ← good pattern to replicate
```

## Pain Points
1. `models/` has Student, Finance, Transport, Library, Staff all mixed — no domain signal.
2. `routes/` same problem — 30 unrelated files side by side.
3. `server.ts` imports 30 routes; every new domain adds noise to shared bootstrap.
4. `src/services/pages/` is a ghost directory — same files as `src/pages/`, never imported.
5. Finance API client (`financeIntegration.ts`) lives in a generic `services/` folder with no domain context.
6. Finance frontend components are in `src/components/finance/` (good) but types are scattered inside `FinanceModule.tsx`.

## Domain List (Backend Modules)
| Module       | Models (key)                                    | Routes                          |
|-------------|------------------------------------------------|---------------------------------|
| finance     | ClassFeeStructure, StudentFeeAssignment,        | financeRoutes, expenseRoutes,   |
|             | StudentFeePayment, Finance, Expense,           | bankingRoutes, salaryStructure  |
|             | InvestorLedger, BudgetMonitor, Vendor,         |                                 |
|             | SalaryRole, SalaryStructure, ExpenseCategory   |                                 |
| students    | Student                                         | studentRoutes                   |
| academics   | Class, Assignment, AssignmentSubmission,        | classRoutes, assignmentRoutes,  |
|             | Subject, StudyMaterial, Mark, Exam, Attendance | subjectRoutes, materialRoutes,  |
|             |                                                | markRoutes, examRoutes,         |
|             |                                                | attendanceRoutes                |
| staff       | Staff, TeacherRoleAssignment                   | staffRoutes, teacherRoleRoutes  |
| communication | Announcement, Campaign, CampaignLog,         | announcementRoutes,             |
|             | CommunicationTrigger, MessageTemplate          | communicationRoutes             |
| transport   | Transport                                       | transportRoutes                 |
| library     | LibraryBook, LibraryAssignment                 | libraryRoutes                   |
| hostel      | Hostel                                          | hostelRoutes                    |
| hr          | LeaveApplication                               | leaveRoutes                     |
| maintenance | Maintenance                                     | maintenanceRoutes               |
| school      | School                                          | schoolRoutes                    |
| inventory   | InventoryItem                                  | inventoryRoutes                 |
| social      | SocialMedia                                     | socialMediaRoutes               |
| visitor     | Visitor                                         | visitorRoutes                   |
| data-import | DataImportBatch                                | dataImportRoutes                |
| survey      | Survey                                          | surveyRoutes                    |
| logs        | Logs                                            | logRoutes                       |
| dashboard   | —                                               | dashboardRoutes                 |
| ai          | —                                               | aiRoutes                        |

## Target Architecture

```
backend/src/
  core/
    config/    db.ts, env.ts
    middleware/ auth.ts
    utils/     createLog.ts, jwt.ts, sendEmail.ts, loginThrottle.ts
    types/     express.d.ts (augmented Request type)
  modules/
    finance/
      models/   ClassFeeStructure.ts, StudentFeeAssignment.ts, StudentFeePayment.ts,
                Finance.ts, InvestorLedger.ts, BudgetMonitor.ts, Expense.ts,
                ExpenseCategory.ts, ExpenseApprovalConfig.ts, ExpenseAuditLog.ts,
                Vendor.ts, SalaryRole.ts, SalaryStructure.ts
      routes/   financeRoutes.ts, expenseRoutes.ts, bankingRoutes.ts,
                salaryStructureRoutes.ts
      services/ financeService.ts, salaryStructureService.ts
      utils/    feeStructure.ts, classFeeStructure.ts, financeImportAi.ts
      seeds/    financeSeeds.ts
    students/
      models/   Student.ts
      routes/   studentRoutes.ts
    academics/
      models/   Class.ts, Assignment.ts, AssignmentSubmission.ts, Subject.ts,
                StudyMaterial.ts, Mark.ts, Exam.ts, Attendance.ts
      routes/   classRoutes.ts, assignmentRoutes.ts, subjectRoutes.ts,
                materialRoutes.ts, markRoutes.ts, examRoutes.ts, attendanceRoutes.ts
    staff/
      models/   Staff.ts, TeacherRoleAssignment.ts
      routes/   staffRoutes.ts, teacherRoleRoutes.ts
    communication/
      models/   Announcement.ts, Campaign.ts, CampaignLog.ts,
                CommunicationTrigger.ts, MessageTemplate.ts
      routes/   announcementRoutes.ts, communicationRoutes.ts
      services/ fakeProvider.ts, triggerEngine.ts
    transport/
      models/   Transport.ts
      routes/   transportRoutes.ts
    library/
      models/   LibraryBook.ts, LibraryAssignment.ts
      routes/   libraryRoutes.ts
    hostel/
      models/   Hostel.ts
      routes/   hostelRoutes.ts
    hr/
      models/   LeaveApplication.ts
      routes/   leaveRoutes.ts
    maintenance/
      models/   Maintenance.ts
      routes/   maintenanceRoutes.ts
    school/
      models/   School.ts
      routes/   schoolRoutes.ts
    inventory/
      models/   InventoryItem.ts
      routes/   inventoryRoutes.ts
    social/
      models/   SocialMedia.ts
      routes/   socialMediaRoutes.ts
    visitor/
      models/   Visitor.ts
      routes/   visitorRoutes.ts
    data-import/
      models/   DataImportBatch.ts
      routes/   dataImportRoutes.ts
    survey/
      models/   Survey.ts
      routes/   surveyRoutes.ts
    logs/
      models/   Logs.ts
      routes/   logRoutes.ts
    dashboard/
      routes/   dashboardRoutes.ts
    ai/
      routes/   aiRoutes.ts
  app.ts    ← NEW: Express app factory (middleware + route wiring)
  server.ts  ← TRIMMED: only startServer() + DB init

src/
  modules/
    finance/
      api/        financeClient.ts        (was src/services/financeIntegration.ts)
      components/ ← moved from src/components/finance/
        SchoolFinanceDashboard.tsx
        ExpenseModule.tsx
        BankingModule.tsx
        AssetManagementModule.tsx
        FinanceDashboard.tsx
        FeeStructureDistributionChart.tsx
        ExpenseDashboard.tsx
        AddExpenseForm.tsx
        ExpenseList.tsx
        VendorManagement.tsx
        ExpenseCategoryManagement.tsx
        ExpenseApprovalWorkflow.tsx
        ExpenseAuditLog.tsx
        ExpenseReports.tsx
        BudgetMonitoring.tsx
      hooks/
        useClassFeeStructures.ts
        useStudentAssignments.ts
        useRecordPayment.ts
      types/
        finance.ts                        (extracted from FinanceModule.tsx)
      FinanceModule.tsx                   (was src/pages/school-admin/modules/FinanceModule.tsx)
  components/ui/    UNCHANGED (shadcn — too many cross-codebase imports to move)
  components/       UNCHANGED except finance/ sub-folder emptied
  layouts/          UNCHANGED
  hooks/            UNCHANGED
  lib/              UNCHANGED
  pages/school-admin/modules/FinanceModule.tsx  → re-export shim (1 line)
```

## File Move Map (Old → New)

### Backend Core
| Old | New |
|-----|-----|
| `backend/src/config/db.ts` | `backend/src/core/config/db.ts` |
| `backend/src/config/env.ts` | `backend/src/core/config/env.ts` |
| `backend/src/middleware/auth.ts` | `backend/src/core/middleware/auth.ts` |
| `backend/src/utils/createLog.ts` | `backend/src/core/utils/createLog.ts` |
| `backend/src/utils/jwt.ts` | `backend/src/core/utils/jwt.ts` |
| `backend/src/utils/sendEmail.ts` | `backend/src/core/utils/sendEmail.ts` |
| `backend/src/utils/loginThrottle.ts` | `backend/src/core/utils/loginThrottle.ts` |

### Backend Finance Module
| Old | New |
|-----|-----|
| `backend/src/models/ClassFeeStructure.ts` | `backend/src/modules/finance/models/ClassFeeStructure.ts` |
| `backend/src/models/StudentFeeAssignment.ts` | `backend/src/modules/finance/models/StudentFeeAssignment.ts` |
| `backend/src/models/StudentFeePayment.ts` | `backend/src/modules/finance/models/StudentFeePayment.ts` |
| `backend/src/models/Finance.ts` | `backend/src/modules/finance/models/Finance.ts` |
| `backend/src/models/InvestorLedger.ts` | `backend/src/modules/finance/models/InvestorLedger.ts` |
| `backend/src/models/BudgetMonitor.ts` | `backend/src/modules/finance/models/BudgetMonitor.ts` |
| `backend/src/models/Expense.ts` | `backend/src/modules/finance/models/Expense.ts` |
| `backend/src/models/ExpenseCategory.ts` | `backend/src/modules/finance/models/ExpenseCategory.ts` |
| `backend/src/models/ExpenseApprovalConfig.ts` | `backend/src/modules/finance/models/ExpenseApprovalConfig.ts` |
| `backend/src/models/ExpenseAuditLog.ts` | `backend/src/modules/finance/models/ExpenseAuditLog.ts` |
| `backend/src/models/Vendor.ts` | `backend/src/modules/finance/models/Vendor.ts` |
| `backend/src/models/SalaryRole.ts` | `backend/src/modules/finance/models/SalaryRole.ts` |
| `backend/src/models/SalaryStructure.ts` | `backend/src/modules/finance/models/SalaryStructure.ts` |
| `backend/src/routes/financeRoutes.ts` | `backend/src/modules/finance/routes/financeRoutes.ts` |
| `backend/src/routes/expenseRoutes.ts` | `backend/src/modules/finance/routes/expenseRoutes.ts` |
| `backend/src/routes/bankingRoutes.ts` | `backend/src/modules/finance/routes/bankingRoutes.ts` |
| `backend/src/routes/salaryStructureRoutes.ts` | `backend/src/modules/finance/routes/salaryStructureRoutes.ts` |
| `backend/src/services/financeService.ts` | `backend/src/modules/finance/services/financeService.ts` |
| `backend/src/services/salaryStructureService.ts` | `backend/src/modules/finance/services/salaryStructureService.ts` |
| `backend/src/utils/feeStructure.ts` | `backend/src/modules/finance/utils/feeStructure.ts` |
| `backend/src/utils/classFeeStructure.ts` | `backend/src/modules/finance/utils/classFeeStructure.ts` |
| `backend/src/utils/financeImportAi.ts` | `backend/src/modules/finance/utils/financeImportAi.ts` |
| `backend/src/seeds/financeSeeds.ts` | `backend/src/modules/finance/seeds/financeSeeds.ts` |

### Frontend Finance Module
| Old | New |
|-----|-----|
| `src/pages/school-admin/modules/FinanceModule.tsx` | `src/modules/finance/FinanceModule.tsx` |
| `src/services/financeIntegration.ts` | `src/modules/finance/api/financeClient.ts` |
| `src/components/finance/*.tsx` (14 files) | `src/modules/finance/components/*.tsx` |

---

## Task 1: Backend — Create `core/` Structure

**Files:**
- Create: `backend/src/core/config/db.ts`
- Create: `backend/src/core/config/env.ts`
- Create: `backend/src/core/middleware/auth.ts`
- Create: `backend/src/core/utils/createLog.ts`
- Create: `backend/src/core/utils/jwt.ts`
- Create: `backend/src/core/utils/sendEmail.ts`
- Create: `backend/src/core/utils/loginThrottle.ts`
- Delete: `backend/src/config/` (after moving)
- Delete: `backend/src/middleware/` (after moving)
- Delete original `backend/src/utils/` files (shared ones only; finance-specific ones stay until Task 3)

- [ ] **Step 1.1: Create core directory scaffold**

```bash
cd backend
mkdir -p src/core/config src/core/middleware src/core/utils
```

- [ ] **Step 1.2: Move `config/db.ts` to `core/config/db.ts`**

Copy `backend/src/config/db.ts` content to `backend/src/core/config/db.ts` **unchanged** (no logic changes, just new location).

- [ ] **Step 1.3: Move `config/env.ts` to `core/config/env.ts`**

Copy `backend/src/config/env.ts` content to `backend/src/core/config/env.ts` **unchanged**.

- [ ] **Step 1.4: Move `middleware/auth.ts` to `core/middleware/auth.ts`**

Copy `backend/src/middleware/auth.ts` to `backend/src/core/middleware/auth.ts`.
Update the one internal import: `"../utils/jwt"` → `"../utils/jwt"` (same relative level, no change needed).

Actually `auth.ts` imports `../utils/jwt`. After moving to `core/middleware/auth.ts`, the jwt is at `../utils/jwt` — same relative path. No change needed.

- [ ] **Step 1.5: Move shared utils to `core/utils/`**

Move these 4 files (copy content, delete originals):
- `backend/src/utils/createLog.ts` → `backend/src/core/utils/createLog.ts`
- `backend/src/utils/jwt.ts` → `backend/src/core/utils/jwt.ts`
- `backend/src/utils/sendEmail.ts` → `backend/src/core/utils/sendEmail.ts`
- `backend/src/utils/loginThrottle.ts` → `backend/src/core/utils/loginThrottle.ts`

Leave `feeStructure.ts`, `classFeeStructure.ts`, `financeImportAi.ts` in the old location for now — Task 3 handles those.

- [ ] **Step 1.6: Delete old config/, middleware/, and moved utils files**

```bash
# Only delete files that have been moved
rm backend/src/config/db.ts
rm backend/src/config/env.ts
rmdir backend/src/config
rm backend/src/middleware/auth.ts
rmdir backend/src/middleware
rm backend/src/utils/createLog.ts
rm backend/src/utils/jwt.ts
rm backend/src/utils/sendEmail.ts
rm backend/src/utils/loginThrottle.ts
```

- [ ] **Step 1.7: Update `server.ts` imports for core files**

In `backend/src/server.ts`, change:
```typescript
// OLD
import connectDB, { getDatabaseStatus } from "./config/db";
import { loadEnvironment } from "./config/env";
import { authenticateToken } from "./middleware/auth";
import { seedDatabase } from "./seed";

// NEW
import connectDB, { getDatabaseStatus } from "./core/config/db";
import { loadEnvironment } from "./core/config/env";
import { authenticateToken } from "./core/middleware/auth";
import { seedDatabase } from "./seed";
```

- [ ] **Step 1.8: Update all route files that import from `../utils/`**

Each route file that imports `createLog`, `jwt`, `sendEmail`, or `loginThrottle` needs its import updated. Run a grep to find all affected files:

```bash
grep -rl "from.*['\"]\.\.\/utils\/(createLog|jwt|sendEmail|loginThrottle)" backend/src/routes/
grep -rl "from.*['\"]\.\.\/utils\/(createLog|jwt|sendEmail|loginThrottle)" backend/src/services/
```

For each file found, update import paths:
- `"../utils/createLog"` → `"../core/utils/createLog"` (for files in `routes/` that import from `../utils/`)

Wait — routes are at `backend/src/routes/` and core is at `backend/src/core/`. So from a route file, the path is `"../core/utils/createLog"`. Update each found file accordingly.

- [ ] **Step 1.9: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: 0 errors. If errors appear, they will name the exact file and line — fix import paths accordingly.

- [ ] **Step 1.10: Commit**

```bash
git add backend/src/core/ backend/src/server.ts backend/src/routes/
git commit -m "refactor(backend): extract shared infrastructure to core/"
```

---

## Task 2: Backend — Finance Module Scaffold + Move Models

**Files:**
- Create: `backend/src/modules/finance/models/` (13 model files)
- Delete: corresponding files from `backend/src/models/`

- [ ] **Step 2.1: Create finance module directory scaffold**

```bash
mkdir -p backend/src/modules/finance/models \
         backend/src/modules/finance/routes \
         backend/src/modules/finance/services \
         backend/src/modules/finance/utils \
         backend/src/modules/finance/seeds
```

- [ ] **Step 2.2: Move finance models (copy + delete)**

Move these 13 files from `backend/src/models/` to `backend/src/modules/finance/models/`:
```
ClassFeeStructure.ts
StudentFeeAssignment.ts
StudentFeePayment.ts
Finance.ts
InvestorLedger.ts
BudgetMonitor.ts
Expense.ts
ExpenseCategory.ts
ExpenseApprovalConfig.ts
ExpenseAuditLog.ts
Vendor.ts
SalaryRole.ts
SalaryStructure.ts
```

These model files are self-contained Mongoose schemas. They only import from `mongoose` (external). No internal import changes needed when moving.

```bash
for f in ClassFeeStructure StudentFeeAssignment StudentFeePayment Finance \
          InvestorLedger BudgetMonitor Expense ExpenseCategory \
          ExpenseApprovalConfig ExpenseAuditLog Vendor SalaryRole SalaryStructure; do
  cp backend/src/models/${f}.ts backend/src/modules/finance/models/${f}.ts
  rm backend/src/models/${f}.ts
done
```

- [ ] **Step 2.3: Update financeRoutes.ts import paths (still in old location)**

`backend/src/routes/financeRoutes.ts` currently imports models from `"../models/..."`. Update the finance-owned model imports to the new location. The file imports from both finance models AND cross-domain models (Student, Class, Staff). Cross-domain models (Student, Class, Staff) will stay in `backend/src/models/` for now:

```typescript
// In backend/src/routes/financeRoutes.ts — update these lines:

// Finance-owned models → new path
import ClassFeeStructure from "../modules/finance/models/ClassFeeStructure";
import StudentFeeAssignment from "../modules/finance/models/StudentFeeAssignment";
import StudentFeePayment from "../modules/finance/models/StudentFeePayment";
import Finance from "../modules/finance/models/Finance";
import SalaryRole from "../modules/finance/models/SalaryRole";
import InvestorLedger from "../modules/finance/models/InvestorLedger";

// Cross-domain models → still in old location (will update when those modules move)
import Student from "../models/Student";   // unchanged for now
import Class from "../models/Class";       // unchanged for now
import Staff from "../models/Staff";       // unchanged for now
```

Also update service import:
```typescript
// OLD
import { financeService } from "../services/financeService";
// NEW (service not yet moved; stays put until Task 3)
// No change yet — financeService.ts still in backend/src/services/
```

- [ ] **Step 2.4: Update expenseRoutes.ts, bankingRoutes.ts, salaryStructureRoutes.ts**

Each of these imports finance models from `"../models/"`. Update to `"../modules/finance/models/"`:

For `backend/src/routes/expenseRoutes.ts`, find lines like:
```typescript
import Expense from "../models/Expense";
import ExpenseCategory from "../models/ExpenseCategory";
import ExpenseApprovalConfig from "../models/ExpenseApprovalConfig";
import ExpenseAuditLog from "../models/ExpenseAuditLog";
import Vendor from "../models/Vendor";
```
Change to:
```typescript
import Expense from "../modules/finance/models/Expense";
import ExpenseCategory from "../modules/finance/models/ExpenseCategory";
import ExpenseApprovalConfig from "../modules/finance/models/ExpenseApprovalConfig";
import ExpenseAuditLog from "../modules/finance/models/ExpenseAuditLog";
import Vendor from "../modules/finance/models/Vendor";
```

For `backend/src/routes/bankingRoutes.ts` — check what models it imports and update any from the moved list.

For `backend/src/routes/salaryStructureRoutes.ts`:
```typescript
import SalaryRole from "../models/SalaryRole";     // → ../modules/finance/models/SalaryRole
import SalaryStructure from "../models/SalaryStructure"; // → ../modules/finance/models/SalaryStructure
```

- [ ] **Step 2.5: Update financeService.ts imports (still in old location)**

`backend/src/services/financeService.ts` imports:
```typescript
import ClassFeeStructure from "../models/ClassFeeStructure";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";
import Student from "../models/Student";
import Class from "../models/Class";
```
Update finance-owned models (Student and Class stay in old location for now):
```typescript
import ClassFeeStructure from "../modules/finance/models/ClassFeeStructure";
import StudentFeeAssignment from "../modules/finance/models/StudentFeeAssignment";
import StudentFeePayment from "../modules/finance/models/StudentFeePayment";
import Student from "../models/Student";   // unchanged for now
import Class from "../models/Class";       // unchanged for now
```

- [ ] **Step 2.6: Update seed.ts if it references finance models**

```bash
grep -n "models/" backend/src/seed.ts
```
For any finance model import found, update path to `./modules/finance/models/`.

- [ ] **Step 2.7: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: 0 errors. Fix any import paths that are flagged.

- [ ] **Step 2.8: Commit**

```bash
git add backend/src/modules/finance/models/ backend/src/routes/ backend/src/services/ backend/src/seed.ts
git commit -m "refactor(backend): move finance models to modules/finance/models/"
```

---

## Task 3: Backend — Finance Module Routes, Services, Utils, Seeds

**Files:**
- Move: `backend/src/routes/financeRoutes.ts` → `backend/src/modules/finance/routes/financeRoutes.ts`
- Move: `backend/src/routes/expenseRoutes.ts` → `backend/src/modules/finance/routes/expenseRoutes.ts`
- Move: `backend/src/routes/bankingRoutes.ts` → `backend/src/modules/finance/routes/bankingRoutes.ts`
- Move: `backend/src/routes/salaryStructureRoutes.ts` → `backend/src/modules/finance/routes/salaryStructureRoutes.ts`
- Move: `backend/src/services/financeService.ts` → `backend/src/modules/finance/services/financeService.ts`
- Move: `backend/src/services/salaryStructureService.ts` → `backend/src/modules/finance/services/salaryStructureService.ts`
- Move: `backend/src/utils/feeStructure.ts` → `backend/src/modules/finance/utils/feeStructure.ts`
- Move: `backend/src/utils/classFeeStructure.ts` → `backend/src/modules/finance/utils/classFeeStructure.ts`
- Move: `backend/src/utils/financeImportAi.ts` → `backend/src/modules/finance/utils/financeImportAi.ts`
- Move: `backend/src/seeds/financeSeeds.ts` → `backend/src/modules/finance/seeds/financeSeeds.ts`

- [ ] **Step 3.1: Move finance routes to `modules/finance/routes/`**

```bash
cp backend/src/routes/financeRoutes.ts backend/src/modules/finance/routes/financeRoutes.ts
cp backend/src/routes/expenseRoutes.ts backend/src/modules/finance/routes/expenseRoutes.ts
cp backend/src/routes/bankingRoutes.ts backend/src/modules/finance/routes/bankingRoutes.ts
cp backend/src/routes/salaryStructureRoutes.ts backend/src/modules/finance/routes/salaryStructureRoutes.ts
rm backend/src/routes/financeRoutes.ts
rm backend/src/routes/expenseRoutes.ts
rm backend/src/routes/bankingRoutes.ts
rm backend/src/routes/salaryStructureRoutes.ts
```

- [ ] **Step 3.2: Update imports inside the newly moved route files**

After moving to `modules/finance/routes/`, all relative paths shift by 2 levels.

For `backend/src/modules/finance/routes/financeRoutes.ts`:
```typescript
// Models (same module, now siblings)
import ClassFeeStructure from "../models/ClassFeeStructure";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";
import Finance from "../models/Finance";
import SalaryRole from "../models/SalaryRole";
import InvestorLedger from "../models/InvestorLedger";

// Service (same module)
import { financeService } from "../services/financeService";

// Cross-domain models (still in old flat location)
import Student from "../../../models/Student";
import Class from "../../../models/Class";
import Staff from "../../../models/Staff";

// Core utils (now in core/)
import { createLog } from "../../../core/utils/createLog";
import { sendStudentFeeReceiptEmail } from "../../../core/utils/sendEmail";
```

Apply the same logic to expenseRoutes.ts, bankingRoutes.ts, salaryStructureRoutes.ts — update relative paths to `../models/` for finance-owned models and `../../../models/` for cross-domain models.

- [ ] **Step 3.3: Move finance services and update imports**

```bash
cp backend/src/services/financeService.ts backend/src/modules/finance/services/financeService.ts
cp backend/src/services/salaryStructureService.ts backend/src/modules/finance/services/salaryStructureService.ts
rm backend/src/services/financeService.ts
rm backend/src/services/salaryStructureService.ts
```

Update `backend/src/modules/finance/services/financeService.ts` imports:
```typescript
// Finance-owned models → sibling models/
import ClassFeeStructure from "../models/ClassFeeStructure";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";

// Cross-domain models → still flat
import Student from "../../../models/Student";
import Class from "../../../models/Class";
```

- [ ] **Step 3.4: Move finance utils**

```bash
cp backend/src/utils/feeStructure.ts backend/src/modules/finance/utils/feeStructure.ts
cp backend/src/utils/classFeeStructure.ts backend/src/modules/finance/utils/classFeeStructure.ts
cp backend/src/utils/financeImportAi.ts backend/src/modules/finance/utils/financeImportAi.ts
rm backend/src/utils/feeStructure.ts
rm backend/src/utils/classFeeStructure.ts
rm backend/src/utils/financeImportAi.ts
```

Update imports inside each moved util file to use correct relative paths for any models or other utils they reference.

- [ ] **Step 3.5: Move finance seed**

```bash
cp backend/src/seeds/financeSeeds.ts backend/src/modules/finance/seeds/financeSeeds.ts
rm backend/src/seeds/financeSeeds.ts
```

Update imports inside `financeSeeds.ts` to point to `../models/` for finance models, `../../../models/` for cross-domain models, `../../../core/utils/` for core utils.

Check if seed.ts (root) imports financeSeeds.ts and update that import:
```bash
grep -n "financeSeeds" backend/src/seed.ts
```
If found, change `"./seeds/financeSeeds"` → `"./modules/finance/seeds/financeSeeds"`.

- [ ] **Step 3.6: Update `server.ts` — finance route imports**

In `backend/src/server.ts`, update the 4 finance route imports:
```typescript
// OLD
import financeRoutes from "./routes/financeRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import bankingRoutes from "./routes/bankingRoutes";
import salaryStructureRoutes from "./routes/salaryStructureRoutes";

// NEW
import financeRoutes from "./modules/finance/routes/financeRoutes";
import expenseRoutes from "./modules/finance/routes/expenseRoutes";
import bankingRoutes from "./modules/finance/routes/bankingRoutes";
import salaryStructureRoutes from "./modules/finance/routes/salaryStructureRoutes";
```

The `/api/finance`, `/api/expenses`, `/api/banking`, `/api/salary-structures` route registrations in server.ts stay **exactly the same** — only the import path changes.

- [ ] **Step 3.7: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 3.8: Smoke-test finance endpoints (if backend can run)**

```bash
# Start backend in another terminal: cd backend && npm run dev
curl http://localhost:5000/api/health
# Expected: { "ok": true, "dbConnected": true }
```

- [ ] **Step 3.9: Commit**

```bash
git add backend/src/modules/finance/ backend/src/routes/ backend/src/services/ backend/src/utils/ backend/src/seeds/ backend/src/server.ts backend/src/seed.ts
git commit -m "refactor(backend): move finance routes/services/utils/seeds to modules/finance/"
```

---

## Task 4: Backend — Extract `app.ts` from `server.ts`

**Files:**
- Create: `backend/src/app.ts`
- Modify: `backend/src/server.ts`

**Why:** `server.ts` currently does two things — wires the Express app AND starts the HTTP server. Splitting lets tests import the app without starting the server.

- [ ] **Step 4.1: Create `backend/src/app.ts`**

Extract everything except `startServer()` from `server.ts` into `app.ts`:

```typescript
// backend/src/app.ts
import express from "express";
import cors from "cors";
import { getDatabaseStatus } from "./core/config/db";

// ROUTES — core
import schoolRoutes from "./modules/school/routes/schoolRoutes";
import logRoutes from "./modules/logs/routes/logRoutes";
import dashboardRoutes from "./modules/dashboard/routes/dashboardRoutes";

// ROUTES — finance (already in modules/)
import financeRoutes from "./modules/finance/routes/financeRoutes";
import expenseRoutes from "./modules/finance/routes/expenseRoutes";
import bankingRoutes from "./modules/finance/routes/bankingRoutes";
import salaryStructureRoutes from "./modules/finance/routes/salaryStructureRoutes";

// ROUTES — other modules (still in routes/ for now, update as tasks complete)
import announcementRoutes from "./routes/announcementRoutes";
// ... (all remaining route imports)

import { authenticateToken } from "./core/middleware/auth";

const defaultAllowedOrigins = [
  "https://erp-portal-seven.vercel.app",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
];

const envAllowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

function isLocalDevOrigin(origin: string) {
  try {
    const { protocol, hostname } = new URL(origin);
    return (protocol === "http:" || protocol === "https:") &&
      (hostname === "localhost" || hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/schools", schoolRoutes);
app.use("/api/logs", authenticateToken, logRoutes);
app.use("/api/finance", authenticateToken, financeRoutes);
app.use("/api/expenses", authenticateToken, expenseRoutes);
app.use("/api/banking", authenticateToken, bankingRoutes);
app.use("/api/salary-structures", authenticateToken, salaryStructureRoutes);
// ... all other routes

app.get("/api/health", (req, res) => {
  const db = getDatabaseStatus();
  res.json({
    ok: true,
    dbConnected: db.connected,
    dbReadyState: db.readyState,
    dbLastError: db.lastError,
    superAdminConfigured: Boolean(process.env.SUPER_ADMIN_EMAIL?.trim()) && Boolean(process.env.SUPER_ADMIN_PASSWORD?.trim()),
  });
});

app.get("/", (_req, res) => res.send("API Running"));

type PayloadTooLargeError = { type?: string };
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((error as PayloadTooLargeError | null)?.type === "entity.too.large") {
    return res.status(413).json({ message: "Uploaded file is too large." });
  }
  return next(error);
});

export default app;
```

- [ ] **Step 4.2: Trim `backend/src/server.ts` to boot only**

```typescript
// backend/src/server.ts
import { loadEnvironment } from "./core/config/env";
import connectDB from "./core/config/db";
import app from "./app";
import { seedDatabase } from "./seed";

loadEnvironment();

const PORT = process.env.PORT || 5000;
const shouldSeedLocalData = process.env.SEED_LOCAL_DATA === "true";

async function startServer() {
  try {
    await connectDB();
    if (shouldSeedLocalData) {
      seedDatabase(false).catch((err) => console.error("Local seed failed:", err));
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Server startup failed: ${message}`);
    process.exit(1);
  }
}

void startServer();
```

- [ ] **Step 4.3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 4.4: Commit**

```bash
git add backend/src/app.ts backend/src/server.ts
git commit -m "refactor(backend): extract Express app wiring into app.ts"
```

---

## Task 5: Backend — Move Remaining Modules

**Files:** Create module folders and move models + routes for every non-finance domain. This is the bulk-move task; done domain by domain with compile checks.

- [ ] **Step 5.1: Create remaining module directory scaffolds**

```bash
for module in students academics staff communication transport library \
              hostel hr maintenance school inventory social visitor \
              data-import survey logs dashboard ai; do
  mkdir -p backend/src/modules/${module}/models
  mkdir -p backend/src/modules/${module}/routes
done
mkdir -p backend/src/modules/communication/services
```

- [ ] **Step 5.2: Move students module**

```bash
cp backend/src/models/Student.ts backend/src/modules/students/models/Student.ts
rm backend/src/models/Student.ts
cp backend/src/routes/studentRoutes.ts backend/src/modules/students/routes/studentRoutes.ts
rm backend/src/routes/studentRoutes.ts
```

Update `studentRoutes.ts` imports: `"../models/Student"` → `"../models/Student"` (same relative level, no change if in same module). Update cross-domain imports and core utils to correct paths.

Update `app.ts`:
```typescript
// OLD
import studentRoutes from "./routes/studentRoutes";
// NEW
import studentRoutes from "./modules/students/routes/studentRoutes";
```

Also update finance files that import Student (financeRoutes.ts, financeService.ts):
```typescript
// OLD (temporary path from Task 3)
import Student from "../../../models/Student";
// NEW
import Student from "../../students/models/Student";
```

Compile check: `cd backend && npx tsc --noEmit`

Commit: `git commit -m "refactor(backend): move students module"`

- [ ] **Step 5.3: Move academics module**

Move models: Class.ts, Assignment.ts, AssignmentSubmission.ts, Subject.ts, StudyMaterial.ts, Mark.ts, Exam.ts, Attendance.ts → `modules/academics/models/`

Move routes: classRoutes.ts, assignmentRoutes.ts, subjectRoutes.ts, materialRoutes.ts, markRoutes.ts, examRoutes.ts, attendanceRoutes.ts → `modules/academics/routes/`

Update imports in all moved route files (each imports `"../models/..."` → `"../models/..."` within same module; cross-domain refs need full path).

Update finance files that import Class:
```typescript
// OLD (temporary path from Task 3)
import Class from "../../../models/Class";
// NEW
import Class from "../../academics/models/Class";
```

Update `app.ts` route imports for all 7 academic routes.

Compile check + commit: `git commit -m "refactor(backend): move academics module"`

- [ ] **Step 5.4: Move staff module**

Models: Staff.ts, TeacherRoleAssignment.ts → `modules/staff/models/`
Routes: staffRoutes.ts, teacherRoleRoutes.ts → `modules/staff/routes/`

Update finance route imports for Staff:
```typescript
import Staff from "../../staff/models/Staff";
```

Update `app.ts`. Compile check + commit: `git commit -m "refactor(backend): move staff module"`

- [ ] **Step 5.5: Move communication module**

Models: Announcement.ts, Campaign.ts, CampaignLog.ts, CommunicationTrigger.ts, MessageTemplate.ts → `modules/communication/models/`
Routes: announcementRoutes.ts, communicationRoutes.ts → `modules/communication/routes/`
Services: fakeProvider.ts, triggerEngine.ts → `modules/communication/services/`

Update `app.ts`. Compile check + commit: `git commit -m "refactor(backend): move communication module"`

- [ ] **Step 5.6: Move all remaining modules (transport, library, hostel, hr, maintenance, school, inventory, social, visitor, data-import, survey, logs, dashboard, ai)**

For each remaining module, apply the same pattern:
1. Copy models to `modules/<domain>/models/`
2. Copy routes to `modules/<domain>/routes/`
3. Remove originals
4. Update intra-file relative imports
5. Update `app.ts` route imports
6. Compile check after each batch

Group small modules together:
```bash
# Transport
cp backend/src/models/Transport.ts backend/src/modules/transport/models/
cp backend/src/routes/transportRoutes.ts backend/src/modules/transport/routes/
rm backend/src/models/Transport.ts backend/src/routes/transportRoutes.ts

# Library
cp backend/src/models/LibraryBook.ts backend/src/modules/library/models/
cp backend/src/models/LibraryAssignment.ts backend/src/modules/library/models/
cp backend/src/routes/libraryRoutes.ts backend/src/modules/library/routes/
rm backend/src/models/LibraryBook.ts backend/src/models/LibraryAssignment.ts
rm backend/src/routes/libraryRoutes.ts

# ... repeat for all remaining modules
```

After all moves, `backend/src/models/` and `backend/src/routes/` should be empty (or near-empty). Remove the directories.

- [ ] **Step 5.7: Final compile check — verify full backend**

```bash
cd backend && npx tsc --noEmit
# Expected: 0 errors

# Start and smoke-test:
npm run dev &
sleep 3
curl http://localhost:5000/api/health
# Expected: {"ok":true,"dbConnected":true,...}
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/finance/class-fee-structures?schoolId=<id>
# Expected: {"data":[...]} with same shape as before refactor
```

- [ ] **Step 5.8: Commit**

```bash
git add backend/src/modules/ backend/src/app.ts
git commit -m "refactor(backend): move all remaining domain modules to modules/"
```

---

## Task 6: Frontend — Finance Module Scaffold + Types + API Client

**Files:**
- Create: `src/modules/finance/` directory tree
- Create: `src/modules/finance/types/finance.ts`
- Create: `src/modules/finance/api/financeClient.ts` (content from `src/services/financeIntegration.ts`)

- [ ] **Step 6.1: Create finance module directory scaffold**

```bash
mkdir -p src/modules/finance/api
mkdir -p src/modules/finance/components
mkdir -p src/modules/finance/hooks
mkdir -p src/modules/finance/types
```

- [ ] **Step 6.2: Create `src/modules/finance/types/finance.ts`**

Extract the TypeScript types that are defined in `src/pages/school-admin/modules/FinanceModule.tsx` (lines 14–103 visible from read). Create a standalone types file:

```typescript
// src/modules/finance/types/finance.ts

export type PaymentMode = "cash" | "upi" | "card" | "cheque" | "bank_transfer";

export type FeeStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";

export type TransportStatus = "ACTIVE" | "INACTIVE" | "NO_TRANSPORT";

export type ClassFeeStructure = {
  _id?: string;
  classId?: string;
  className: string;
  section?: string | null;
  academicYear?: string;
  academicFee?: number;
  defaultTransportFee?: number;
  otherFee?: number;
  dueDate?: string;
  isActive?: boolean;
  assignedStudentsCount?: number;
  totalAssignedStudents?: number;
  lateFeeType?: "none" | "fixed" | "daily" | "percentage";
  lateFeeAmount?: number;
  lateFeeGraceDays?: number;
};

export type StudentFeeAssignment = {
  _id: string;
  studentId: string;
  studentName: string;
  rollNumber?: string;
  registrationNo?: string;
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  feeStatus: FeeStatus;
  feeBreakdown: {
    academicFee: number;
    transportFee: number;
    otherFee: number;
  };
};

export type StudentFeePayment = {
  _id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  referenceNo?: string;
  remarks?: string;
};

export type ClassSummary = {
  classId: string;
  className: string;
  totalStudents: number;
  totalFees: number;
  collectedFees: number;
  pendingFees: number;
  collectionPercentage: number;
};
```

- [ ] **Step 6.3: Move `financeIntegration.ts` → `financeClient.ts`**

```bash
cp src/services/financeIntegration.ts src/modules/finance/api/financeClient.ts
rm src/services/financeIntegration.ts
```

Update the content of `src/modules/finance/api/financeClient.ts`:
- The `@/lib/api` import stays unchanged (it uses the `@/` alias).
- No other internal imports to change.
- Export all existing functions (they're already exported).

- [ ] **Step 6.4: Update all imports of `financeIntegration`**

Find all files that import from financeIntegration:
```bash
grep -rl "financeIntegration" src/
```

For each found file, change:
```typescript
// OLD
import { ... } from "@/services/financeIntegration";
// NEW
import { ... } from "@/modules/finance/api/financeClient";
```

- [ ] **Step 6.5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6.6: Commit**

```bash
git add src/modules/finance/ src/services/
git commit -m "refactor(frontend): create finance module scaffold with types and API client"
```

---

## Task 7: Frontend — Move Finance Components + FinanceModule

**Files:**
- Move: `src/components/finance/*.tsx` (14 files) → `src/modules/finance/components/`
- Move: `src/pages/school-admin/modules/FinanceModule.tsx` → `src/modules/finance/FinanceModule.tsx`
- Create: `src/pages/school-admin/modules/FinanceModule.tsx` (re-export shim)

- [ ] **Step 7.1: Move all finance components**

```bash
for f in src/components/finance/*.tsx; do
  cp "$f" "src/modules/finance/components/$(basename $f)"
done
rm src/components/finance/*.tsx
rmdir src/components/finance
```

- [ ] **Step 7.2: Update imports inside each moved component**

Finance components likely import from `@/components/ui/` (unchanged) and each other. Check for any relative imports between finance components that now need updating:

```bash
grep -n "from.*['\"]\.\./" src/modules/finance/components/*.tsx
```

If any relative imports reference `../../components/ui/`, they should already work via `@/components/ui/` alias. Fix any relative cross-component imports to use the `@/modules/finance/components/` path or adjust relative paths.

- [ ] **Step 7.3: Move FinanceModule.tsx to `src/modules/finance/`**

```bash
cp "src/pages/school-admin/modules/FinanceModule.tsx" "src/modules/finance/FinanceModule.tsx"
```

Update ALL imports inside `src/modules/finance/FinanceModule.tsx`:

```typescript
// Finance components (were at @/components/finance/... now at @/modules/finance/components/...)
// Change e.g.:
import SchoolFinanceDashboard from "@/components/finance/SchoolFinanceDashboard";
// to:
import SchoolFinanceDashboard from "@/modules/finance/components/SchoolFinanceDashboard";

// Same for all other finance component imports in this file.
// Non-finance imports (@/components/ui/, @/lib/, etc.) stay unchanged.
```

Also, the types defined inside FinanceModule.tsx can now import from the types file instead:
```typescript
import type { ClassFeeStructure, StudentFeeAssignment, PaymentMode } from "./types/finance";
```
(Optional improvement — only do this if it reduces duplication; do NOT remove types that are used locally only.)

- [ ] **Step 7.4: Create re-export shim at old location**

`src/pages/school-admin/modules/FinanceModule.tsx` should remain as a 1-line shim so existing imports from SchoolModulePage don't break:

```typescript
// src/pages/school-admin/modules/FinanceModule.tsx
export { default } from "@/modules/finance/FinanceModule";
```

This means NO change needed in SchoolModulePage.tsx — it still works.

- [ ] **Step 7.5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.6: Visual smoke-test**

Start the frontend dev server:
```bash
npm run dev
```
Navigate to `/school/finance` in browser. Verify:
- Finance module loads without errors
- All tabs/sections visible
- No console import errors

- [ ] **Step 7.7: Commit**

```bash
git add src/modules/finance/ src/components/ src/pages/school-admin/modules/FinanceModule.tsx
git commit -m "refactor(frontend): move finance components and FinanceModule to modules/finance/"
```

---

## Task 8: Frontend — Create Finance Custom Hooks

**Files:**
- Create: `src/modules/finance/hooks/useClassFeeStructures.ts`
- Create: `src/modules/finance/hooks/useStudentAssignments.ts`
- Create: `src/modules/finance/hooks/useRecordPayment.ts`

These are NEW hooks that wrap the existing API client functions with React Query. They make it easy to use finance data in components without ad-hoc `useEffect` + `useState` patterns.

- [ ] **Step 8.1: Create `useClassFeeStructures.ts`**

```typescript
// src/modules/finance/hooks/useClassFeeStructures.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClassFeeStructures, saveClassFeeStructure, updateClassFeeStructure } from "../api/financeClient";

export function useClassFeeStructures(schoolId: string) {
  return useQuery({
    queryKey: ["classFeeStructures", schoolId],
    queryFn: () => getClassFeeStructures(schoolId),
    enabled: Boolean(schoolId),
  });
}

export function useSaveClassFeeStructure(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof saveClassFeeStructure>[1]) =>
      saveClassFeeStructure(schoolId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classFeeStructures", schoolId] }),
  });
}

export function useUpdateClassFeeStructure(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateClassFeeStructure>[2] }) =>
      updateClassFeeStructure(id, schoolId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classFeeStructures", schoolId] }),
  });
}
```

- [ ] **Step 8.2: Create `useStudentAssignments.ts`**

```typescript
// src/modules/finance/hooks/useStudentAssignments.ts
import { useQuery } from "@tanstack/react-query";
import { getStudentFeeAssignments } from "../api/financeClient";

type Filters = {
  class_id?: string;
  section_id?: string;
  academic_year?: string;
  search?: string;
};

export function useStudentAssignments(schoolId: string, filters: Filters) {
  return useQuery({
    queryKey: ["studentAssignments", schoolId, filters],
    queryFn: () => getStudentFeeAssignments(schoolId, filters),
    enabled: Boolean(schoolId) && Boolean(filters.class_id),
  });
}
```

- [ ] **Step 8.3: Create `useRecordPayment.ts`**

```typescript
// src/modules/finance/hooks/useRecordPayment.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordPayment } from "../api/financeClient";

export function useRecordPayment(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof recordPayment>[1]) =>
      recordPayment(schoolId, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["studentAssignments", schoolId] });
      qc.invalidateQueries({
        queryKey: ["studentAssignment", variables.student_fee_assignment_id],
      });
    },
  });
}
```

- [ ] **Step 8.4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 8.5: Commit**

```bash
git add src/modules/finance/hooks/
git commit -m "feat(frontend): add React Query hooks for finance module"
```

---

## Task 9: Frontend — Clean Up Dead Code (`src/services/pages/`)

**Files:**
- Delete: `src/services/pages/` (entire directory — confirmed dead code, never imported in App.tsx or router)
- Delete: `src/services/timetableService.ts` if unused (verify first)

- [ ] **Step 9.1: Confirm `src/services/pages/` is dead code**

```bash
grep -r "from.*services/pages/" src/
grep -r "import.*services/pages/" src/
```

Expected: 0 matches. If any are found, DO NOT delete — investigate first.

- [ ] **Step 9.2: Confirm `timetableService.ts` usage**

```bash
grep -r "timetableService" src/
```

If only referenced from within `src/services/` (the dead zone), safe to delete.

- [ ] **Step 9.3: Delete confirmed dead code**

```bash
rm -rf src/services/pages/
# Only if step 9.2 showed no live imports:
rm src/services/timetableService.ts
```

If `src/services/` is now empty except for `academics/`, rename to clarify:
```bash
# Keep src/services/academics/ in place (it's actively used)
# The services/ folder now just has academics/ — that's fine for now
```

- [ ] **Step 9.4: Verify TypeScript compiles and app still runs**

```bash
npx tsc --noEmit
npm run dev
```

- [ ] **Step 9.5: Commit**

```bash
git add -A src/services/
git commit -m "refactor(frontend): remove unused src/services/pages/ ghost directory"
```

---

## Task 10: Documentation — `ARCHITECTURE.md` + `README` Update

**Files:**
- Create: `ARCHITECTURE.md`
- Modify: `README.md` (add architecture section)

- [ ] **Step 10.1: Create `ARCHITECTURE.md`**

```markdown
# ERP Portal — Architecture Overview

## Structure

This project uses a **modular monolith** layout: one deployable unit, organized by
business domain rather than technical layer.

## Backend (`backend/src/`)

```
core/           Shared infrastructure — never contains business logic
  config/       Database connection, environment loading
  middleware/   Auth token validation
  utils/        JWT, email, throttling, logging helpers

modules/        One folder per business domain
  finance/      Fee structures, student billing, payments, expenses, banking
    models/     Mongoose schemas
    routes/     Express route handlers
    services/   Business logic (financeService, salaryStructureService)
    utils/      Finance-specific helpers (feeStructure, classFeeStructure)
    seeds/      Demo data seeders
  students/     Student records
  academics/    Classes, assignments, subjects, marks, exams, attendance
  staff/        Staff records, teacher roles
  communication/ Announcements, campaigns, messaging
  transport/    Bus routes and assignments
  library/      Book catalogue and assignments
  hostel/       Hostel management
  hr/           Leave applications
  maintenance/  Maintenance requests
  school/       School entity and config
  ...

app.ts          Express app factory (middleware + route registration)
server.ts       HTTP server start + DB init
```

## Frontend (`src/`)

```
modules/        One folder per business domain
  finance/      The reference domain module
    api/        financeClient.ts — wraps all /api/finance/* endpoints
    components/ Finance-specific React components
    hooks/      React Query hooks for finance data
    types/      TypeScript interfaces for Finance domain
    FinanceModule.tsx  Orchestrator component (rendered by router)

shared/         (components/ui/, layouts/, hooks/, lib/) — in place,
                not moved to avoid mass import changes

pages/          Thin shell — each school-admin module page imports from modules/
  school-admin/
    SchoolModulePage.tsx  Routes :module param to correct module component
    modules/
      FinanceModule.tsx   Re-exports from @/modules/finance/FinanceModule
```

## Adding a New Module

### Backend
1. `mkdir -p backend/src/modules/<domain>/models backend/src/modules/<domain>/routes`
2. Create Mongoose model in `models/`
3. Create Express router in `routes/`
4. Import shared helpers from `../../core/utils/`
5. Register route in `backend/src/app.ts`

### Frontend
1. `mkdir -p src/modules/<domain>/api src/modules/<domain>/components src/modules/<domain>/types`
2. Create API client in `api/`
3. Create types in `types/`
4. Create components/page in root of module folder
5. Add to `src/pages/school-admin/SchoolModulePage.tsx` module map

## Finance Domain (Reference Example)

- Backend entry: `backend/src/modules/finance/routes/financeRoutes.ts`
- Frontend entry: `src/modules/finance/FinanceModule.tsx`
- API client: `src/modules/finance/api/financeClient.ts`
- Types: `src/modules/finance/types/finance.ts`
- Hooks: `src/modules/finance/hooks/`
```

- [ ] **Step 10.2: Add architecture section to `README.md`**

In `README.md`, add a section after the existing intro:

```markdown
## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full module map. Short version:

- Backend: `backend/src/core/` (shared infra) + `backend/src/modules/<domain>/` (business logic)
- Frontend: `src/modules/<domain>/` (domain pages/components/hooks/types) + `src/components/ui/` (shared UI kit)
- **Finance module** is the reference: `backend/src/modules/finance/` + `src/modules/finance/`
```

- [ ] **Step 10.3: Commit**

```bash
git add ARCHITECTURE.md README.md
git commit -m "docs: add ARCHITECTURE.md and update README with module structure"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Phase 1 (Discovery) — covered by Current State Snapshot above
- [x] Phase 2 (Target Architecture) — covered by Target Architecture section + Move Map
- [x] Phase 3 (Backend Refactor) — Tasks 1–5
- [x] Phase 4 (Frontend Refactor) — Tasks 6–8
- [x] Phase 5 (Finance Validation) — compile checks + smoke-tests in Tasks 3 and 7
- [x] Phase 6 (QA & Docs) — Task 10

### Finance Endpoint Contracts Preserved
- `POST /api/finance/class-fee-structures` ✓ (route unchanged, only import path changes)
- `GET /api/finance/class-fee-structures` ✓
- `PUT /api/finance/class-fee-structures/:id` ✓
- `GET /api/finance/student-fee-assignments` ✓
- `GET /api/finance/student-fee-assignments/:id` ✓
- `POST /api/finance/student-fee-payments` ✓
- `GET /api/finance/student-fee-payments/:studentId` ✓
- `PATCH /api/finance/students/:studentId/transport-status` ✓
- `GET /api/finance/class/:classId/summary` ✓
- `GET /api/health` ✓

### No Business Logic Changes
All moves are copy-then-update-imports only. No function signatures, model schemas, or response shapes are modified.

### Type Consistency
- `ClassFeeStructure` defined in Task 6.2 matches fields visible in `financeIntegration.ts` and `FinanceModule.tsx`.
- `StudentFeeAssignment` fields match `StudentFeeAssignmentApiRecord` in `financeIntegration.ts` (transformed shape).
- `PaymentMode` type matches exactly.

### Dead Code
`src/services/pages/` deletion confirmed via grep in Task 9 before deletion.

---

## Execution Order

Tasks must run in order (each depends on previous compile state):
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

Tasks 5 sub-steps (5.2–5.6) can be done domain by domain with individual commits — no need to do all at once.
