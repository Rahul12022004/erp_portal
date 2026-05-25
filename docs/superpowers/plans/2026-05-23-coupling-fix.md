# ERP Coupling Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all coupling violations from `docs/COUPLING_AUDIT.md` across 4 phases without breaking the running application.

**Architecture:** Centralize config + shared utils first (safe), then extract auth module and break two circular dependencies, then split 4 god routes, then migrate 127 localStorage violations and 30+ raw fetches in the frontend.

**Tech Stack:** Express 5 / Mongoose 9 / TypeScript 5 (backend); React 18 / Vite / TypeScript 5 (frontend)

---

## File Map

### Phase 1 — New / Modified Files
| Action | Path |
|--------|------|
| Modify | `backend/src/core/config/env.ts` |
| Modify | `backend/src/core/utils/jwt.ts` |
| Modify | `backend/src/core/utils/sendEmail.ts` |
| Modify | `backend/src/server.ts` |
| Modify | `backend/src/modules/academics/routes/examRoutes.ts` |
| Modify | `backend/src/modules/ai/routes/aiRoutes.ts` |
| Modify | `backend/src/modules/communication/routes/announcementRoutes.ts` |
| Modify | `backend/src/modules/data-import/routes/dataImportRoutes.ts` |
| Modify | `backend/src/modules/finance/utils/financeImportAi.ts` |
| Modify | `backend/src/modules/school/routes/schoolRoutes.ts` (remove `process.env` + `createLog`) |
| Modify | All 22 `createLog` call sites → `eventBus.publish("audit.entry", ...)` |
| Create | `backend/src/modules/audit/events/index.ts` |
| Modify | `backend/src/modules/audit/index.ts` |
| Create | `frontend/src/lib/session.ts` |
| Create | `frontend/src/lib/apiClient.ts` |

### Phase 2 — New / Modified Files
| Action | Path |
|--------|------|
| Create | `backend/src/modules/auth/api/authRoutes.ts` |
| Create | `backend/src/modules/auth/application/AuthService.ts` |
| Modify | `backend/src/modules/auth/index.ts` |
| Modify | `backend/src/modules/school/routes/schoolRoutes.ts` (remove login/register/super-admin handlers) |
| Modify | `backend/src/modules/school/index.ts` |
| Modify | `backend/src/modules/staff/routes/staffRoutes.ts` (remove login handler) |
| Modify | `backend/src/modules/finance/routes/financeRoutes.ts` (remove Student import) |
| Modify | `backend/src/modules/finance/services/financeService.ts` (remove Student + Class imports) |
| Modify | `backend/src/modules/finance/seeds/financeSeeds.ts` (remove Student import) |
| Modify | `backend/src/modules/students/routes/studentRoutes.ts` (remove Finance + classFeeStructure imports) |
| Modify | `frontend/src/lib/auth.ts` (update 3 login URLs) |

### Phase 3 — New / Modified Files
| Action | Path |
|--------|------|
| Create | `backend/src/modules/school/routes/schoolProfileRoutes.ts` |
| Create | `backend/src/modules/school/routes/schoolDataRoutes.ts` |
| Modify | `backend/src/modules/school/index.ts` |
| Create | `backend/src/modules/students/routes/studentCrudRoutes.ts` |
| Create | `backend/src/modules/students/routes/studentProfileRoutes.ts` |
| Modify | `backend/src/modules/students/index.ts` |
| Create | `backend/src/modules/data-import/application/ImportOrchestrationService.ts` |
| Modify | `backend/src/modules/data-import/routes/dataImportRoutes.ts` (thin route shell) |
| Modify | `backend/src/modules/finance/services/financeService.ts` (absorb inline route logic) |
| Modify | `backend/src/modules/finance/routes/financeRoutes.ts` (thin route shell) |

### Phase 4 — Modified Frontend Files
| Action | Path |
|--------|------|
| Modify | `frontend/src/contexts/RoleContext.tsx` |
| Modify | `frontend/src/components/RoleSwitcher.tsx` |
| Modify | `frontend/src/components/SalaryStructureModule.tsx` |
| Modify | `frontend/src/components/SchoolAdminDashboard.tsx` |
| Modify | `frontend/src/components/TopNavbar.tsx` |
| Modify | `frontend/src/modules/attendance/AttendenceModule.tsx` |
| Modify | `frontend/src/modules/classes/ClassModule.tsx` |
| Modify | `frontend/src/modules/communication/CommunicationPage.tsx` |
| Modify | `frontend/src/modules/communication/CommunicationCenterPage.tsx` |
| Modify | `frontend/src/modules/data-import/DataImportModule.tsx` |
| Modify | `frontend/src/modules/downloads/DownloadsModule.tsx` |
| Modify | `frontend/src/modules/exams/ExamsModule.tsx` |
| Modify | `frontend/src/modules/finance/FinanceModule.tsx` |
| Modify | `frontend/src/modules/finance/components/AddExpenseForm.tsx` |
| Modify | `frontend/src/modules/finance/components/BudgetMonitoring.tsx` |
| Modify | `frontend/src/modules/finance/components/ExpenseApprovalWorkflow.tsx` |
| Modify | `frontend/src/modules/finance/components/ExpenseAuditLog.tsx` |
| Modify | `frontend/src/modules/finance/components/ExpenseCategoryManagement.tsx` |
| Modify | `frontend/src/modules/finance/components/ExpenseDashboard.tsx` |
| Modify | `frontend/src/modules/finance/components/ExpenseList.tsx` |
| Modify | `frontend/src/modules/finance/components/FinanceDashboard.tsx` |
| Modify | `frontend/src/modules/hr/HRModule.tsx` |
| Modify | `frontend/src/modules/house/HouseModule.tsx` |
| Modify | `frontend/src/modules/students/StudentModule.tsx` |
| Modify | `frontend/src/modules/transport/TransportModule.tsx` |
| Modify | `frontend/src/pages/school-admin/SchoolAdminSidebar.tsx` |
| Modify | `frontend/src/pages/teacher/modules/*.tsx` (6 files) |
| Modify | `frontend/src/services/timetableService.ts` |
| Modify | `frontend/src/modules/social-media/SocialMediaModule.tsx` |
| Modify | `frontend/src/modules/academics/AcademicsModule.tsx` |

---

## PHASE 1 — Config & Shared Utils

---

### Task 1.1: Expand `core/config/env.ts` — validated config object

**Files:**
- Modify: `backend/src/core/config/env.ts`

- [ ] **Replace the entire file** with:

```typescript
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

let environmentLoaded = false;

export function loadEnvironment() {
  if (environmentLoaded) return;
  const cwd = process.cwd();
  const defaultEnvPath = path.resolve(cwd, ".env");
  if (fs.existsSync(defaultEnvPath)) dotenv.config({ path: defaultEnvPath, override: false });
  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  if (nodeEnv === "production") {
    const prodPath = path.resolve(cwd, ".env.production");
    if (fs.existsSync(prodPath)) dotenv.config({ path: prodPath, override: true });
  }
  environmentLoaded = true;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || !val.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return (process.env[key] || "").trim() || fallback;
}

export function buildEnv() {
  const nodeEnv = optionalEnv("NODE_ENV", "development");
  const jwtSecret = optionalEnv("JWT_SECRET", "dev-only-jwt-secret-change-in-production");

  if (nodeEnv === "production" && jwtSecret === "dev-only-jwt-secret-change-in-production") {
    throw new Error("JWT_SECRET must be set in production. The dev fallback is not safe.");
  }

  return {
    nodeEnv,
    mongoUri: requireEnv("MONGO_URI"),
    jwtSecret,
    jwtExpiresIn: optionalEnv("JWT_EXPIRES_IN", "12h"),
    port: Number(optionalEnv("PORT", "5000")),
    frontendOrigins: optionalEnv("FRONTEND_ORIGINS", "")
      .split(",").map(s => s.trim()).filter(Boolean),
    seedLocalData: optionalEnv("SEED_LOCAL_DATA", "false") === "true",
    superAdminEmail: optionalEnv("SUPER_ADMIN_EMAIL", ""),
    superAdminPassword: optionalEnv("SUPER_ADMIN_PASSWORD", ""),
    smtpHost: optionalEnv("SMTP_HOST", "smtp.gmail.com"),
    smtpPort: Number(optionalEnv("SMTP_PORT", "587")),
    smtpSecure: optionalEnv("SMTP_SECURE", "false").toLowerCase() === "true",
    smtpUser: optionalEnv("SMTP_USER", "") || optionalEnv("EMAIL_USER", ""),
    smtpPass: optionalEnv("SMTP_PASS", "") || optionalEnv("EMAIL_PASSWORD", ""),
    smtpFrom: optionalEnv("SMTP_FROM", "") || optionalEnv("SMTP_USER", "") || optionalEnv("EMAIL_USER", "noreply@erp-portal.com"),
    groqApiKey: optionalEnv("GROQ_API_KEY", ""),
    groqModel: optionalEnv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    geminiApiKey: optionalEnv("GEMINI_API_KEY", ""),
  } as const;
}

export type AppEnv = ReturnType<typeof buildEnv>;

let _env: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!_env) throw new Error("env not initialised — call initEnv() first");
  return _env;
}

export function initEnv(): AppEnv {
  loadEnvironment();
  _env = buildEnv();
  return _env;
}
```

- [ ] **Build backend to confirm no breakage:**

```bash
npm run build:backend
```

Expected: compiles with no errors.

- [ ] **Commit:**

```bash
git add backend/src/core/config/env.ts
git commit -m "feat(core): add validated env config with initEnv()"
```

---

### Task 1.2: Call `initEnv()` in `server.ts` and migrate its `process.env` calls

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Replace the top of `server.ts`** — change the imports and startup block:

```typescript
import express from "express";
import cors from "cors";
import connectDB, { getDatabaseStatus } from "./core/config/db";
import { initEnv } from "./core/config/env";

import { moduleRoutes } from "./core/moduleLoader";
import { seedDatabase } from "./seed";
import { authenticateToken } from "./core/middleware/auth";

const env = initEnv();   // ← replaces loadEnvironment() + all process.env below

const app = express();
const defaultAllowedOrigins = [
  "https://erp-portal-seven.vercel.app",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
];

const allowedOrigins = new Set([...defaultAllowedOrigins, ...env.frontendOrigins]);
```

- [ ] **Replace `shouldSeedLocalData`:**

```typescript
const shouldSeedLocalData = env.seedLocalData;
```

- [ ] **Replace `PORT`:**

```typescript
const PORT = env.port;
```

- [ ] **Replace health-check `process.env` reads:**

```typescript
app.get("/api/health", (req, res) => {
  const db = getDatabaseStatus();
  res.json({
    ok: true,
    dbConnected: db.connected,
    dbReadyState: db.readyState,
    dbLastError: db.lastError,
    superAdminConfigured: Boolean(env.superAdminEmail && env.superAdminPassword),
    superAdminEnv: {
      email: Boolean(env.superAdminEmail),
      password: Boolean(env.superAdminPassword),
    },
  });
});
```

- [ ] **Build + start check:**

```bash
npm run build:backend
```

Expected: compiles clean.

- [ ] **Commit:**

```bash
git add backend/src/server.ts
git commit -m "refactor(server): use initEnv() — remove direct process.env access"
```

---

### Task 1.3: Migrate `process.env` in `core/utils/jwt.ts`

**Files:**
- Modify: `backend/src/core/utils/jwt.ts`

- [ ] **Replace entire file:**

```typescript
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: "super-admin" | "school-admin" | "teacher";
  schoolId?: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  const { jwtSecret, jwtExpiresIn } = getEnv();
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyAuthToken(token: string) {
  const { jwtSecret } = getEnv();
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
}
```

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/core/utils/jwt.ts
git commit -m "refactor(jwt): use getEnv() — remove direct process.env access"
```

---

### Task 1.4: Migrate `process.env` in `core/utils/sendEmail.ts`

**Files:**
- Modify: `backend/src/core/utils/sendEmail.ts`

- [ ] **Replace the transporter factory at the top of the file.** Find:

```typescript
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
```

Replace with:

```typescript
  const { smtpHost: host, smtpPort: port, smtpSecure: secure, smtpUser: user, smtpPass: pass } = getEnv();
```

- [ ] **Add import at top of file:**

```typescript
import { getEnv } from "../config/env";
```

- [ ] **Replace all `process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "noreply@..."` occurrences** (there are 4) with:

```typescript
getEnv().smtpFrom
```

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/core/utils/sendEmail.ts
git commit -m "refactor(sendEmail): use getEnv() — remove direct process.env access"
```

---

### Task 1.5: Migrate `process.env` in AI-using route files

**Files:**
- Modify: `backend/src/modules/academics/routes/examRoutes.ts`
- Modify: `backend/src/modules/ai/routes/aiRoutes.ts`
- Modify: `backend/src/modules/communication/routes/announcementRoutes.ts`
- Modify: `backend/src/modules/data-import/routes/dataImportRoutes.ts`
- Modify: `backend/src/modules/finance/utils/financeImportAi.ts`
- Modify: `backend/src/modules/school/routes/schoolRoutes.ts`

**Pattern:** In each file, add `import { getEnv } from "../../../core/config/env";` (adjust path depth), then replace:
- `process.env.GROQ_API_KEY` → `getEnv().groqApiKey`
- `process.env.GROQ_MODEL` → `getEnv().groqModel`
- `process.env.GEMINI_API_KEY` → `getEnv().geminiApiKey`
- `process.env.SUPER_ADMIN_EMAIL` → `getEnv().superAdminEmail`
- `process.env.SUPER_ADMIN_PASSWORD` → `getEnv().superAdminPassword`

- [ ] **`examRoutes.ts`** — add import, replace 2 occurrences at lines 106-107.

- [ ] **`aiRoutes.ts`** — add import, replace 3 occurrences.

- [ ] **`announcementRoutes.ts`** — add import, replace 3 occurrences (GEMINI + GROQ × 2).

- [ ] **`dataImportRoutes.ts`** — add import, replace 2 occurrences.

- [ ] **`financeImportAi.ts`** — add import, replace 3 occurrences.

- [ ] **`schoolRoutes.ts`** — add import, replace `process.env.SUPER_ADMIN_EMAIL` and `process.env.SUPER_ADMIN_PASSWORD` (2 locations: super-admin-login and super-admin-login-v2).

- [ ] **Build:**

```bash
npm run build:backend
```

Expected: clean compile.

- [ ] **Commit:**

```bash
git add backend/src/modules/academics/routes/examRoutes.ts \
        backend/src/modules/ai/routes/aiRoutes.ts \
        backend/src/modules/communication/routes/announcementRoutes.ts \
        backend/src/modules/data-import/routes/dataImportRoutes.ts \
        backend/src/modules/finance/utils/financeImportAi.ts \
        backend/src/modules/school/routes/schoolRoutes.ts
git commit -m "refactor(modules): replace process.env with getEnv() in all AI/admin routes"
```

