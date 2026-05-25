# SvelteKit ERP Migration — Design Spec

**Date:** 2026-05-25  
**Status:** Approved  
**Scope:** Full frontend migration from React 18 / Vite to SvelteKit 2  

---

## 1. Context & Goals

### Current stack
- Framework: React 18 + TypeScript + Vite
- Routing: react-router-dom v6 (client-side only)
- UI: Radix UI / shadcn-inspired component library + Ant Design + MUI
- Data: TanStack Query + custom `apiClient.ts` fetch wrapper
- Auth: JWT stored in `localStorage`, role checked in component tree
- Modules: 20+ feature modules (academics, admissions, attendance, finance, hr, exams, timetable, transport, etc.)
- Roles: `super-admin`, `school-admin`, `teacher`
- i18n: none (all hardcoded English)

### Migration goals
1. SvelteKit 2 + TypeScript + TailwindCSS + Vite
2. File-based routing with SSR auth guards
3. Modular architecture — each module self-contained (components, stores, services, types)
4. shadcn-svelte for UI components
5. svelte-i18n with English first, Hindi/Marathi structure ready
6. Centralized API client with JWT via httpOnly cookies
7. Role-based navigation + server-side protected routes
8. Lazy loading / code splitting (SvelteKit native)
9. Module boundaries that support future micro-frontend extraction

### Out of scope for this migration
- Backend changes beyond adding `Set-Cookie` + CORS `credentials: include`
- Real Hindi / Marathi translations (locale files created, filled later)
- New features beyond functional parity with current React app

---

## 2. Migration Approach

**Strategy: Parallel folder, module-by-module**

- New SvelteKit app lives at `erp_portal/frontend-svelte/`
- Existing React app at `erp_portal/frontend/` stays untouched until cut-over
- Foundation built first, then modules in priority batches
- Root `package.json` scripts updated to run either or both apps

**Module priority order:**
1. Foundation (scaffold, auth, layout, API client, core UI)
2. Core modules: `auth`, `dashboard`, `finance`, `attendance`, `hr`, `exams`
3. Extended modules: all remaining 15+ modules ported after core verified

---

## 3. Folder Structure

```
erp_portal/
├── frontend/                        ← existing React app (read-only during migration)
└── frontend-svelte/
    ├── src/
    │   ├── app.html                 ← HTML shell
    │   ├── app.css                  ← global styles (Tailwind imports)
    │   ├── hooks.server.ts          ← SSR: parse cookie → locals.user
    │   ├── lib/
    │   │   ├── api/
    │   │   │   ├── client.ts        ← centralized fetch wrapper
    │   │   │   └── endpoints.ts     ← API URL constants
    │   │   ├── auth/
    │   │   │   ├── stores.ts        ← user/session writable stores
    │   │   │   └── utils.ts         ← cookie read/write helpers
    │   │   ├── i18n/
    │   │   │   └── index.ts         ← svelte-i18n init + locale loading
    │   │   ├── components/          ← shadcn-svelte UI primitives
    │   │   │   ├── ui/              ← Button, Card, Table, Dialog, etc.
    │   │   │   └── layout/          ← Sidebar, TopNavbar, AppShell
    │   │   └── types/
    │   │       └── index.ts         ← shared cross-module types (UserRole, User)
    │   ├── modules/
    │   │   ├── auth/
    │   │   ├── dashboard/
    │   │   ├── finance/
    │   │   ├── attendance/
    │   │   ├── hr/
    │   │   ├── exams/
    │   │   ├── academics/
    │   │   ├── admissions/
    │   │   ├── classes/
    │   │   ├── communication/
    │   │   ├── hostel/
    │   │   ├── house/
    │   │   ├── inventory/
    │   │   ├── library/
    │   │   ├── maintenance/
    │   │   ├── salary/
    │   │   ├── sports/
    │   │   ├── staff/
    │   │   ├── students/
    │   │   ├── support/
    │   │   ├── survey/
    │   │   ├── timetable/
    │   │   ├── transport/
    │   │   └── visitor/
    │   └── routes/
    │       ├── +layout.svelte       ← root layout (i18n init, theme)
    │       ├── +layout.server.ts    ← inject locals.user from cookie
    │       ├── +error.svelte        ← global error boundary
    │       ├── (public)/            ← unauthenticated route group
    │       │   ├── +layout.svelte   ← minimal public layout
    │       │   ├── +page.svelte     ← landing page (/)
    │       │   ├── login/           ← teacher login
    │       │   ├── school-login/    ← school admin login
    │       │   ├── super-login/     ← super admin login
    │       │   └── signup/          ← school signup
    │       └── (app)/               ← authenticated route group
    │           ├── +layout.svelte   ← AppShell (sidebar + topnav)
    │           ├── +layout.server.ts← auth guard + role check
    │           ├── +error.svelte    ← app-level error boundary
    │           ├── dashboard/       ← super-admin dashboard
    │           │   └── [page]/
    │           ├── school/          ← school-admin root
    │           │   └── [module]/    ← dynamic module routing
    │           └── teacher/         ← teacher root
    │               └── [module]/    ← dynamic module routing
    ├── locales/
    │   ├── en.json                  ← English strings (all keys)
    │   ├── hi.json                  ← Hindi (keys only, fill later)
    │   └── mr.json                  ← Marathi (keys only, fill later)
    ├── static/
    │   └── images/
    ├── svelte.config.js
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

### Per-module internal structure
Every module in `src/modules/` follows:
```
modules/[name]/
├── components/     ← .svelte UI components
├── stores/         ← writable/derived Svelte stores
├── services/       ← API call functions (use $lib/api/client)
├── types/          ← TS interfaces specific to this module
└── index.ts        ← public barrel export
```

**Module boundary rule:** Modules import only from `$lib/` and their own internals. No cross-module store imports. Module-to-module data passes through SvelteKit `load()` or URL params.

---

## 4. Authentication & Routing

### Auth flow

1. User submits login form (public route)
2. Frontend POSTs to `/api/auth/[role]/login`
3. Backend responds with `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict`
4. `hooks.server.ts` parses cookie on every request:
   ```ts
   export const handle = async ({ event, resolve }) => {
     const token = event.cookies.get('token');
     if (token) {
       // Decode JWT claims only (no re-verification — signature validated by API layer).
       // Use a library like `jose` to decode without verifying secret.
       event.locals.user = decodeJwtClaims(token); // { id, role, email }
     }
     return resolve(event);
   };
   ```
5. All `(app)/` routes check `locals.user` in `+layout.server.ts`
6. Logout: DELETE `/api/auth/logout` → backend clears cookie → redirect to `/`

### Role-based routing guard
```ts
// (app)/+layout.server.ts
export const load = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { role } = locals.user;
  const path = url.pathname;

  if (path.startsWith('/dashboard') && role !== 'super-admin')
    throw redirect(303, getRoleHome(role));
  if (path.startsWith('/school') && role !== 'school-admin')
    throw redirect(303, getRoleHome(role));
  if (path.startsWith('/teacher') && role !== 'teacher')
    throw redirect(303, getRoleHome(role));

  return { user: locals.user };
};
```

### Backend requirements
- Login endpoints must set `Set-Cookie` header (not return token in body)
- CORS must include `credentials: true` and `Access-Control-Allow-Credentials: true`
- Logout endpoint must clear the cookie

---

## 5. API Client

**Location:** `src/lib/api/client.ts`

```ts
// Conceptual interface
export const api = {
  get:      <T>(path: string, opts?: FetchOpts) => Promise<T>,
  post:     <T>(path: string, body?: unknown) => Promise<T>,
  put:      <T>(path: string, body?: unknown) => Promise<T>,
  patch:    <T>(path: string, body?: unknown) => Promise<T>,
  delete:   <T>(path: string) => Promise<T>,
  postForm: <T>(path: string, form: FormData) => Promise<T>,
};
```

- Works in both SSR context (`+page.server.ts`) and client context (`+page.svelte`)
- In SSR: receives `fetch` from SvelteKit's `load({ fetch })` argument (handles cookie forwarding)
- In client: uses native `fetch` with `credentials: 'include'`
- Throws typed `ApiError({ status, message })` on non-OK responses
- URL from `$lib/api/endpoints.ts` or `PUBLIC_API_URL` env var

---

## 6. State Management

### Global state (`$lib/auth/stores.ts`)
```ts
export const currentUser = writable<User | null>(null);
export const userRole = derived(currentUser, u => u?.role ?? null);
```
Hydrated from `$page.data.user` in root `+layout.svelte`.

### Module state (per-module `stores/`)
Each module owns its own stores. Pattern:
```ts
// modules/finance/stores/financeStore.ts
export const studentFees = writable<StudentFeeSummary[]>([]);
export const isLoading = writable(false);
export const error = writable<string | null>(null);
export const totalDue = derived(studentFees, $f => $f.reduce((s, f) => s + f.dueAmount, 0));
```

### Data flow
```
SvelteKit load() → page data prop → onMount → hydrate module stores
User action → service call → store update → reactive UI update
```

Store cleanup: `onDestroy(() => storeRef.set(initialValue))` in module root component.

### Cross-module data
No cross-module store imports. When module A needs data from module B:
- Via URL params / query string
- Via SvelteKit parent `load()` data
- Via shared `$lib/` types only (no implementation coupling)

---

## 7. UI / Layout

### Shell layout (authenticated)
```
┌───────────────────────────────────────────────────────┐
│  TopNavbar: logo | breadcrumb | locale | notifications │
│             | user avatar + dropdown                   │
├──────────┬────────────────────────────────────────────┤
│          │                                            │
│ Sidebar  │  <slot />                                  │
│          │  Module content renders here               │
│ role-    │                                            │
│ specific │  Loading states: skeleton placeholders     │
│ nav      │  Errors: inline error with retry           │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

### Sidebar nav items by role
| Role | Nav items |
|---|---|
| super-admin | Dashboard, Schools, School Admins, Subscriptions, Logs, Settings |
| school-admin | Dashboard + session-enabled module list |
| teacher | Teacher-permissioned module list only |