---

### Task 1.6: Create audit event subscriber — replace `createLog`

**Files:**
- Create: `backend/src/modules/audit/events/index.ts`
- Modify: `backend/src/modules/audit/index.ts`

- [ ] **Create `backend/src/modules/audit/events/index.ts`:**

```typescript
import { eventBus } from "../../../core/events";
import Log from "../../logs/models/Logs";

interface AuditEntryPayload {
  action: string;
  message: string;
  user?: string;
  schoolId?: string;
}

eventBus.subscribe<AuditEntryPayload>("audit.entry", async (payload) => {
  try {
    await Log.create({
      action: payload.action,
      message: payload.message,
      user: payload.user ?? "Super Admin",
      schoolId: payload.schoolId ?? "",
    });
  } catch (err) {
    console.error("AUDIT LOG ERROR:", err);
  }
});

export type { AuditEntryPayload };
```

- [ ] **Modify `backend/src/modules/audit/index.ts`** — import events side-effect to activate subscriber:

```typescript
import type { RouteEntry } from '../../shared/types';
import './events'; // registers audit.entry subscriber on eventBus

const routes: RouteEntry[] = [];
export default routes;
```

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/audit/events/index.ts \
        backend/src/modules/audit/index.ts
git commit -m "feat(audit): subscribe to audit.entry eventBus events — replaces createLog"
```

---

### Task 1.7: Replace all 22 `createLog` call sites with `eventBus.publish`

**Files (all 22):**
- `backend/src/modules/academics/routes/assignmentRoutes.ts`
- `backend/src/modules/academics/routes/attendanceRoutes.ts`
- `backend/src/modules/academics/routes/classRoutes.ts`
- `backend/src/modules/academics/routes/examRoutes.ts`
- `backend/src/modules/academics/routes/markRoutes.ts`
- `backend/src/modules/communication/routes/announcementRoutes.ts`
- `backend/src/modules/communication/routes/communicationRoutes.ts`
- `backend/src/modules/data-import/routes/dataImportRoutes.ts`
- `backend/src/modules/finance/routes/financeRoutes.ts`
- `backend/src/modules/hostel/routes/hostelRoutes.ts`
- `backend/src/modules/inventory/routes/inventoryRoutes.ts`
- `backend/src/modules/library/routes/libraryRoutes.ts`
- `backend/src/modules/maintenance/routes/maintenanceRoutes.ts`
- `backend/src/modules/school/routes/schoolRoutes.ts`
- `backend/src/modules/social/routes/socialMediaRoutes.ts`
- `backend/src/modules/staff/routes/leaveRoutes.ts`
- `backend/src/modules/staff/routes/staffRoutes.ts`
- `backend/src/modules/staff/routes/teacherRoleRoutes.ts`
- `backend/src/modules/students/routes/studentRoutes.ts`
- `backend/src/modules/transport/routes/transportRoutes.ts`
- `backend/src/modules/survey/routes/surveyRoutes.ts`
- `backend/src/modules/visitor/routes/visitorRoutes.ts`

**Pattern per file:**

1. Remove: `import { createLog } from "../../../core/utils/createLog";` (path depth varies)
2. Add: `import { eventBus } from "../../../core/events";` (same depth)
3. Replace every: `await createLog({ action, message, user, schoolId })`
   With: `eventBus.publish("audit.entry", { action, message, user, schoolId })`

Note: `createLog` is async but fire-and-forget. `eventBus.publish` is sync (EventEmitter). Remove the `await` keyword.

- [ ] **Process all 22 files** following the pattern above. Verify each file compiles before moving to the next.

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/
git commit -m "refactor: replace 22x createLog with eventBus.publish('audit.entry')"
```

---

### Task 1.8: Create `frontend/src/lib/session.ts`

**Files:**
- Create: `frontend/src/lib/session.ts`

- [ ] **Create the file:**

```typescript
import type { TeacherPermissions, User } from "@/contexts/RoleContext";

export type SchoolAdminSession = {
  _id?: string;
  token?: string;
  modules?: string[];
  adminInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    password?: string;
    status?: string;
  };
  schoolInfo?: {
    name?: string;
    logo?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    location?: unknown;
  };
  systemInfo?: {
    schoolType?: string;
    subscriptionPlan?: string;
    subscriptionEndDate?: string;
  };
};

export type TeacherSession = {
  _id?: string;
  name?: string;
  email?: string;
};

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error(`session: failed to write key "${key}"`);
  }
}

export const session = {
  getAuthToken(): string {
    try { return localStorage.getItem("authToken") || ""; } catch { return ""; }
  },
  setAuthToken(token: string): void {
    try { localStorage.setItem("authToken", token); } catch {}
  },

  getSchool(): SchoolAdminSession | null {
    return safeRead<SchoolAdminSession>("school");
  },
  setSchool(data: SchoolAdminSession): void {
    safeWrite("school", data);
    window.dispatchEvent(new Event("school-session-updated"));
  },

  getTeacher(): TeacherSession | null {
    return safeRead<TeacherSession>("teacher");
  },
  setTeacher(data: TeacherSession): void {
    safeWrite("teacher", data);
  },

  getRole(): string | null {
    try { return localStorage.getItem("role"); } catch { return null; }
  },
  setRole(role: string): void {
    try { localStorage.setItem("role", role); } catch {}
  },

  getUser(): User | null {
    return safeRead<User>("user");
  },
  setUser(user: User): void {
    safeWrite("user", user);
  },

  getTeacherPermissions(): TeacherPermissions | null {
    return safeRead<TeacherPermissions>("teacherPermissions");
  },
  setTeacherPermissions(perms: TeacherPermissions): void {
    safeWrite("teacherPermissions", perms);
  },

  clearAll(): void {
    const keys = ["authToken", "user", "role", "teacher", "school", "teacherPermissions"];
    keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
  },
};
```

- [ ] **Build frontend:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/lib/session.ts
git commit -m "feat(frontend): add lib/session.ts — typed localStorage wrapper"
```

---

### Task 1.9: Create `frontend/src/lib/apiClient.ts`

**Files:**
- Create: `frontend/src/lib/apiClient.ts`

- [ ] **Create the file:**

```typescript
import { API_URL } from "@/lib/api";
import { session } from "@/lib/session";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = session.getAuthToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
    throw new Error(err.message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) =>
    request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Build frontend:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/lib/apiClient.ts
git commit -m "feat(frontend): add lib/apiClient.ts — typed fetch wrapper"
```

---

## PHASE 2 — Break Circular Dependencies

---

### Task 2.1: Implement `modules/auth/application/AuthService.ts`

**Files:**
- Create: `backend/src/modules/auth/application/AuthService.ts`

- [ ] **Create the file** — consolidates JWT, throttle, bcrypt used by school and staff login:

```typescript
import bcrypt from "bcryptjs";
import { signAuthToken, type AuthTokenPayload } from "../../../core/utils/jwt";
import {
  clearLoginFailures,
  getLoginBlockInfo,
  getLoginThrottleKey,
  recordLoginFailure,
} from "../../../core/utils/loginThrottle";
import { getEnv } from "../../../core/config/env";
import type { Request } from "express";

export interface ThrottleResult {
  blocked: boolean;
  retryAfterSeconds?: number;
}

export interface LoginResult {
  success: true;
  token: string;
} | { success: false; status: number; message: string };

export const AuthService = {
  checkThrottle(req: Request, email: string): ThrottleResult {
    const key = getLoginThrottleKey(req.ip, String(email || ""));
    return getLoginBlockInfo(key);
  },

  getThrottleKey(req: Request, email: string): string {
    return getLoginThrottleKey(req.ip, String(email || ""));
  },

  recordFailure(throttleKey: string): void {
    recordLoginFailure(throttleKey);
  },

  clearFailures(throttleKey: string): void {
    clearLoginFailures(throttleKey);
  },

  async verifyPassword(plaintext: string, stored: string): Promise<boolean> {
    if (!stored) return false;
    return stored.startsWith("$2")
      ? bcrypt.compare(plaintext, stored)
      : stored === plaintext;
  },

  async upgradePasswordIfPlain(plaintext: string, stored: string): Promise<string | null> {
    if (stored.startsWith("$2")) return null;
    return bcrypt.hash(plaintext, 12);
  },

  issueToken(payload: AuthTokenPayload): string {
    return signAuthToken(payload);
  },

  getSuperAdminCredentials() {
    const env = getEnv();
    return { email: env.superAdminEmail, password: env.superAdminPassword };
  },

  isGmailAddress(email: string): boolean {
    return /^[^\s@]+@gmail\.com$/.test(String(email || "").trim().toLowerCase());
  },
};
```

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/auth/application/AuthService.ts
git commit -m "feat(auth): add AuthService — consolidates JWT, bcrypt, throttle"
```

---

### Task 2.2: Implement `modules/auth/api/authRoutes.ts`

**Files:**
- Create: `backend/src/modules/auth/api/authRoutes.ts`

- [ ] **Create the file** — extracts login/register handlers from school and staff routes:

```typescript
import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import School from "../../school/models/School";
import Staff from "../../staff/models/Staff";
import { AuthService } from "../application/AuthService";
import { sendSchoolAdminCredentialsEmail } from "../../../core/utils/sendEmail";
import { sendTeacherCredentialsEmail } from "../../../core/utils/sendEmail";
import { eventBus } from "../../../core/events";

const router = express.Router();

// Helper shared with school module — keep in sync with schoolRoutes.ts toSchoolSessionResponse
function toSchoolSessionWithToken(school: Record<string, unknown>) {
  const s = school as {
    _id?: unknown;
    adminInfo?: Record<string, unknown>;
    schoolInfo?: Record<string, unknown>;
    systemInfo?: Record<string, unknown>;
    modules?: string[];
    token?: string;
  };
  const token = AuthService.issueToken({
    userId: String(s._id),
    email: String(s.adminInfo?.email || s.schoolInfo?.email || ""),
    role: "school-admin",
    schoolId: String(s._id),
  });
  return {
    _id: s._id,
    token,
    modules: s.modules,
    adminInfo: s.adminInfo,
    schoolInfo: s.schoolInfo,
    systemInfo: s.systemInfo,
  };
}

// POST /api/auth/school/login
router.post("/school/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const throttleKey = AuthService.getThrottleKey(req, email || "");
    const blockInfo = AuthService.checkThrottle(req, email || "");

    if (blockInfo.blocked) {
      return res.status(429).json({
        message: "Too many failed login attempts. Please try again later.",
        retryAfterSeconds: blockInfo.retryAfterSeconds,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const school = await School.findOne({
      $or: [{ "adminInfo.email": email }, { "schoolInfo.email": email }],
    }).select("+adminInfo.password");

    if (!school) {
      AuthService.recordFailure(throttleKey);
      return res.status(404).json({ message: "Admin not found" });
    }

    if ((school.adminInfo as Record<string, unknown>)?.status === "Disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }

    const storedPassword = String((school.adminInfo as Record<string, unknown>)?.password || "");
    const passwordValid = await AuthService.verifyPassword(password, storedPassword);

    if (!passwordValid) {
      AuthService.recordFailure(throttleKey);
      return res.status(401).json({ message: "Invalid password" });
    }

    const upgradedHash = await AuthService.upgradePasswordIfPlain(password, storedPassword);
    if (upgradedHash) {
      await School.updateOne({ _id: school._id }, { $set: { "adminInfo.password": upgradedHash } });
    }

    AuthService.clearFailures(throttleKey);
    return res.json(toSchoolSessionWithToken(school as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("SCHOOL LOGIN ERROR:", error);
    return res.status(500).json({ message: "School admin login failed" });
  }
});

// POST /api/auth/super-admin/login
router.post("/super-admin/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!AuthService.isGmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Super admin login requires a gmail.com email address" });
    }

    const { email: expectedEmail, password: expectedPassword } = AuthService.getSuperAdminCredentials();
    if (!expectedEmail || !expectedPassword) {
      return res.status(500).json({ message: "Super admin credentials are not configured on server" });
    }

    const normalizedExpected = expectedEmail.trim().toLowerCase();
    if (!AuthService.isGmailAddress(normalizedExpected)) {
      return res.status(500).json({ message: "Super admin email on server must be a gmail.com address" });
    }

    if (normalizedEmail !== normalizedExpected || password !== expectedPassword) {
      return res.status(401).json({ message: "Invalid super admin credentials" });
    }

    const token = AuthService.issueToken({
      userId: "super-admin",
      email: normalizedEmail,
      role: "super-admin",
    });

    return res.json({
      success: true,
      token,
      user: { id: "super_admin_001", email: normalizedEmail, name: "Super Admin", role: "super-admin" },
    });
  } catch (error) {
    console.error("SUPER ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ message: "Super admin login failed" });
  }
});

// POST /api/auth/staff/login  (teacher login)
router.post("/staff/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const throttleKey = AuthService.getThrottleKey(req, email || "");
    const blockInfo = AuthService.checkThrottle(req, email || "");

    if (blockInfo.blocked) {
      return res.status(429).json({
        message: "Too many failed login attempts. Please try again later.",
        retryAfterSeconds: blockInfo.retryAfterSeconds,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Required fields: email, password" });
    }

    const teacher = await Staff.findOne({
      email,
      position: /^Teacher$/i,
      status: "Active",
    }).select("+password");

    if (!teacher) {
      AuthService.recordFailure(throttleKey);
      return res.status(404).json({ message: "Teacher not found" });
    }

    const storedPassword = String((teacher as Record<string, unknown>).password || "");
    const passwordValid = await AuthService.verifyPassword(password, storedPassword);

    if (!passwordValid) {
      AuthService.recordFailure(throttleKey);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const upgradedHash = await AuthService.upgradePasswordIfPlain(password, storedPassword);
    if (upgradedHash) {
      await Staff.updateOne({ _id: teacher._id }, { $set: { password: upgradedHash } });
    }

    AuthService.clearFailures(throttleKey);

    const school = await School.findById((teacher as Record<string, unknown>).schoolId);

    const token = AuthService.issueToken({
      userId: String(teacher._id),
      email: String((teacher as Record<string, unknown>).email || ""),
      role: "teacher",
      schoolId: String((teacher as Record<string, unknown>).schoolId || ""),
    });

    eventBus.publish("audit.entry", {
      action: "TEACHER_LOGIN",
      message: `Teacher ${(teacher as Record<string, unknown>).name} logged in`,
      user: String((teacher as Record<string, unknown>).name || email),
      schoolId: String((teacher as Record<string, unknown>).schoolId || ""),
    });

    return res.json({
      token,
      teacher: {
        _id: teacher._id,
        name: (teacher as Record<string, unknown>).name,
        email: (teacher as Record<string, unknown>).email,
        position: (teacher as Record<string, unknown>).position,
        schoolId: (teacher as Record<string, unknown>).schoolId,
        permissions: (teacher as Record<string, unknown>).permissions,
      },
      school: school ? {
        _id: school._id,
        modules: (school as Record<string, unknown>).modules,
        adminInfo: { name: (school.adminInfo as Record<string, unknown>)?.name, email: (school.adminInfo as Record<string, unknown>)?.email },
        schoolInfo: { name: (school.schoolInfo as Record<string, unknown>)?.name, logo: (school.schoolInfo as Record<string, unknown>)?.logo },
      } : null,
    });
  } catch (error) {
    console.error("STAFF LOGIN ERROR:", error);
    return res.status(500).json({ message: "Staff login failed" });
  }
});

// POST /api/auth/school/register
router.post("/school/register", async (req, res) => {
  try {
    const {
      name, email, phone, schoolName, schoolType, subscriptionPlan, address
    } = req.body as Record<string, string>;

    if (!name || !email || !schoolName) {
      return res.status(400).json({ message: "name, email, and schoolName are required" });
    }

    const existing = await School.findOne({
      $or: [{ "adminInfo.email": email }, { "schoolInfo.email": email }],
    });
    if (existing) {
      return res.status(409).json({ message: "A school with this email already exists" });
    }

    const password = String(Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2));
    const hashedPassword = await bcrypt.hash(password, 12);

    const school = await School.create({
      adminInfo: { name, email, phone, password: hashedPassword, status: "Active" },
      schoolInfo: { name: schoolName, address },
      systemInfo: { schoolType: schoolType || "School", subscriptionPlan: subscriptionPlan || "Basic" },
    });

    await sendSchoolAdminCredentialsEmail(
      { name, email },
      { password, schoolName }
    );

    eventBus.publish("audit.entry", {
      action: "SCHOOL_REGISTERED",
      message: `New school registered: ${schoolName}`,
      schoolId: String(school._id),
    });

    return res.status(201).json({ success: true, schoolId: school._id });
  } catch (error) {
    console.error("SCHOOL REGISTER ERROR:", error);
    return res.status(500).json({ message: "School registration failed" });
  }
});

export default router;
```

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/auth/api/authRoutes.ts
git commit -m "feat(auth): implement authRoutes — school login, super-admin login, staff login, register"
```

---

### Task 2.3: Wire auth module into `modules/auth/index.ts`

**Files:**
- Modify: `backend/src/modules/auth/index.ts`

- [ ] **Replace the stub:**

```typescript
import type { RouteEntry } from '../../shared/types';
import authRoutes from './api/authRoutes';