### Core UI components (shadcn-svelte)
All sourced from `shadcn-svelte`. Components included:
`Button`, `Card`, `Table`, `Badge`, `Dialog`, `Sheet`, `Select`, `Input`, `Textarea`,
`Form`, `Toast`, `Skeleton`, `Tabs`, `Breadcrumb`, `Avatar`, `DropdownMenu`,
`Separator`, `Tooltip`, `Progress`, `Switch`, `Checkbox`, `RadioGroup`,
`Accordion`, `Popover`, `Calendar`, `ScrollArea`

### Loading states
- Route-level: SvelteKit `+loading.svelte` per route group (skeleton layout)
- Component-level: `isLoading` store → `<Skeleton>` placeholders
- Mutation: button loading state during form submit

### Error boundaries
- Global: `+error.svelte` at `(app)/` root — catches unhandled server/load errors
- Module-level: `error` writable store → inline error UI with retry action

---

## 8. i18n

**Library:** `svelte-i18n`  
**Init:** root `+layout.svelte` on mount  
**Active locales:** English only at launch  
**Future locales:** `hi.json` and `mr.json` keys created, values = English until translated

**Key naming convention:**
```
[module].[component].[key]
finance.dashboard.totalDue
auth.login.emailLabel
common.actions.save
common.status.loading
```

**Usage in templates:**
```svelte
<script>
  import { _ } from 'svelte-i18n';
</script>
<p>{$_('finance.dashboard.totalDue')}</p>
```

**Locale switcher:** In TopNavbar. Updates `$locale` store from svelte-i18n. Persists selection in `localStorage`.

---

## 9. Performance

- **Code splitting:** Automatic per SvelteKit route (each route = separate JS chunk)
- **Lazy module components:** Dynamic `import()` for heavy module views
- **Bundle:** Vite tree-shaking; shadcn-svelte only installs components explicitly added
- **Images:** Served from `static/`, referenced by path
- **Font loading:** System font stack via Tailwind by default; if custom font added, use `font-display: swap`

---

## 10. Module Registration (Future Micro-Frontend Prep)

Each module exports a registration object for future extraction:
```ts
// modules/finance/index.ts
export const financeModule = {
  id: 'finance',
  routes: [...],    // route segment paths
  navItem: { label: 'Finance', icon: 'DollarSign', roles: ['school-admin'] },
  stores: [...],    // store refs for cleanup
};
```

A central `moduleRegistry.ts` in `$lib/` maps module IDs to their registration. Sidebar and routing load from registry. This pattern allows a future step to extract any module as a standalone SvelteKit app with a defined API surface.

---

## 11. Environment Configuration

```env
# frontend-svelte/.env
PUBLIC_API_URL=http://localhost:5000
```

```env
# frontend-svelte/.env.production
PUBLIC_API_URL=https://api.your-erp.com
```

Accessed via SvelteKit's `$env/static/public` import.

---

## 12. Developer Experience

**Path aliases (`tsconfig.json` + `vite.config.ts`):**
```json
{
  "$lib": "src/lib",
  "$modules": "src/modules",
  "$routes": "src/routes"
}
```

**Root `package.json` scripts updated:**
```json
{
  "dev:svelte": "npm run dev --prefix frontend-svelte",
  "build:svelte": "npm run build --prefix frontend-svelte",
  "dev:react": "npm run dev --prefix frontend"
}
```

**Linting:** ESLint + `eslint-plugin-svelte` + Prettier with `prettier-plugin-svelte`

**Formatting:** Prettier via `prettier-plugin-svelte`; enforced in pre-commit hook (optional)

---

## 13. Backend Changes Required

| Change | Reason | Scope |
|---|---|---|
| `Set-Cookie` on login responses | SSR auth reads cookie, not body | Auth endpoints only |
| CORS `credentials: true` | `fetch` with `credentials: 'include'` | Express CORS config |
| `Access-Control-Allow-Credentials: true` header | Required by browser for credentialed requests | Express CORS config |
| Logout clears cookie | Prevents stale sessions | New or updated logout endpoint |

---

## 14. Migration Documentation Output

Implementation must produce:
1. `frontend-svelte/` — fully working SvelteKit app
2. `docs/migration/FOLDER_STRUCTURE.md` — annotated directory tree
3. `docs/migration/ARCHITECTURE.md` — data flow diagrams and module map
4. `docs/migration/MODULE_MAP.md` — React component → SvelteKit equivalent mapping
5. Updated root `README.md` with how to run both apps

---

## 15. Success Criteria

- [ ] All 3 login flows work (super-admin, school-admin, teacher)
- [ ] Role-based redirect after login works server-side
- [ ] Unauthenticated access to `(app)/` redirects to login
- [ ] Sidebar renders correct nav for each role
- [ ] Finance module: view student fees, class fee structures
- [ ] Attendance module: mark and view attendance
- [ ] Dashboard: displays stats for each role
- [ ] All UI text goes through `svelte-i18n` with `en.json` keys
- [ ] Module stores isolated — no cross-module coupling verified
- [ ] SvelteKit build succeeds with no TypeScript errors
- [ ] All 20+ modules have their route + module scaffold (even if content is WIP)