const routes: RouteEntry[] = [
  { path: '/api/auth', router: authRoutes, skipAuth: true },
];

export default routes;
```

- [ ] **Build + start check:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/auth/index.ts
git commit -m "feat(auth): register /api/auth routes in module index"
```

---

### Task 2.4: Remove login handlers from `school/routes/schoolRoutes.ts`

**Files:**
- Modify: `backend/src/modules/school/routes/schoolRoutes.ts`

- [ ] **Remove these imports** (they move to auth module):

```typescript
// REMOVE these lines:
import bcrypt from "bcryptjs";
import { clearLoginFailures, getLoginBlockInfo, getLoginThrottleKey, recordLoginFailure } from "../../../core/utils/loginThrottle";
import { signAuthToken } from "../../../core/utils/jwt";
```

- [ ] **Remove these route handlers** from `schoolRoutes.ts`:
  - `router.post("/login", ...)` — school admin login (~60 lines)
  - `router.post("/super-admin-login", ...)` — super admin login (~55 lines)
  - `router.post("/register", ...)` — school registration (~80 lines)
  - `router.post("/super-admin/clear-database", ...)` — move to school data routes in Phase 3, keep for now
  - Helper functions only used by login: `isGmailAddress`, `generateRandomPassword`, `getEndDate`, `getModulesByPlan` — move to `auth/application/AuthService.ts` or keep only what school CRUD still needs

- [ ] **Keep** in `schoolRoutes.ts`: all non-auth handlers (school CRUD, geofence, modules, etc.)

- [ ] **Build:**

```bash
npm run build:backend
```

Expected: compiles clean, `/api/schools/login` no longer exists, `/api/auth/school/login` serves it.

- [ ] **Commit:**

```bash
git add backend/src/modules/school/routes/schoolRoutes.ts
git commit -m "refactor(school): remove login/register handlers — moved to auth module"
```

---

### Task 2.5: Remove login handler from `staff/routes/staffRoutes.ts`

**Files:**
- Modify: `backend/src/modules/staff/routes/staffRoutes.ts`

- [ ] **Remove these imports:**

```typescript
// REMOVE:
import bcrypt from "bcryptjs";
import { clearLoginFailures, getLoginBlockInfo, getLoginThrottleKey, recordLoginFailure } from "../../../core/utils/loginThrottle";
import { signAuthToken } from "../../../core/utils/jwt";
```

- [ ] **Remove** `router.post("/login", ...)` handler (~70 lines). The new endpoint is at `/api/auth/staff/login`.

- [ ] **Remove** `import School from "../../school/models/School"` only if School is no longer used elsewhere in staffRoutes. Check for other usages first.

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/staff/routes/staffRoutes.ts
git commit -m "refactor(staff): remove login handler — moved to auth module"
```

---

### Task 2.6: Update frontend login URLs in `lib/auth.ts`

**Files:**
- Modify: `frontend/src/lib/auth.ts`

- [ ] **In `loginSchoolAdmin`** — change:

```typescript
// FROM:
const { response, data } = await postJsonWithFallback("/api/schools/login", { email, password });
// TO:
const { response, data } = await postJsonWithFallback("/api/auth/school/login", { email, password });
```

- [ ] **In `loginTeacher`** — change:

```typescript
// FROM:
const { response, data } = await postJsonWithFallback("/api/staff/login", { email, password });
// TO:
const { response, data } = await postJsonWithFallback("/api/auth/staff/login", { email, password });
```

- [ ] **In `loginSuperAdmin`** — change:

```typescript
// FROM:
const { response, data } = await postJsonWithFallback("/api/schools/super-admin-login", { email, password });
// TO:
const { response, data } = await postJsonWithFallback("/api/auth/super-admin/login", { email, password });
```

- [ ] **Build frontend:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/lib/auth.ts
git commit -m "refactor(frontend/auth): update login URLs to /api/auth/* endpoints"
```

---

### Task 2.7: Break `finance → students` circular dependency

**Files:**
- Modify: `backend/src/modules/finance/routes/financeRoutes.ts`
- Modify: `backend/src/modules/finance/services/financeService.ts`
- Modify: `backend/src/modules/finance/seeds/financeSeeds.ts`

**Goal:** Finance module must never import from `students/`. Query `StudentFeeAssignment` (finance's own model) using `studentId` only.

- [ ] **In `financeRoutes.ts`** — remove:

```typescript
// REMOVE:
import Student from "../../students/models/Student";
import Class from "../../academics/models/Class";
import Staff from "../../staff/models/Staff";
```

- [ ] **Replace Student/Class/Staff usages in `financeRoutes.ts`:** Any endpoint that currently joins Student to get name/email should instead use the `studentName`/`studentEmail` fields on `StudentFeeAssignment`. If those fields don't exist on the schema, add them as optional String fields in `models/StudentFeeAssignment.ts`. The receipt email endpoint should receive student name/email from the request body or from the fee assignment record.

- [ ] **In `financeService.ts`** — remove:

```typescript
// REMOVE:
import Student from "../../students/models/Student";
import Class from "../../academics/models/Class";
```

- [ ] **Replace `Student.find(...)` calls** in financeService with queries on `StudentFeeAssignment` filtered by `schoolId` and optionally `className`. The service already has access to `StudentFeeAssignment` which stores class and student info.

- [ ] **In `financeSeeds.ts`** — remove:

```typescript
// REMOVE:
import Student from "../../students/models/Student";
```

Replace Student lookups with the seed data already embedded in `StudentFeeAssignment` inserts (seeds typically hard-code IDs).

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/finance/
git commit -m "refactor(finance): remove Student/Class/Staff imports — break students↔finance circular"
```

---

### Task 2.8: Break `students → finance` circular dependency

**Files:**
- Modify: `backend/src/modules/students/routes/studentRoutes.ts`

- [ ] **Remove these imports:**

```typescript
// REMOVE:
import Finance from "../../finance/models/Finance";
import {
  buildAppliedStudentFeeStructure,
  findClassFeeStructure,
  normalizeClassFeeStructure,
} from "../../finance/utils/classFeeStructure";
```

- [ ] **Identify every usage of `Finance` and `classFeeStructure` utils** in `studentRoutes.ts`. There will be endpoints that return finance-joined data.

- [ ] **For each usage:**
  - Endpoints that fetch `Finance` records for a student → remove the join, return the student data without embedded finance. Frontend already has a separate finance module API for fee data.
  - Endpoints that call `buildAppliedStudentFeeStructure` / `findClassFeeStructure` → these calculate fee structures. Move the call to a direct `StudentFeeAssignment` query instead, or return only the student record and let the frontend call `/api/finance/:schoolId/...` for fee info.

- [ ] **Also remove `Class` and `School` and `Transport` cross-module imports** if those cause circular issues. Check `studentRoutes.ts` imports for any models not in the students module itself. Remove and simplify the affected endpoint responses.

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/students/routes/studentRoutes.ts
git commit -m "refactor(students): remove Finance/classFeeStructure imports — break students↔finance circular"
```

---

### Task 2.9: Phase 2 build + smoke test

- [ ] **Full build:**

```bash
npm run build
```

- [ ] **Start backend in another terminal and hit health endpoint:**

```bash
npm run dev:backend
# In another terminal:
curl http://localhost:5000/api/health
```

Expected: `{"ok":true,"dbConnected":...}`

- [ ] **Commit if any stray fixes needed.**

---

## PHASE 3 — Split God Routes

---

### Task 3.1: Split `school/routes/schoolRoutes.ts` — profile vs data

**Files:**
- Create: `backend/src/modules/school/routes/schoolProfileRoutes.ts`
- Create: `backend/src/modules/school/routes/schoolDataRoutes.ts`
- Modify: `backend/src/modules/school/routes/schoolRoutes.ts` (becomes thin re-export or deleted)
- Modify: `backend/src/modules/school/index.ts`

**Split:**
- `schoolProfileRoutes.ts` — school CRUD: `GET /:id`, `PUT /:id`, `PATCH /:id/modules`, geofence endpoints, `GET /` list. (~250L)
- `schoolDataRoutes.ts` — super-admin bulk operations: clear-database, bulk export, stats aggregation. (~300L)
- `schoolRoutes.ts` — whatever remains of non-auth, non-split handlers, or delete and route from index.

- [ ] **Create `schoolProfileRoutes.ts`** — move CRUD handlers, keep only `School` model import.

- [ ] **Create `schoolDataRoutes.ts`** — move bulk/export/delete handlers, import only what they need.

- [ ] **Update `school/index.ts`:**

```typescript
import type { RouteEntry } from '../../shared/types';
import schoolProfileRoutes from './routes/schoolProfileRoutes';
import schoolDataRoutes from './routes/schoolDataRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const routes: RouteEntry[] = [
  { path: '/api/schools', router: schoolProfileRoutes, skipAuth: false },
  { path: '/api/schools', router: schoolDataRoutes, skipAuth: false },
  { path: '/api/dashboard', router: dashboardRoutes },
];

export default routes;
```

Note: Two entries with the same path is fine — Express merges them. Verify the duplicate-path guard in moduleLoader doesn't fire (it checks exact `path` string per `RouteEntry` — two entries with `/api/schools` from the same module may need to be merged into one router).

Alternative: merge into one router export from school module that combines both route files.

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/school/
git commit -m "refactor(school): split schoolRoutes into profileRoutes + dataRoutes"
```

---

### Task 3.2: Split `students/routes/studentRoutes.ts`

**Files:**
- Create: `backend/src/modules/students/routes/studentCrudRoutes.ts`
- Create: `backend/src/modules/students/routes/studentProfileRoutes.ts`
- Modify: `backend/src/modules/students/index.ts`

**Split:**
- `studentCrudRoutes.ts` — list, create, update, delete, import students. Imports: `Student`, `School` (for school validation), `createLog`→`eventBus`.
- `studentProfileRoutes.ts` — get student profile, transport assignment, document upload. Imports: `Student`, `Transport` (read-only, no circular since transport doesn't import students).

- [ ] **Move handlers** from `studentRoutes.ts` into the two new files.

- [ ] **Update `students/index.ts`:**

```typescript
import type { RouteEntry } from '../../shared/types';
import { Router } from 'express';
import studentCrudRoutes from './routes/studentCrudRoutes';
import studentProfileRoutes from './routes/studentProfileRoutes';

const combinedRouter = Router();
combinedRouter.use(studentCrudRoutes);
combinedRouter.use(studentProfileRoutes);

const routes: RouteEntry[] = [
  { path: '/api/students', router: combinedRouter },
];

export default routes;
```

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/students/
git commit -m "refactor(students): split studentRoutes into crudRoutes + profileRoutes"
```

---

### Task 3.3: Extract `ImportOrchestrationService` from data-import

**Files:**
- Create: `backend/src/modules/data-import/application/ImportOrchestrationService.ts`
- Modify: `backend/src/modules/data-import/routes/dataImportRoutes.ts`

- [ ] **Create `ImportOrchestrationService.ts`** — moves OCR, XLSX, AI parsing out of route handlers:

```typescript
import { createWorker } from "tesseract.js";
import * as XLSX from "xlsx";
import { getEnv } from "../../../core/config/env";

export interface ImportResult {
  success: boolean;
  inserted: number;
  errors: string[];
}

export class ImportOrchestrationService {
  async parseXlsxBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  }

  async ocrImageBuffer(buffer: Buffer): Promise<string> {
    const worker = await createWorker("eng");
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
  }

  async parseWithAI(text: string, prompt: string): Promise<unknown> {
    const { groqApiKey, groqModel } = getEnv();
    if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqApiKey}` },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error(`GROQ API error: ${response.status}`);
    const json = await response.json() as { choices: { message: { content: string } }[] };
    return JSON.parse(json.choices[0].message.content);
  }
}

export const importOrchestrationService = new ImportOrchestrationService();
```

- [ ] **Refactor `dataImportRoutes.ts`** — route handlers become:
  1. Validate request (file present, schoolId valid)
  2. Call `importOrchestrationService.parseXlsxBuffer()` or `.ocrImageBuffer()`
  3. Save to DB via direct model calls (data-import already has cross-module imports for Class, Student, etc. — these cross-imports remain but are now in a service, not in the route)
  4. Return response

Goal: reduce `dataImportRoutes.ts` from 1471L to under 400L by moving parsing logic into service.

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/data-import/
git commit -m "refactor(data-import): extract ImportOrchestrationService — thin route shell"
```

---

### Task 3.4: Move inline finance route logic to `financeService.ts`

**Files:**
- Modify: `backend/src/modules/finance/services/financeService.ts`
- Modify: `backend/src/modules/finance/routes/financeRoutes.ts`

- [ ] **Identify all route handlers** in `financeRoutes.ts` that contain inline `mongoose.*` calls (35 total). Move each handler's business logic into a corresponding method on `financeService`.

Pattern for each:

```typescript
// BEFORE (in financeRoutes.ts — 50 lines inline):
router.get("/:schoolId/summary", async (req, res) => {
  const assignments = await StudentFeeAssignment.find({ school_id: req.params.schoolId })
    .populate("...");
  // 40 more lines of transformation logic
  res.json(result);
});

// AFTER (route file — 6 lines):
router.get("/:schoolId/summary", async (req, res) => {
  try {
    const result = await financeService.getStudentFeeSummaries({ schoolId: req.params.schoolId, ...req.query });
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : "Finance error" });
  }
});
```

- [ ] **Move logic for these handler groups** into financeService methods:
  - Fee structure CRUD → `financeService.getFeeStructures`, `createFeeStructure`, `updateFeeStructure`
  - Student fee assignment → `financeService.assignFee`, `getStudentFees`
  - Payment recording → `financeService.recordPayment`, `getPaymentHistory`
  - Receipt generation → `financeService.generateReceipt`
  - Salary/payroll → already has `salaryStructureService.ts`
  - Banking → already in `bankingRoutes.ts` (separate, leave it)

- [ ] **Build:**

```bash
npm run build:backend
```

- [ ] **Commit:**

```bash
git add backend/src/modules/finance/
git commit -m "refactor(finance): move 35 inline mongoose ops to financeService — thin route shell"
```

---

### Task 3.5: Phase 3 full build + smoke test

- [ ] **Build:**

```bash
npm run build
```

- [ ] **Start backend:**

```bash
npm run dev:backend
```

- [ ] **Confirm routes work:**

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/students/SCHOOL_ID   # replace with real school ID
```

- [ ] **Commit any fixes.**

---

## PHASE 4 — Frontend Migration

---

### Task 4.1: Migrate `contexts/RoleContext.tsx` — localStorage → session

**Files:**
- Modify: `frontend/src/contexts/RoleContext.tsx`

- [ ] **Add import:**

```typescript
import { session } from "@/lib/session";
```

- [ ] **Replace all direct `localStorage.*` calls:**

| Find | Replace |
|------|---------|
| `localStorage.getItem("user")` | `session.getUser()` — note: returns parsed object, not string |
| `localStorage.removeItem("user")` | (handled by `session.clearAll()`) |
| `localStorage.getItem("role")` | `session.getRole()` |
| `localStorage.removeItem("role")` | (handled by `session.clearAll()`) |
| `localStorage.setItem("role", nextRole)` | `session.setRole(nextRole)` |
| `localStorage.getItem("teacherPermissions")` | `session.getTeacherPermissions()` — returns parsed |
| `localStorage.setItem("teacherPermissions", JSON.stringify(...))` | `session.setTeacherPermissions(nextPermissions)` |

Note: `session.getUser()` returns the parsed object directly. Remove `JSON.parse(...)` wrappers.

- [ ] **Build:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/contexts/RoleContext.tsx
git commit -m "refactor(RoleContext): use lib/session — remove direct localStorage"
```

---

### Task 4.2: Migrate `lib/auth.ts` — localStorage → session

**Files:**
- Modify: `frontend/src/lib/auth.ts`

- [ ] **Add import:**

```typescript
import { session } from "@/lib/session";
```

- [ ] **Replace:**

| Find | Replace |
|------|---------|
| `localStorage.removeItem("authToken")` etc. in `clearStoredSessions` | `session.clearAll()` |
| `localStorage.setItem("teacherPermissions", ...)` in `persistTeacherPermissions` | `session.setTeacherPermissions(teacherPermissions)` |
| `localStorage.setItem("user", ...)` in `persistRoleUser` | `session.setUser(user)` |
| `localStorage.setItem("role", ...)` in `persistRoleUser` | `session.setRole(user.role)` |
| `localStorage.setItem("authToken", token)` in `persistAuthToken` | `session.setAuthToken(token)` |
| `localStorage.getItem("authToken")` in `readAuthToken` | `session.getAuthToken()` |
| `localStorage.setItem("school", ...)` in `persistSchoolAdminSession` | `session.setSchool(session_arg)` |
| `localStorage.setItem("teacher", ...)` in `persistTeacherSession` | `session.setTeacher(session.teacher)` |
| `localStorage.setItem("school", ...)` in `persistTeacherSession` | `session.setSchool(session_arg.school)` |

- [ ] **Build:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/lib/auth.ts
git commit -m "refactor(auth): use lib/session — remove direct localStorage"
```

---

### Task 4.3: Migrate remaining localStorage violations — batch

**Files:** 20+ files listed in File Map under Phase 4.

**Pattern per file:**

```typescript
// ADD at top (if not already imported):
import { session } from "@/lib/session";

// REPLACE:
JSON.parse(localStorage.getItem("school") || "{}") → session.getSchool() ?? {}
JSON.parse(localStorage.getItem("school") || "null") → session.getSchool()
localStorage.getItem("authToken") → session.getAuthToken()
localStorage.setItem("school", JSON.stringify(x)) → session.setSchool(x)
JSON.parse(localStorage.getItem("teacher") ?? "null")?._id → session.getTeacher()?._id
```

- [ ] **`components/RoleSwitcher.tsx`** — 3 hits: `school` write, `teacher` remove, `teacher`+`school` write.

- [ ] **`components/SalaryStructureModule.tsx`** — 2 hits: `school` read (line 65), `authToken` read (line 68).

- [ ] **`components/SchoolAdminDashboard.tsx`** — uses custom dismissed-key storage (not session keys). Leave the `getDismissedKey`/`saveDismissed` pattern — it's UI state, not auth state. These are fine.

- [ ] **`components/TopNavbar.tsx`** — 1 hit at line 115: reads an unspecified key via `localStorage.getItem(key)`. Check what key it reads and either route through session or leave if it's custom UI state.

- [ ] **`modules/academics/AcademicsModule.tsx`** — 1 hit: `teacher._id` read (line 36). Replace with `session.getTeacher()?._id ?? ""`.

- [ ] **`modules/attendance/AttendenceModule.tsx`** — 4 hits including 2 writes to `school` key (lines 807, 844). Replace writes with `session.setSchool(...)`.

- [ ] **`modules/classes/ClassModule.tsx`** — 2 hits: school reads. Replace with `session.getSchool()`.

- [ ] **`modules/communication/CommunicationPage.tsx`** — 4 hits: custom announcement meta/draft keys. These are module-specific storage (not auth keys) — leave as-is or move to a module-scoped helper. No schema conflict.

- [ ] **`modules/communication/CommunicationCenterPage.tsx`** — 4 hits: same pattern as above — custom keys. Leave.

- [ ] **`modules/data-import/DataImportModule.tsx`** — 2 hits: `school` read + `authToken` read. Replace with session.

- [ ] **`modules/downloads/DownloadsModule.tsx`** — 2 hits: `school` read. Replace with session.

- [ ] **`modules/exams/ExamsModule.tsx`** — 2 hits: `school` read. Replace with session.

- [ ] **`modules/finance/FinanceModule.tsx`** — 24 hits (largest offender). All are `school` reads and `authToken` reads. Replace all with `session.getSchool()` and `session.getAuthToken()`.

- [ ] **`modules/finance/components/*.tsx`** — 10 files, each with 2-3 `localStorage.getItem("authToken")` calls in Authorization headers. Replace with `session.getAuthToken()`.

- [ ] **`modules/hr/HRModule.tsx`** — 3 hits: `school` read, `authToken`. Replace with session.

- [ ] **`modules/house/HouseModule.tsx`** — 3 hits: `school` read. Replace.

- [ ] **`modules/students/StudentModule.tsx`** — 2 hits. Replace.

- [ ] **`modules/transport/TransportModule.tsx`** — 2 hits. Replace.

- [ ] **`pages/school-admin/SchoolAdminSidebar.tsx`** — 2 hits. Replace.

- [ ] **`pages/teacher/modules/*.tsx`** — 6 files × 2 hits avg. Replace.

- [ ] **`services/timetableService.ts`** — 2 hits. Replace.

- [ ] **Build after all migrations:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/
git commit -m "refactor(frontend): migrate 127 localStorage accesses to lib/session"
```

---

### Task 4.4: Migrate `modules/finance/components/*.tsx` — raw fetch → apiClient

**Files:** 10 expense component files (AddExpenseForm, BudgetMonitoring, ExpenseApprovalWorkflow, ExpenseAuditLog, ExpenseCategoryManagement, ExpenseDashboard, ExpenseList, VendorManagement, FinanceDashboard, BankingModule)

**Pattern:**

```typescript
// ADD import:
import { apiClient } from "@/lib/apiClient";

// BEFORE:
const res = await fetch(`${API_URL}/api/finance/...`, {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
  method: "POST",
  body: JSON.stringify(data),
});
const json = await res.json();

// AFTER:
const json = await apiClient.post(`/api/finance/...`, data);
```

For file upload (multipart):
```typescript
// BEFORE:
const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });

// AFTER:
const json = await apiClient.postForm(`/api/finance/...`, formData);
```

- [ ] **Process all 10 finance component files** using the pattern above.

- [ ] **Build:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/modules/finance/
git commit -m "refactor(finance/components): replace raw fetch with apiClient"
```

---

### Task 4.5: Migrate `modules/finance/FinanceModule.tsx` — 30 raw fetches

**Files:**
- Modify: `frontend/src/modules/finance/FinanceModule.tsx`

- [ ] **Add import:**

```typescript
import { apiClient } from "@/lib/apiClient";
```

- [ ] **Replace all 30 `await fetch(...)` calls** with equivalent `apiClient.get/post/put/delete` calls. Each fetch call follows the same pattern — API_URL + path + auth header. apiClient handles all of this.

- [ ] **Remove the manual Authorization header construction** from all fetch calls in this file.

- [ ] **Build:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/modules/finance/FinanceModule.tsx
git commit -m "refactor(FinanceModule): replace 30 raw fetch calls with apiClient"
```

---

### Task 4.6: Migrate raw fetch in remaining frontend modules

**Files:** 20 remaining files (admissions, attendance, communication, classes, data-import, hr, inventory, library, students, transport, social-media, survey, staff, exams, etc.)

**Same pattern as Task 4.4 and 4.5.** For each file:
1. Add `import { apiClient } from "@/lib/apiClient";`
2. Remove `API_URL` import if no longer used directly
3. Replace `await fetch(${API_URL}/api/..., { headers: { Authorization: Bearer ${token} }, ... })` with `await apiClient.get/post/put/delete(/api/...)`

- [ ] **`modules/admissions/AdmissionsModule.tsx`** — 10 raw fetches.

- [ ] **`pages/teacher/modules/AttendanceModule.tsx`** — 9 raw fetches.

- [ ] **`modules/communication/CommunicationCenterPage.tsx`** — 9 raw fetches.

- [ ] **`modules/classes/ClassModule.tsx`** — 8 raw fetches.

- [ ] **`modules/inventory/InventoryModule.tsx`** — 7 raw fetches.

- [ ] **`modules/data-import/DataImportModule.tsx`** — 7 raw fetches.

- [ ] **`modules/transport/TransportModule.tsx`** — 6 raw fetches.

- [ ] **`modules/students/StudentModule.tsx`** — 6 raw fetches.

- [ ] **`modules/exams/ExamsModule.tsx`** — 6 raw fetches.

- [ ] **`modules/finance/components/BankingModule.tsx`** — 6 raw fetches.

- [ ] **`modules/staff/StaffModule.tsx`** — 5 raw fetches.

- [ ] **`modules/social-media/SocialMediaModule.tsx`** — 5 raw fetches.

- [ ] **`modules/library/LibraryModule.tsx`** — 5 raw fetches.

- [ ] **`modules/survey/SurveyModule.tsx`** — 4 raw fetches.

- [ ] **`pages/teacher/modules/MarksModule.tsx`** — 4 raw fetches.

- [ ] **`pages/teacher/modules/DigitalClassroomModule.tsx`** — 4 raw fetches.

- [ ] **`pages/teacher/modules/CommunicationModule.tsx`** — 4 raw fetches.

- [ ] **`modules/downloads/DownloadsModule.tsx`** — 4 raw fetches.

- [ ] **`modules/communication/CommunicationPage.tsx`** — 4 raw fetches.

- [ ] **`modules/academics/api/classService.ts`** and **`assignmentService.ts`** — 5 fetches each.

- [ ] **Build:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/
git commit -m "refactor(frontend): replace raw fetch with apiClient across 20 modules"
```

---

### Task 4.7: Remove duplicate `VITE_API_URL` parsers

**Files:**
- Modify: `frontend/src/modules/hr/HRModule.tsx`
- Modify: `frontend/src/modules/social-media/SocialMediaModule.tsx`
- Modify: `frontend/src/modules/transport/TransportModule.tsx`
- Modify: `frontend/src/services/timetableService.ts`

- [ ] **In `hr/HRModule.tsx`** — remove:

```typescript
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
```

Since all fetches are now through `apiClient`, `API_BASE` is no longer referenced.

- [ ] **Same for `social-media/SocialMediaModule.tsx`** and **`transport/TransportModule.tsx`**.

- [ ] **In `services/timetableService.ts`** — remove:

```typescript
const RAW_API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_BASE_URL = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL}/api`;
```

Add instead:
```typescript
import { API_URL } from "@/lib/api";
const API_BASE_URL = `${API_URL}/api`;
```

Or migrate timetableService fetches to `apiClient` (preferred).

- [ ] **Build:**

```bash
npm run build:frontend
```

- [ ] **Commit:**

```bash
git add frontend/src/modules/hr/HRModule.tsx \
        frontend/src/modules/social-media/SocialMediaModule.tsx \
        frontend/src/modules/transport/TransportModule.tsx \
        frontend/src/services/timetableService.ts
git commit -m "refactor(frontend): remove duplicate VITE_API_URL parsers — use lib/api"
```

---

### Task 4.8: Final build verification

- [ ] **Backend build:**

```bash
npm run build:backend
```

Expected: clean compile, 0 errors.

- [ ] **Frontend build:**

```bash
npm run build:frontend
```

Expected: clean compile, only existing chunk-size warnings (not new errors).

- [ ] **Start backend:**

```bash
npm run dev:backend
```

Expected: starts on port 5000, connects to MongoDB.

- [ ] **Update `docs/COUPLING_AUDIT.md`** — add a note at the top:

```markdown
> **Status:** All violations fixed as of 2026-05-23. See `docs/RESTRUCTURING_SUMMARY.md` for change log.
```

- [ ] **Final commit:**

```bash
git add docs/COUPLING_AUDIT.md
git commit -m "docs: mark coupling audit violations as resolved"
```
