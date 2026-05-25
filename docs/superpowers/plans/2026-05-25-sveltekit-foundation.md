# SvelteKit ERP Migration — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a working SvelteKit 2 ERP frontend at `erp_portal/frontend-svelte/` with SSR httpOnly-cookie auth, role-based server-side routing, sidebar + topnav layout, all 3 login flows, and empty module scaffolds for all 24 modules — existing React app untouched.

**Architecture:** `frontend-svelte/` alongside existing `frontend/` React app. `@sveltejs/adapter-node` for SSR. SvelteKit server actions set httpOnly cookies (no backend change needed). Route groups `(public)` / `(app)` enforce auth via `+layout.server.ts`. Module stores isolated per module. `hooks.server.ts` reads `session` cookie → `locals.user` on every request.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript 5, TailwindCSS 3, shadcn-svelte (latest), svelte-i18n 4, jose 5, lucide-svelte, Vitest 3, @testing-library/svelte 5

---

## File Map

```
frontend-svelte/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
├── .prettierrc
├── .env.example
├── .gitignore
├── components.json                         ← shadcn-svelte config
├── locales/
│   ├── en.json
│   ├── hi.json
│   └── mr.json
├── static/
└── src/
    ├── app.html
    ├── app.css
    ├── app.d.ts
    ├── hooks.server.ts
    ├── test/
    │   └── setup.ts
    ├── lib/
    │   ├── utils.ts                        ← cn() helper
    │   ├── types/
    │   │   └── index.ts
    │   ├── api/
    │   │   ├── client.ts
    │   │   ├── client.test.ts
    │   │   └── endpoints.ts
    │   ├── auth/
    │   │   ├── stores.ts
    │   │   ├── utils.ts
    │   │   └── utils.test.ts
    │   ├── i18n/
    │   │   └── index.ts
    │   ├── moduleRegistry.ts
    │   └── components/
    │       ├── ui/                         ← shadcn-svelte generated components
    │       └── layout/
    │           ├── Sidebar.svelte
    │           └── TopNavbar.svelte
    ├── modules/                            ← 24 module scaffolds (Task 22)
    │   ├── academics/  admissions/  approvals/  attendance/  classes/
    │   ├── communication/  dashboard/  data-import/  downloads/  exams/
    │   ├── finance/  hostel/  house/  hr/  inventory/  library/
    │   ├── maintenance/  salary/  social-media/  sports/  staff/
    │   ├── students/  support/  survey/  timetable/  transport/  visitor/
    │   └── [each with]: components/ stores/ services/ types/ index.ts
    └── routes/
        ├── +layout.svelte
        ├── +layout.server.ts
        ├── +error.svelte
        ├── (public)/
        │   ├── +layout.svelte
        │   ├── +page.svelte               ← landing
        │   ├── login/+page.svelte  +page.server.ts
        │   ├── school-login/+page.svelte  +page.server.ts
        │   ├── super-login/+page.svelte  +page.server.ts
        │   └── signup/+page.svelte
        ├── (app)/
        │   ├── +layout.svelte
        │   ├── +layout.server.ts
        │   ├── +error.svelte
        │   ├── dashboard/+page.svelte
        │   ├── school/+page.svelte
        │   ├── school/[module]/+page.svelte
        │   ├── teacher/+page.svelte
        │   └── teacher/[module]/+page.svelte
        └── logout/
            └── +page.server.ts
```

---

## Task 1: Initialize project directory and write package.json

**Files:**
- Create: `frontend-svelte/package.json`

- [ ] **Step 1: Create the project directory**

Run from `erp_portal/`:
```powershell
New-Item -ItemType Directory -Force "frontend-svelte\src\lib\api"
New-Item -ItemType Directory -Force "frontend-svelte\src\lib\auth"
New-Item -ItemType Directory -Force "frontend-svelte\src\lib\i18n"
New-Item -ItemType Directory -Force "frontend-svelte\src\lib\types"
New-Item -ItemType Directory -Force "frontend-svelte\src\lib\components\ui"
New-Item -ItemType Directory -Force "frontend-svelte\src\lib\components\layout"
New-Item -ItemType Directory -Force "frontend-svelte\src\test"
New-Item -ItemType Directory -Force "frontend-svelte\locales"
New-Item -ItemType Directory -Force "frontend-svelte\static"
```

- [ ] **Step 2: Write package.json**

Create `frontend-svelte/package.json`:
```json
{
  "name": "erp-portal-svelte",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.2.11",
    "@sveltejs/kit": "^2.21.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.3",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/svelte": "^5.2.7",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.18.0",
    "eslint-plugin-svelte": "^2.46.1",
    "globals": "^15.14.0",
    "jsdom": "^26.0.0",
    "typescript-eslint": "^8.18.0",
    "postcss": "^8.5.1",
    "prettier": "^3.4.2",
    "prettier-plugin-svelte": "^3.3.3",
    "svelte": "^5.19.0",
    "svelte-check": "^4.1.4",
    "tailwindcss": "^3.4.17",
    "tslib": "^2.8.1",
    "typescript": "^5.8.3",
    "vite": "^6.2.6",
    "vitest": "^3.0.7"
  },
  "dependencies": {
    "bits-ui": "^1.3.15",
    "clsx": "^2.1.1",
    "jose": "^5.10.0",
    "lucide-svelte": "^0.474.0",
    "svelte-i18n": "^4.0.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run from `frontend-svelte/`:
```powershell
cd "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal\frontend-svelte"
npm install
```

Expected: `node_modules/` created, no errors. Ignore peer-dep warnings.

---

## Task 2: Write all configuration files

**Files:**
- Create: `frontend-svelte/svelte.config.js`
- Create: `frontend-svelte/vite.config.ts`
- Create: `frontend-svelte/tsconfig.json`
- Create: `frontend-svelte/tailwind.config.ts`
- Create: `frontend-svelte/postcss.config.js`
- Create: `frontend-svelte/eslint.config.js`
- Create: `frontend-svelte/.prettierrc`
- Create: `frontend-svelte/.gitignore`

- [ ] **Step 1: Write svelte.config.js**

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $modules: './src/modules'
    }
  }
};

export default config;
```

- [ ] **Step 2: Write vite.config.ts**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts']
  }
});
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true
  }
}
```

- [ ] **Step 4: Write tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [animate]
};

export default config;
```

- [ ] **Step 5: Write postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 6: Write eslint.config.js**

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser
      }
    }
  },
  {
    ignores: ['build/', '.svelte-kit/', 'node_modules/']
  }
];
```

- [ ] **Step 7: Write .prettierrc**

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [
    { "files": "*.svelte", "options": { "parser": "svelte" } }
  ]
}
```

- [ ] **Step 8: Write .gitignore**

```
node_modules/
build/
.svelte-kit/
.env
.env.*
!.env.example
dist/
```

---

## Task 3: Write static app files

**Files:**
- Create: `frontend-svelte/src/app.html`
- Create: `frontend-svelte/src/app.css`
- Create: `frontend-svelte/src/app.d.ts`
- Create: `frontend-svelte/.env.example`
- Create: `frontend-svelte/src/test/setup.ts`

- [ ] **Step 1: Write src/app.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 2: Write src/app.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
    box-sizing: border-box;
  }

  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

- [ ] **Step 3: Write src/app.d.ts**

```ts
import type { User } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user?: User;
    }
    interface PageData {
      user?: User;
    }
  }
}

export {};
```

- [ ] **Step 4: Write .env.example**

```
PUBLIC_API_URL=http://localhost:5000
```

Also create actual `.env` for local dev:
```
PUBLIC_API_URL=http://localhost:5000
```

- [ ] **Step 5: Write src/test/setup.ts**

```ts
import '@testing-library/jest-dom';
```

---

## Task 4: Write core TypeScript types

**Files:**
- Create: `frontend-svelte/src/lib/types/index.ts`

- [ ] **Step 1: Write the types**

```ts
export type UserRole = 'super-admin' | 'school-admin' | 'teacher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions {
  fetch?: typeof globalThis.fetch;
}

export interface ModuleNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export interface ModuleRegistration {
  id: string;
  navItem: ModuleNavItem;
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/types/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add core TypeScript types"
```

---

## Task 5: Write API client

**Files:**
- Create: `frontend-svelte/src/lib/api/endpoints.ts`
- Create: `frontend-svelte/src/lib/api/client.ts`

- [ ] **Step 1: Write endpoints.ts**

```ts
import { PUBLIC_API_URL } from '$env/static/public';

export const API_BASE = PUBLIC_API_URL || 'http://localhost:5000';

export const ENDPOINTS = {
  auth: {
    teacherLogin: '/api/auth/staff/login',
    schoolAdminLogin: '/api/auth/school/login',
    superAdminLogin: '/api/auth/super-admin/login',
    logout: '/api/auth/logout',
  },
  finance: {
    studentSummary: (schoolId: string) => `/api/finance/${schoolId}/students/summary`,
    classFeeStructures: (schoolId: string) => `/api/finance/${schoolId}/class-fee-structures`,
  },
  attendance: {
    summary: (schoolId: string) => `/api/attendance/${schoolId}/summary`,
  },
} as const;
```

- [ ] **Step 2: Write client.ts**

```ts
import { API_BASE } from './endpoints';
import { ApiError, type ApiRequestOptions } from '$lib/types';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: ApiRequestOptions
): Promise<T> {
  const fetcher = opts?.fetch ?? globalThis.fetch;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers: Record<string, string> = {};
  let bodyInit: BodyInit | undefined;

  if (body instanceof FormData) {
    bodyInit = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(body);
  }

  const response = await fetcher(url, {
    method,
    headers,
    body: bodyInit,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: response.statusText })) as { message?: string };
    throw new ApiError(response.status, err.message ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: ApiRequestOptions) =>
    request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>('PATCH', path, body, opts),
  delete: <T>(path: string, opts?: ApiRequestOptions) =>
    request<T>('DELETE', path, undefined, opts),
  postForm: <T>(path: string, form: FormData, opts?: ApiRequestOptions) =>
    request<T>('POST', path, form, opts),
};
```

---

## Task 6: Write API client tests

**Files:**
- Create: `frontend-svelte/src/lib/api/client.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '$lib/types';

// Mock $env/static/public before importing client
vi.mock('$env/static/public', () => ({ PUBLIC_API_URL: 'http://localhost:5000' }));

const { api } = await import('./client');

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('api.get', () => {
  it('returns parsed JSON on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    const result = await api.get<{ id: string; name: string }>('/api/test');

    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/test',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('throws ApiError with status on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Token expired' }),
    });

    const err = await api.get('/api/secure').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Token expired');
  });

  it('uses statusText when response body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });

    const err = await api.get('/api/fail').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Internal Server Error');
  });

  it('uses custom fetch from opts when provided', async () => {
    const customFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await api.get('/api/test', { fetch: customFetch });
    expect(customFetch).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('api.post', () => {
  it('serializes body as JSON with Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.post('/api/data', { key: 'value' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"key":"value"}',
      })
    );
  });

  it('sends FormData without Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const form = new FormData();
    form.append('file', 'data');
    await api.postForm('/api/upload', form);

    const call = mockFetch.mock.calls[0][1];
    expect(call.body).toBeInstanceOf(FormData);
    expect(call.headers['Content-Type']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect PASS**

```powershell
cd "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal\frontend-svelte"
npx vitest run src/lib/api/client.test.ts
```

Expected output: `6 passed`

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/api/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add API client with unit tests"
```

---

## Task 7: Write auth utilities and stores

**Files:**
- Create: `frontend-svelte/src/lib/auth/utils.ts`
- Create: `frontend-svelte/src/lib/auth/utils.test.ts`
- Create: `frontend-svelte/src/lib/auth/stores.ts`

- [ ] **Step 1: Write utils.ts**

```ts
import type { UserRole } from '$lib/types';

const ROLE_HOMES: Record<UserRole, string> = {
  'super-admin': '/dashboard',
  'school-admin': '/school',
  teacher: '/teacher',
};

export function getRoleHome(role: UserRole): string {
  return ROLE_HOMES[role];
}

export function isValidRole(value: unknown): value is UserRole {
  return value === 'super-admin' || value === 'school-admin' || value === 'teacher';
}
```

- [ ] **Step 2: Write utils.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { getRoleHome, isValidRole } from './utils';

describe('getRoleHome', () => {
  it('returns /dashboard for super-admin', () => {
    expect(getRoleHome('super-admin')).toBe('/dashboard');
  });
  it('returns /school for school-admin', () => {
    expect(getRoleHome('school-admin')).toBe('/school');
  });
  it('returns /teacher for teacher', () => {
    expect(getRoleHome('teacher')).toBe('/teacher');
  });
});

describe('isValidRole', () => {
  it('returns true for valid roles', () => {
    expect(isValidRole('super-admin')).toBe(true);
    expect(isValidRole('school-admin')).toBe(true);
    expect(isValidRole('teacher')).toBe(true);
  });
  it('returns false for invalid values', () => {
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(42)).toBe(false);
    expect(isValidRole('')).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests — expect PASS**

```powershell
npx vitest run src/lib/auth/utils.test.ts
```

Expected: `6 passed`

- [ ] **Step 4: Write stores.ts**

```ts
import { writable, derived } from 'svelte/store';
import type { User, UserRole } from '$lib/types';

export const currentUser = writable<User | null>(null);

export const userRole = derived<typeof currentUser, UserRole | null>(
  currentUser,
  ($user) => $user?.role ?? null
);

export const isAuthenticated = derived(currentUser, ($user) => $user !== null);
```

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/auth/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add auth utilities, stores, and tests"
```

---

## Task 8: Write SSR hooks

**Files:**
- Create: `frontend-svelte/src/hooks.server.ts`

- [ ] **Step 1: Write hooks.server.ts**

```ts
import type { Handle } from '@sveltejs/kit';
import { isValidRole } from '$lib/auth/utils';
import type { User } from '$lib/types';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('token');
  const sessionRaw = event.cookies.get('session');

  if (token && sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw) as Partial<User>;
      if (
        parsed &&
        typeof parsed.id === 'string' &&
        typeof parsed.email === 'string' &&
        typeof parsed.name === 'string' &&
        isValidRole(parsed.role)
      ) {
        event.locals.user = {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name,
          role: parsed.role,
          schoolId: parsed.schoolId,
        };
      }
    } catch {
      event.cookies.delete('token', { path: '/' });
      event.cookies.delete('session', { path: '/' });
    }
  } else if (token || sessionRaw) {
    // One cookie present without the other — clear both (stale state)
    event.cookies.delete('token', { path: '/' });
    event.cookies.delete('session', { path: '/' });
  }

  return resolve(event);
};
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/hooks.server.ts
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add SSR hooks for cookie-based auth"
```

---

## Task 9: Write i18n setup and locale files

**Files:**
- Create: `frontend-svelte/src/lib/i18n/index.ts`
- Create: `frontend-svelte/locales/en.json`
- Create: `frontend-svelte/locales/hi.json`
- Create: `frontend-svelte/locales/mr.json`

- [ ] **Step 1: Write src/lib/i18n/index.ts**

```ts
import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

export function setupI18n() {
  register('en', () => import('../../locales/en.json'));
  register('hi', () => import('../../locales/hi.json'));
  register('mr', () => import('../../locales/mr.json'));

  const savedLocale =
    typeof window !== 'undefined' ? localStorage.getItem('locale') : null;

  init({
    fallbackLocale: 'en',
    initialLocale: savedLocale ?? getLocaleFromNavigator() ?? 'en',
  });
}

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
] as const;
```

- [ ] **Step 2: Write locales/en.json**

```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "add": "Add",
      "search": "Search",
      "close": "Close",
      "back": "Back",
      "next": "Next",
      "submit": "Submit",
      "loading": "Loading...",
      "retry": "Retry",
      "view": "View",
      "export": "Export"
    },
    "status": {
      "loading": "Loading...",
      "error": "Something went wrong",
      "empty": "No data found",
      "saving": "Saving..."
    },
    "nav": {
      "dashboard": "Dashboard",
      "schools": "Schools",
      "schoolAdmins": "School Admins",
      "subscriptions": "Subscriptions",
      "logs": "Logs",
      "settings": "Settings",
      "finance": "Finance",
      "attendance": "Attendance",
      "hr": "HR",
      "exams": "Exams",
      "academics": "Academics",
      "admissions": "Admissions",
      "classes": "Classes",
      "timetable": "Timetable",
      "students": "Students",
      "staff": "Staff",
      "transport": "Transport",
      "library": "Library",
      "hostel": "Hostel",
      "house": "House",
      "inventory": "Inventory",
      "sports": "Sports",
      "communication": "Communication",
      "salary": "Salary",
      "maintenance": "Maintenance",
      "visitor": "Visitor",
      "survey": "Survey",
      "support": "Support",
      "logout": "Logout",
      "profile": "Profile"
    }
  },
  "auth": {
    "login": {
      "teacherTitle": "Teacher Login",
      "schoolAdminTitle": "School Admin Login",
      "superAdminTitle": "Super Admin Login",
      "emailLabel": "Email",
      "passwordLabel": "Password",
      "emailPlaceholder": "Enter your email",
      "passwordPlaceholder": "Enter your password",
      "submitButton": "Sign In",
      "submitting": "Signing in...",
      "invalidCredentials": "Invalid email or password",
      "serverError": "Unable to connect. Check backend is running.",
      "schoolAdminLink": "School Admin? Login here",
      "superAdminLink": "Super Admin? Login here",
      "teacherLink": "Teacher? Login here"
    }
  },
  "dashboard": {
    "welcome": "Welcome back, {name}",
    "superAdmin": {
      "title": "Super Admin Dashboard",
      "totalSchools": "Total Schools",
      "totalAdmins": "Total Admins",
      "activeSubscriptions": "Active Subscriptions"
    },
    "schoolAdmin": {
      "title": "School Dashboard",
      "totalStudents": "Total Students",
      "totalStaff": "Total Staff",
      "attendanceToday": "Attendance Today"
    },
    "teacher": {
      "title": "Teacher Dashboard",
      "myClasses": "My Classes",
      "pendingAssignments": "Pending Assignments",
      "attendanceToday": "Attendance Today"
    }
  },
  "finance": {
    "dashboard": {
      "title": "Finance",
      "totalDue": "Total Due",
      "totalCollected": "Total Collected",
      "pendingFees": "Pending Fees"
    },
    "student": {
      "name": "Student Name",
      "class": "Class",
      "academicFee": "Academic Fee",
      "transportFee": "Transport Fee",
      "totalFee": "Total Fee",
      "paid": "Paid",
      "due": "Due",
      "status": "Status"
    }
  },
  "attendance": {
    "title": "Attendance",
    "markAttendance": "Mark Attendance",
    "present": "Present",
    "absent": "Absent",
    "late": "Late"
  },
  "error": {
    "notFound": "Page not found",
    "unauthorized": "You don't have permission to view this page",
    "serverError": "Server error. Please try again.",
    "goHome": "Go Home",
    "tryAgain": "Try Again"
  }
}
```

- [ ] **Step 3: Write locales/hi.json** (English values as placeholders until translated)

```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "add": "Add",
      "search": "Search",
      "close": "Close",
      "back": "Back",
      "next": "Next",
      "submit": "Submit",
      "loading": "Loading...",
      "retry": "Retry",
      "view": "View",
      "export": "Export"
    },
    "status": {
      "loading": "Loading...",
      "error": "Something went wrong",
      "empty": "No data found",
      "saving": "Saving..."
    },
    "nav": {
      "dashboard": "Dashboard",
      "schools": "Schools",
      "schoolAdmins": "School Admins",
      "subscriptions": "Subscriptions",
      "logs": "Logs",
      "settings": "Settings",
      "finance": "Finance",
      "attendance": "Attendance",
      "hr": "HR",
      "exams": "Exams",
      "academics": "Academics",
      "admissions": "Admissions",
      "classes": "Classes",
      "timetable": "Timetable",
      "students": "Students",
      "staff": "Staff",
      "transport": "Transport",
      "library": "Library",
      "hostel": "Hostel",
      "house": "House",
      "inventory": "Inventory",
      "sports": "Sports",
      "communication": "Communication",
      "salary": "Salary",
      "maintenance": "Maintenance",
      "visitor": "Visitor",
      "survey": "Survey",
      "support": "Support",
      "logout": "Logout",
      "profile": "Profile"
    }
  },
  "auth": {
    "login": {
      "teacherTitle": "Teacher Login",
      "schoolAdminTitle": "School Admin Login",
      "superAdminTitle": "Super Admin Login",
      "emailLabel": "Email",
      "passwordLabel": "Password",
      "emailPlaceholder": "Enter your email",
      "passwordPlaceholder": "Enter your password",
      "submitButton": "Sign In",
      "submitting": "Signing in...",
      "invalidCredentials": "Invalid email or password",
      "serverError": "Unable to connect. Check backend is running.",
      "schoolAdminLink": "School Admin? Login here",
      "superAdminLink": "Super Admin? Login here",
      "teacherLink": "Teacher? Login here"
    }
  },
  "dashboard": {
    "welcome": "Welcome back, {name}",
    "superAdmin": { "title": "Super Admin Dashboard", "totalSchools": "Total Schools", "totalAdmins": "Total Admins", "activeSubscriptions": "Active Subscriptions" },
    "schoolAdmin": { "title": "School Dashboard", "totalStudents": "Total Students", "totalStaff": "Total Staff", "attendanceToday": "Attendance Today" },
    "teacher": { "title": "Teacher Dashboard", "myClasses": "My Classes", "pendingAssignments": "Pending Assignments", "attendanceToday": "Attendance Today" }
  },
  "finance": {
    "dashboard": { "title": "Finance", "totalDue": "Total Due", "totalCollected": "Total Collected", "pendingFees": "Pending Fees" },
    "student": { "name": "Student Name", "class": "Class", "academicFee": "Academic Fee", "transportFee": "Transport Fee", "totalFee": "Total Fee", "paid": "Paid", "due": "Due", "status": "Status" }
  },
  "attendance": { "title": "Attendance", "markAttendance": "Mark Attendance", "present": "Present", "absent": "Absent", "late": "Late" },
  "error": { "notFound": "Page not found", "unauthorized": "You don't have permission to view this page", "serverError": "Server error. Please try again.", "goHome": "Go Home", "tryAgain": "Try Again" }
}
```

- [ ] **Step 4: Write locales/mr.json** (copy of hi.json — same English placeholders)

Write `locales/mr.json` with identical content to `locales/hi.json`.

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/i18n/ frontend-svelte/locales/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add svelte-i18n with en/hi/mr locale files"
```

---

## Task 10: Write $lib/utils.ts and initialize shadcn-svelte

**Files:**
- Create: `frontend-svelte/src/lib/utils.ts`
- Create: `frontend-svelte/components.json`

- [ ] **Step 1: Write src/lib/utils.ts**

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Write components.json (shadcn-svelte config)**

```json
{
  "$schema": "https://shadcn-svelte.com/schema.json",
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "$lib/components",
    "utils": "$lib/utils"
  },
  "typescript": true
}
```

- [ ] **Step 3: Add shadcn-svelte components**

Run from `frontend-svelte/`:
```powershell
npx shadcn-svelte@latest add button card badge input label separator skeleton table tabs dialog sheet select textarea scroll-area avatar progress
```

If any component fails, add them individually. Expected: files created in `src/lib/components/ui/`.

- [ ] **Step 4: Verify components exist**

```powershell
Get-ChildItem "src/lib/components/ui" -Name
```

Expected: `button.svelte`, `card.svelte`, `badge.svelte`, `input.svelte`, `label.svelte`, `separator.svelte`, `skeleton.svelte`, `table.svelte`, `tabs.svelte`, `dialog.svelte`, `sheet.svelte`, `select.svelte`, `textarea.svelte`, `scroll-area.svelte`, `avatar.svelte`, `progress.svelte`

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/utils.ts frontend-svelte/src/lib/components/ui/ frontend-svelte/components.json
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add cn utility and shadcn-svelte UI components"
```

---

## Task 11: Write Sidebar layout component

**Files:**
- Create: `frontend-svelte/src/lib/components/layout/Sidebar.svelte`

- [ ] **Step 1: Write Sidebar.svelte**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';
  import type { User } from '$lib/types';
  import {
    LayoutDashboard, School, Users, CreditCard, FileText, Settings,
    DollarSign, Calendar, UserCheck, BookOpen, GraduationCap, Clock,
    Bus, BookMarked, Home, Package, Trophy, MessageSquare, Wallet,
    LogOut, Building2, ClipboardList, Wrench, UserSquare, BarChart3,
    ShieldCheck, Download
  } from 'lucide-svelte';

  let { user }: { user: User } = $props();

  type NavItem = {
    id: string;
    labelKey: string;
    href: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    roles: string[];
  };

  const NAV_ITEMS: NavItem[] = [
    // Super admin
    { id: 'dashboard', labelKey: 'common.nav.dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super-admin'] },
    { id: 'schools', labelKey: 'common.nav.schools', href: '/dashboard/schools', icon: School, roles: ['super-admin'] },
    { id: 'school-admins', labelKey: 'common.nav.schoolAdmins', href: '/dashboard/school-admins', icon: UserSquare, roles: ['super-admin'] },
    { id: 'subscriptions', labelKey: 'common.nav.subscriptions', href: '/dashboard/subscriptions', icon: CreditCard, roles: ['super-admin'] },
    { id: 'logs', labelKey: 'common.nav.logs', href: '/dashboard/logs', icon: FileText, roles: ['super-admin'] },
    { id: 'settings', labelKey: 'common.nav.settings', href: '/dashboard/settings', icon: Settings, roles: ['super-admin'] },
    // School admin
    { id: 'school-home', labelKey: 'common.nav.dashboard', href: '/school', icon: LayoutDashboard, roles: ['school-admin'] },
    { id: 'finance', labelKey: 'common.nav.finance', href: '/school/finance', icon: DollarSign, roles: ['school-admin'] },
    { id: 'attendance', labelKey: 'common.nav.attendance', href: '/school/attendance', icon: Calendar, roles: ['school-admin'] },
    { id: 'hr', labelKey: 'common.nav.hr', href: '/school/hr', icon: UserCheck, roles: ['school-admin'] },
    { id: 'exams', labelKey: 'common.nav.exams', href: '/school/exams', icon: BookOpen, roles: ['school-admin'] },
    { id: 'academics', labelKey: 'common.nav.academics', href: '/school/academics', icon: GraduationCap, roles: ['school-admin'] },
    { id: 'admissions', labelKey: 'common.nav.admissions', href: '/school/admissions', icon: ClipboardList, roles: ['school-admin'] },
    { id: 'students', labelKey: 'common.nav.students', href: '/school/students', icon: Users, roles: ['school-admin'] },
    { id: 'staff', labelKey: 'common.nav.staff', href: '/school/staff', icon: Users, roles: ['school-admin'] },
    { id: 'timetable', labelKey: 'common.nav.timetable', href: '/school/timetable', icon: Clock, roles: ['school-admin'] },
    { id: 'transport', labelKey: 'common.nav.transport', href: '/school/transport', icon: Bus, roles: ['school-admin'] },
    { id: 'library', labelKey: 'common.nav.library', href: '/school/library', icon: BookMarked, roles: ['school-admin'] },
    { id: 'hostel', labelKey: 'common.nav.hostel', href: '/school/hostel', icon: Home, roles: ['school-admin'] },
    { id: 'inventory', labelKey: 'common.nav.inventory', href: '/school/inventory', icon: Package, roles: ['school-admin'] },
    { id: 'sports', labelKey: 'common.nav.sports', href: '/school/sports', icon: Trophy, roles: ['school-admin'] },
    { id: 'communication', labelKey: 'common.nav.communication', href: '/school/communication', icon: MessageSquare, roles: ['school-admin'] },
    { id: 'salary', labelKey: 'common.nav.salary', href: '/school/salary', icon: Wallet, roles: ['school-admin'] },
    { id: 'maintenance', labelKey: 'common.nav.maintenance', href: '/school/maintenance', icon: Wrench, roles: ['school-admin'] },
    { id: 'visitor', labelKey: 'common.nav.visitor', href: '/school/visitor', icon: Building2, roles: ['school-admin'] },
    // Teacher
    { id: 'teacher-home', labelKey: 'common.nav.dashboard', href: '/teacher', icon: LayoutDashboard, roles: ['teacher'] },
    { id: 'teacher-attendance', labelKey: 'common.nav.attendance', href: '/teacher/attendance', icon: Calendar, roles: ['teacher'] },
    { id: 'teacher-exams', labelKey: 'common.nav.exams', href: '/teacher/exams', icon: BookOpen, roles: ['teacher'] },
    { id: 'teacher-academics', labelKey: 'common.nav.academics', href: '/teacher/academics', icon: GraduationCap, roles: ['teacher'] },
    { id: 'teacher-students', labelKey: 'common.nav.students', href: '/teacher/students', icon: Users, roles: ['teacher'] },
    { id: 'teacher-timetable', labelKey: 'common.nav.timetable', href: '/teacher/timetable', icon: Clock, roles: ['teacher'] },
    { id: 'teacher-communication', labelKey: 'common.nav.communication', href: '/teacher/communication', icon: MessageSquare, roles: ['teacher'] },
  ];

  const filteredItems = $derived(NAV_ITEMS.filter((item) => item.roles.includes(user.role)));
  const currentPath = $derived($page.url.pathname);

  function isActive(href: string): boolean {
    if (href === '/school' || href === '/teacher' || href === '/dashboard') {
      return currentPath === href;
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  }
</script>

<aside class="flex flex-col w-60 min-h-screen bg-slate-900 text-white flex-shrink-0">
  <!-- Logo -->
  <div class="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
    <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">
      E
    </div>
    <span class="font-semibold text-lg tracking-tight">ERP Portal</span>
  </div>

  <!-- Nav items -->
  <nav class="flex-1 px-2 py-4 overflow-y-auto">
    {#each filteredItems as item (item.id)}
      <a
        href={item.href}
        class={[
          'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors',
          isActive(item.href)
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white',
        ].join(' ')}
      >
        <svelte:component this={item.icon} class="w-4 h-4 flex-shrink-0" />
        <span class="truncate">{$_(item.labelKey)}</span>
      </a>
    {/each}
  </nav>

  <!-- User info + logout -->
  <div class="px-4 py-4 border-t border-slate-700">
    <div class="flex items-center gap-3 mb-3">
      <div
        class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold flex-shrink-0"
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">{user.name}</p>
        <p class="text-xs text-slate-400 truncate capitalize">{user.role.replace('-', ' ')}</p>
      </div>
    </div>
    <form method="POST" action="/logout">
      <button
        type="submit"
        class="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        <LogOut class="w-4 h-4" />
        {$_('common.nav.logout')}
      </button>
    </form>
  </div>
</aside>
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/components/layout/Sidebar.svelte
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add role-aware Sidebar layout component"
```

---

## Task 12: Write TopNavbar layout component

**Files:**
- Create: `frontend-svelte/src/lib/components/layout/TopNavbar.svelte`

- [ ] **Step 1: Write TopNavbar.svelte**

```svelte
<script lang="ts">
  import { locale } from 'svelte-i18n';
  import { SUPPORTED_LOCALES } from '$lib/i18n';
  import type { User } from '$lib/types';
  import { Menu, Bell } from 'lucide-svelte';

  let { user, onToggleSidebar }: { user: User; onToggleSidebar: () => void } = $props();

  function changeLocale(code: string) {
    locale.set(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', code);
    }
  }

  const currentLocale = $derived($locale ?? 'en');
</script>

<header
  class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0"
>
  <!-- Left: hamburger (mobile) -->
  <div class="flex items-center gap-3">
    <button
      onclick={onToggleSidebar}
      class="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
      aria-label="Toggle sidebar"
    >
      <Menu class="w-5 h-5 text-gray-600" />
    </button>

    <span class="text-sm text-gray-500 hidden sm:block capitalize">
      {user.role.replace('-', ' ')}
    </span>
  </div>

  <!-- Right: locale switcher + notifications + avatar -->
  <div class="flex items-center gap-2">
    <!-- Locale switcher -->
    <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {#each SUPPORTED_LOCALES as loc (loc.code)}
        <button
          onclick={() => changeLocale(loc.code)}
          class={[
            'px-2 py-1 rounded text-xs font-medium transition-colors',
            currentLocale === loc.code
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          {loc.code.toUpperCase()}
        </button>
      {/each}
    </div>

    <!-- Notifications (stub) -->
    <button
      class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label="Notifications"
    >
      <Bell class="w-5 h-5 text-gray-600" />
    </button>

    <!-- User avatar -->
    <div
      class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold"
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  </div>
</header>
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/components/layout/TopNavbar.svelte
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add TopNavbar with locale switcher"
```

---

## Task 13: Write root route layout files

**Files:**
- Create: `frontend-svelte/src/routes/+layout.svelte`
- Create: `frontend-svelte/src/routes/+layout.server.ts`
- Create: `frontend-svelte/src/routes/+error.svelte`

- [ ] **Step 1: Create routes directories**

```powershell
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(public)\login"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(public)\school-login"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(public)\super-login"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(public)\signup"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(app)\dashboard"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(app)\school\[module]"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\(app)\teacher\[module]"
New-Item -ItemType Directory -Force "frontend-svelte\src\routes\logout"
```

- [ ] **Step 2: Write src/routes/+layout.server.ts**

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user };
};
```

- [ ] **Step 3: Write src/routes/+layout.svelte**

```svelte
<script lang="ts">
  import '../app.css';
  import { setupI18n } from '$lib/i18n';
  import { currentUser } from '$lib/auth/stores';
  import { onMount } from 'svelte';

  let { data, children } = $props();

  onMount(() => {
    setupI18n();
    if (data.user) {
      currentUser.set(data.user);
    }
  });
</script>

{@render children()}
```

- [ ] **Step 4: Write src/routes/+error.svelte**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center max-w-md px-4">
    <h1 class="text-6xl font-bold text-gray-300 mb-4">{$page.status}</h1>
    <h2 class="text-xl font-semibold text-gray-800 mb-2">
      {$page.status === 404 ? $_('error.notFound') : $_('error.serverError')}
    </h2>
    <p class="text-gray-500 mb-6">{$page.error?.message ?? ''}</p>
    <a
      href="/"
      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {$_('error.goHome')}
    </a>
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/routes/+layout.svelte frontend-svelte/src/routes/+layout.server.ts frontend-svelte/src/routes/+error.svelte
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add root route layout with i18n and auth store hydration"
```

---

## Task 14: Write (public) route group

**Files:**
- Create: `frontend-svelte/src/routes/(public)/+layout.svelte`
- Create: `frontend-svelte/src/routes/(public)/+page.svelte`
- Create: `frontend-svelte/src/routes/(public)/signup/+page.svelte`

- [ ] **Step 1: Write (public)/+layout.svelte**

```svelte
<script lang="ts">
  let { children } = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
  {@render children()}
</div>
```

- [ ] **Step 2: Write (public)/+page.svelte (landing)**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<svelte:head>
  <title>ERP Portal</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center text-white px-4">
  <div class="text-center max-w-2xl">
    <div class="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6">
      E
    </div>
    <h1 class="text-4xl font-bold mb-4">ERP Portal</h1>
    <p class="text-slate-300 text-lg mb-10">School management made simple</p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a
        href="/login"
        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        Teacher Login
      </a>
      <a
        href="/school-login"
        class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
      >
        School Admin Login
      </a>
      <a
        href="/super-login"
        class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
      >
        Super Admin Login
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Write (public)/signup/+page.svelte (stub)**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<svelte:head><title>Sign Up — ERP Portal</title></svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
    <h1 class="text-2xl font-bold text-gray-900 mb-4">School Registration</h1>
    <p class="text-gray-500 mb-6">School signup coming soon.</p>
    <a href="/" class="text-blue-600 hover:underline text-sm">← Back to home</a>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add "frontend-svelte/src/routes/(public)/"
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add public route group with landing and signup pages"
```

---

## Task 15: Write login pages with server actions

**Files:**
- Create: `frontend-svelte/src/routes/(public)/login/+page.svelte`
- Create: `frontend-svelte/src/routes/(public)/login/+page.server.ts`
- Create: `frontend-svelte/src/routes/(public)/school-login/+page.svelte`
- Create: `frontend-svelte/src/routes/(public)/school-login/+page.server.ts`
- Create: `frontend-svelte/src/routes/(public)/super-login/+page.svelte`
- Create: `frontend-svelte/src/routes/(public)/super-login/+page.server.ts`

- [ ] **Step 1: Write login/+page.server.ts (Teacher)**

```ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { User } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, '/teacher');
  return {};
};

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
};

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required', email });
    }

    try {
      const apiUrl = `${process.env.PUBLIC_API_URL ?? 'http://localhost:5000'}${ENDPOINTS.auth.teacherLogin}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as {
        token?: string;
        teacher?: { _id?: string; name?: string; email?: string };
        school?: { _id?: string };
        message?: string;
      };

      if (!response.ok || !result.token) {
        return fail(401, { error: result.message ?? 'Invalid credentials', email });
      }

      const user: User = {
        id: result.teacher?._id ?? '',
        email: result.teacher?.email ?? email,
        name: result.teacher?.name ?? email,
        role: 'teacher',
        schoolId: result.school?._id,
      };

      cookies.set('token', result.token, COOKIE_OPTS);
      cookies.set('session', JSON.stringify(user), COOKIE_OPTS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to server';
      return fail(500, { error: msg, email });
    }

    redirect(303, '/teacher');
  },
};
```

- [ ] **Step 2: Write login/+page.svelte (Teacher)**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Teacher Login — ERP Portal</title></svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
        E
      </div>
      <h1 class="text-2xl font-bold text-gray-900">{$_('auth.login.teacherTitle')}</h1>
    </div>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}
      class="space-y-4"
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.emailLabel')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form?.email ?? ''}
          placeholder={$_('auth.login.emailPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.passwordLabel')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder={$_('auth.login.passwordPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
      >
        {submitting ? $_('auth.login.submitting') : $_('auth.login.submitButton')}
      </button>
    </form>

    <div class="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
      <a href="/school-login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.schoolAdminLink')}
      </a>
      <a href="/super-login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.superAdminLink')}
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Write school-login/+page.server.ts**

```ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { User } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, '/school');
  return {};
};

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
};

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required', email });
    }

    try {
      const apiUrl = `${process.env.PUBLIC_API_URL ?? 'http://localhost:5000'}${ENDPOINTS.auth.schoolAdminLogin}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as {
        _id?: string;
        token?: string;
        adminInfo?: { name?: string; email?: string };
        message?: string;
      };

      if (!response.ok || !result.token) {
        return fail(401, { error: result.message ?? 'Invalid credentials', email });
      }

      const user: User = {
        id: result._id ?? '',
        email: result.adminInfo?.email ?? email,
        name: result.adminInfo?.name ?? email,
        role: 'school-admin',
        schoolId: result._id,
      };

      cookies.set('token', result.token, COOKIE_OPTS);
      cookies.set('session', JSON.stringify(user), COOKIE_OPTS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to server';
      return fail(500, { error: msg, email });
    }

    redirect(303, '/school');
  },
};
```

- [ ] **Step 4: Write school-login/+page.svelte**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>School Admin Login — ERP Portal</title></svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
        S
      </div>
      <h1 class="text-2xl font-bold text-gray-900">{$_('auth.login.schoolAdminTitle')}</h1>
    </div>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}
      class="space-y-4"
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.emailLabel')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form?.email ?? ''}
          placeholder={$_('auth.login.emailPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.passwordLabel')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder={$_('auth.login.passwordPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
      >
        {submitting ? $_('auth.login.submitting') : $_('auth.login.submitButton')}
      </button>
    </form>

    <div class="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
      <a href="/login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.teacherLink')}
      </a>
      <a href="/super-login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.superAdminLink')}
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Write super-login/+page.server.ts**

```ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { User } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, '/dashboard');
  return {};
};

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
};

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required', email });
    }

    try {
      const apiUrl = `${process.env.PUBLIC_API_URL ?? 'http://localhost:5000'}${ENDPOINTS.auth.superAdminLogin}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        token?: string;
        user?: { id?: string; email?: string; name?: string };
        message?: string;
      };

      if (!response.ok || !result.token) {
        return fail(401, { error: result.message ?? 'Invalid credentials', email });
      }

      const user: User = {
        id: result.user?.id ?? '',
        email: result.user?.email ?? email,
        name: result.user?.name ?? email,
        role: 'super-admin',
      };

      cookies.set('token', result.token, COOKIE_OPTS);
      cookies.set('session', JSON.stringify(user), COOKIE_OPTS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to server';
      return fail(500, { error: msg, email });
    }

    redirect(303, '/dashboard');
  },
};
```

- [ ] **Step 6: Write super-login/+page.svelte**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Super Admin Login — ERP Portal</title></svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
        A
      </div>
      <h1 class="text-2xl font-bold text-gray-900">{$_('auth.login.superAdminTitle')}</h1>
    </div>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}
      class="space-y-4"
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.emailLabel')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form?.email ?? ''}
          placeholder={$_('auth.login.emailPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.passwordLabel')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder={$_('auth.login.passwordPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
      >
        {submitting ? $_('auth.login.submitting') : $_('auth.login.submitButton')}
      </button>
    </form>

    <div class="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
      <a href="/login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.teacherLink')}
      </a>
      <a href="/school-login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.schoolAdminLink')}
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 7: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add "frontend-svelte/src/routes/(public)/"
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add 3 login pages with SSR form actions and cookie auth"
```

---

## Task 16: Write logout route

**Files:**
- Create: `frontend-svelte/src/routes/logout/+page.server.ts`

- [ ] **Step 1: Write logout/+page.server.ts**

```ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const DELETE_OPTS = { path: '/' };

export const load: PageServerLoad = async ({ cookies }) => {
  cookies.delete('token', DELETE_OPTS);
  cookies.delete('session', DELETE_OPTS);
  redirect(303, '/');
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    cookies.delete('token', DELETE_OPTS);
    cookies.delete('session', DELETE_OPTS);
    redirect(303, '/');
  },
};
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/routes/logout/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add logout route that clears auth cookies"
```

---

## Task 17: Write (app) route group — auth guard and layout

**Files:**
- Create: `frontend-svelte/src/routes/(app)/+layout.server.ts`
- Create: `frontend-svelte/src/routes/(app)/+layout.svelte`
- Create: `frontend-svelte/src/routes/(app)/+error.svelte`

- [ ] **Step 1: Write (app)/+layout.server.ts**

```ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getRoleHome } from '$lib/auth/utils';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }

  const { role } = locals.user;
  const path = url.pathname;

  if (path.startsWith('/dashboard') && role !== 'super-admin') {
    redirect(303, getRoleHome(role));
  }
  if (path.startsWith('/school') && role !== 'school-admin') {
    redirect(303, getRoleHome(role));
  }
  if (path.startsWith('/teacher') && role !== 'teacher') {
    redirect(303, getRoleHome(role));
  }

  return { user: locals.user };
};
```

- [ ] **Step 2: Write (app)/+layout.svelte**

```svelte
<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopNavbar from '$lib/components/layout/TopNavbar.svelte';
  import type { LayoutData } from './$types';

  import type { Snippet } from 'svelte';
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  let sidebarOpen = $state(true);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
</script>

<div class="flex h-screen overflow-hidden bg-gray-50">
  <!-- Sidebar -->
  <div
    class={[
      'transition-all duration-200 flex-shrink-0',
      sidebarOpen ? 'w-60' : 'w-0 overflow-hidden',
    ].join(' ')}
  >
    {#if data.user}
      <Sidebar user={data.user} />
    {/if}
  </div>

  <!-- Main content area -->
  <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
    {#if data.user}
      <TopNavbar user={data.user} onToggleSidebar={toggleSidebar} />
    {/if}

    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
```

- [ ] **Step 3: Write (app)/+error.svelte**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';
</script>

<div class="flex items-center justify-center min-h-[60vh]">
  <div class="text-center max-w-md">
    <h2 class="text-4xl font-bold text-gray-200 mb-2">{$page.status}</h2>
    <h3 class="text-lg font-semibold text-gray-700 mb-2">
      {$page.status === 403 ? $_('error.unauthorized') : $_('error.serverError')}
    </h3>
    <p class="text-gray-500 text-sm mb-6">{$page.error?.message ?? ''}</p>
    <a
      href="/"
      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
    >
      {$_('error.goHome')}
    </a>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add "frontend-svelte/src/routes/(app)/+layout.server.ts" "frontend-svelte/src/routes/(app)/+layout.svelte" "frontend-svelte/src/routes/(app)/+error.svelte"
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add protected app layout with role-based auth guard"
```

---

## Task 18: Write role home dashboard pages

**Files:**
- Create: `frontend-svelte/src/routes/(app)/dashboard/+page.svelte`
- Create: `frontend-svelte/src/routes/(app)/school/+page.svelte`
- Create: `frontend-svelte/src/routes/(app)/teacher/+page.svelte`

- [ ] **Step 1: Write dashboard/+page.svelte (super-admin)**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';

  const user = $derived($page.data.user);
</script>

<svelte:head><title>Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      {$_('dashboard.superAdmin.title')}
    </h1>
    <p class="text-gray-500 text-sm mt-1">
      {$_('dashboard.welcome', { values: { name: user?.name ?? '' } })}
    </p>
  </div>

  <!-- Stats cards (placeholder data — replaced in Plan 2) -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each [
      { key: 'totalSchools', value: '—', color: 'bg-blue-50 text-blue-700' },
      { key: 'totalAdmins', value: '—', color: 'bg-green-50 text-green-700' },
      { key: 'activeSubscriptions', value: '—', color: 'bg-purple-50 text-purple-700' },
    ] as stat}
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-sm text-gray-500 mb-1">{$_(`dashboard.superAdmin.${stat.key}`)}</p>
        <p class={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
      </div>
    {/each}
  </div>
</div>
```

- [ ] **Step 2: Write school/+page.svelte (school-admin)**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';

  const user = $derived($page.data.user);
</script>

<svelte:head><title>School Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      {$_('dashboard.schoolAdmin.title')}
    </h1>
    <p class="text-gray-500 text-sm mt-1">
      {$_('dashboard.welcome', { values: { name: user?.name ?? '' } })}
    </p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each [
      { key: 'totalStudents', value: '—', color: 'text-blue-700' },
      { key: 'totalStaff', value: '—', color: 'text-green-700' },
      { key: 'attendanceToday', value: '—', color: 'text-orange-700' },
    ] as stat}
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-sm text-gray-500 mb-1">{$_(`dashboard.schoolAdmin.${stat.key}`)}</p>
        <p class={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
      </div>
    {/each}
  </div>
</div>
```

- [ ] **Step 3: Write teacher/+page.svelte**

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';

  const user = $derived($page.data.user);
</script>

<svelte:head><title>Teacher Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      {$_('dashboard.teacher.title')}
    </h1>
    <p class="text-gray-500 text-sm mt-1">
      {$_('dashboard.welcome', { values: { name: user?.name ?? '' } })}
    </p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each [
      { key: 'myClasses', value: '—', color: 'text-blue-700' },
      { key: 'pendingAssignments', value: '—', color: 'text-yellow-700' },
      { key: 'attendanceToday', value: '—', color: 'text-green-700' },
    ] as stat}
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-sm text-gray-500 mb-1">{$_(`dashboard.teacher.${stat.key}`)}</p>
        <p class={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
      </div>
    {/each}
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add "frontend-svelte/src/routes/(app)/dashboard/" "frontend-svelte/src/routes/(app)/school/+page.svelte" "frontend-svelte/src/routes/(app)/teacher/+page.svelte"
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add role dashboard stub pages"
```

---

## Task 19: Write dynamic module route pages

**Files:**
- Create: `frontend-svelte/src/routes/(app)/school/[module]/+page.svelte`
- Create: `frontend-svelte/src/routes/(app)/teacher/[module]/+page.svelte`

- [ ] **Step 1: Write school/[module]/+page.svelte**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';

  const moduleName = $derived($page.params.module);
  const titleKey = $derived(`common.nav.${moduleName}`);
</script>

<svelte:head><title>{moduleName} — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 capitalize">
      {$_(titleKey, undefined, { default: moduleName })}
    </h1>
    <p class="text-gray-400 text-sm mt-1">Module content coming soon.</p>
  </div>

  <div class="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center">
    <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
      <span class="text-gray-400 text-lg font-bold capitalize">{moduleName.charAt(0)}</span>
    </div>
    <p class="text-gray-500 text-sm">
      <strong class="capitalize">{moduleName}</strong> module — implementation in Plan 2
    </p>
  </div>
</div>
```

- [ ] **Step 2: Write teacher/[module]/+page.svelte**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';

  const moduleName = $derived($page.params.module);
  const titleKey = $derived(`common.nav.${moduleName}`);
</script>

<svelte:head><title>{moduleName} — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 capitalize">
      {$_(titleKey, undefined, { default: moduleName })}
    </h1>
    <p class="text-gray-400 text-sm mt-1">Module content coming soon.</p>
  </div>

  <div class="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center">
    <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
      <span class="text-gray-400 text-lg font-bold capitalize">{moduleName.charAt(0)}</span>
    </div>
    <p class="text-gray-500 text-sm">
      <strong class="capitalize">{moduleName}</strong> module — implementation in Plan 2
    </p>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add "frontend-svelte/src/routes/(app)/school/[module]/" "frontend-svelte/src/routes/(app)/teacher/[module]/"
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add dynamic module route stub pages"
```

---

## Task 20: Scaffold all 24 module directories

**Files:**
- Create (via script): `frontend-svelte/src/modules/[24 modules]/` — each with `components/`, `stores/`, `services/`, `types/`, `index.ts`

- [ ] **Step 1: Run scaffold script**

Run from `erp_portal/`:
```powershell
$modules = @(
  'academics', 'admissions', 'approvals', 'attendance', 'classes',
  'communication', 'dashboard', 'data-import', 'downloads', 'exams',
  'finance', 'hostel', 'house', 'hr', 'inventory', 'library',
  'maintenance', 'salary', 'social-media', 'sports', 'staff',
  'students', 'support', 'survey', 'timetable', 'transport', 'visitor'
)

foreach ($mod in $modules) {
  $base = "frontend-svelte\src\modules\$mod"
  New-Item -ItemType Directory -Force "$base\components" | Out-Null
  New-Item -ItemType Directory -Force "$base\stores" | Out-Null
  New-Item -ItemType Directory -Force "$base\services" | Out-Null
  New-Item -ItemType Directory -Force "$base\types" | Out-Null

  $index = @"
// Module: $mod
// TODO (Plan 2): implement full module content

export const ${mod.Replace('-', '')}Module = {
  id: '$mod',
  navItem: {
    id: '$mod',
    label: 'common.nav.$mod',
    href: '/school/$mod',
    icon: 'Package',
    roles: ['school-admin'] as import('`$lib/types').UserRole[],
  },
} satisfies import('`$lib/types').ModuleRegistration;
"@
  Set-Content -Path "$base\index.ts" -Value $index -Encoding UTF8
}

Write-Host "Scaffolded $($modules.Length) modules"
```

- [ ] **Step 2: Verify scaffold**

```powershell
Get-ChildItem "frontend-svelte\src\modules" -Directory | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: `27`

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/modules/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): scaffold all 27 module directories with empty structure"
```

---

## Task 21: Write module registry

**Files:**
- Create: `frontend-svelte/src/lib/moduleRegistry.ts`

- [ ] **Step 1: Write moduleRegistry.ts**

```ts
import type { ModuleRegistration } from '$lib/types';

export const MODULE_REGISTRY: Record<string, ModuleRegistration> = {
  finance: {
    id: 'finance',
    navItem: { id: 'finance', label: 'common.nav.finance', href: '/school/finance', icon: 'DollarSign', roles: ['school-admin'] },
  },
  attendance: {
    id: 'attendance',
    navItem: { id: 'attendance', label: 'common.nav.attendance', href: '/school/attendance', icon: 'Calendar', roles: ['school-admin', 'teacher'] },
  },
  hr: {
    id: 'hr',
    navItem: { id: 'hr', label: 'common.nav.hr', href: '/school/hr', icon: 'UserCheck', roles: ['school-admin'] },
  },
  exams: {
    id: 'exams',
    navItem: { id: 'exams', label: 'common.nav.exams', href: '/school/exams', icon: 'BookOpen', roles: ['school-admin', 'teacher'] },
  },
  academics: {
    id: 'academics',
    navItem: { id: 'academics', label: 'common.nav.academics', href: '/school/academics', icon: 'GraduationCap', roles: ['school-admin', 'teacher'] },
  },
  admissions: {
    id: 'admissions',
    navItem: { id: 'admissions', label: 'common.nav.admissions', href: '/school/admissions', icon: 'ClipboardList', roles: ['school-admin'] },
  },
  students: {
    id: 'students',
    navItem: { id: 'students', label: 'common.nav.students', href: '/school/students', icon: 'Users', roles: ['school-admin', 'teacher'] },
  },
  staff: {
    id: 'staff',
    navItem: { id: 'staff', label: 'common.nav.staff', href: '/school/staff', icon: 'Users', roles: ['school-admin'] },
  },
  timetable: {
    id: 'timetable',
    navItem: { id: 'timetable', label: 'common.nav.timetable', href: '/school/timetable', icon: 'Clock', roles: ['school-admin', 'teacher'] },
  },
  transport: {
    id: 'transport',
    navItem: { id: 'transport', label: 'common.nav.transport', href: '/school/transport', icon: 'Bus', roles: ['school-admin'] },
  },
  library: {
    id: 'library',
    navItem: { id: 'library', label: 'common.nav.library', href: '/school/library', icon: 'BookMarked', roles: ['school-admin'] },
  },
  hostel: {
    id: 'hostel',
    navItem: { id: 'hostel', label: 'common.nav.hostel', href: '/school/hostel', icon: 'Home', roles: ['school-admin'] },
  },
  inventory: {
    id: 'inventory',
    navItem: { id: 'inventory', label: 'common.nav.inventory', href: '/school/inventory', icon: 'Package', roles: ['school-admin'] },
  },
  sports: {
    id: 'sports',
    navItem: { id: 'sports', label: 'common.nav.sports', href: '/school/sports', icon: 'Trophy', roles: ['school-admin'] },
  },
  communication: {
    id: 'communication',
    navItem: { id: 'communication', label: 'common.nav.communication', href: '/school/communication', icon: 'MessageSquare', roles: ['school-admin', 'teacher'] },
  },
  salary: {
    id: 'salary',
    navItem: { id: 'salary', label: 'common.nav.salary', href: '/school/salary', icon: 'Wallet', roles: ['school-admin'] },
  },
  maintenance: {
    id: 'maintenance',
    navItem: { id: 'maintenance', label: 'common.nav.maintenance', href: '/school/maintenance', icon: 'Wrench', roles: ['school-admin'] },
  },
  visitor: {
    id: 'visitor',
    navItem: { id: 'visitor', label: 'common.nav.visitor', href: '/school/visitor', icon: 'Building2', roles: ['school-admin'] },
  },
};

export function getModuleById(id: string): ModuleRegistration | undefined {
  return MODULE_REGISTRY[id];
}

export function getModulesForRole(role: import('$lib/types').UserRole): ModuleRegistration[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.navItem.roles.includes(role));
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add frontend-svelte/src/lib/moduleRegistry.ts
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): add module registry for all 18 modules"
```

---

## Task 22: Update root package.json and run type-check

**Files:**
- Modify: `erp_portal/package.json`

- [ ] **Step 1: Update root package.json**

Replace the content of `erp_portal/package.json` with:
```json
{
  "name": "erp-portal",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "npm run dev --prefix frontend",
    "dev:react": "npm run dev --prefix frontend",
    "dev:svelte": "npm run dev --prefix frontend-svelte",
    "build": "npm run build --prefix frontend && npm run build --prefix backend",
    "build:frontend": "npm run build --prefix frontend",
    "build:svelte": "npm run build --prefix frontend-svelte",
    "build:backend": "npm run build --prefix backend",
    "start": "npm run start --prefix backend",
    "test": "npm run test --prefix frontend",
    "test:svelte": "npm run test --prefix frontend-svelte",
    "lint": "npm run lint --prefix frontend",
    "lint:svelte": "npm run lint --prefix frontend-svelte",
    "check:svelte": "npm run check --prefix frontend-svelte"
  }
}
```

- [ ] **Step 2: Run SvelteKit type sync**

```powershell
cd "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal\frontend-svelte"
npx svelte-kit sync
```

Expected: `.svelte-kit/tsconfig.json` generated, no errors.

- [ ] **Step 3: Run type-check**

```powershell
npm run check
```

Expected: `0 errors`. Fix any type errors before continuing.

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add package.json frontend-svelte/
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): update root scripts, pass type-check"
```

---

## Task 23: Run all unit tests

- [ ] **Step 1: Run Vitest**

```powershell
cd "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal\frontend-svelte"
npm run test
```

Expected: `10 passed` (6 API client tests + 6 auth utils tests, minus any already passing).

- [ ] **Step 2: Fix any failures**

If a test fails:
- Read the error message
- Trace back to the failing file (Task 6 or Task 7)
- Fix the implementation, not the test (tests define the contract)

---

## Task 24: Verify dev server starts

- [ ] **Step 1: Start the SvelteKit dev server**

```powershell
cd "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal\frontend-svelte"
npm run dev
```

Expected output:
```
  VITE v6.x.x  ready in NNNms
  ➜  Local:   http://localhost:5173/
  ➜  Network: ...
```

- [ ] **Step 2: Verify landing page**

Open `http://localhost:5173/` in a browser.

Expected: Dark gradient landing page with "ERP Portal" heading and three login buttons.

- [ ] **Step 3: Verify login redirect**

Navigate to `http://localhost:5173/school` directly.

Expected: Redirected to `http://localhost:5173/login` (auth guard working).

- [ ] **Step 4: Verify login form renders**

Navigate to `http://localhost:5173/login`.

Expected: White card with "Teacher Login" heading, email + password fields, Sign In button.

- [ ] **Step 5: Verify school-login and super-login**

Navigate to `/school-login` and `/super-login`.

Expected: Green card "School Admin Login" and purple card "Super Admin Login" respectively.

- [ ] **Step 6: Final commit**

```bash
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" add .
git -C "C:\Users\JAY\OneDrive\Desktop\erp\erp_portal" commit -m "feat(svelte): foundation complete — auth, routing, layout, module scaffolds"
```

---

## Checklist: Foundation Complete

After Task 24, verify all success criteria from the spec:

- [ ] Dev server starts at `http://localhost:5173`
- [ ] Landing page renders
- [ ] All 3 login pages render with correct styling
- [ ] Direct access to `/school`, `/teacher`, `/dashboard` redirects to `/login`
- [ ] After login (if backend running): redirects to correct role home
- [ ] Sidebar renders with correct nav items per role
- [ ] Locale switcher visible in TopNavbar
- [ ] `npm run test` passes (unit tests)
- [ ] `npm run check` passes (TypeScript, no errors)
- [ ] All 27 module directories exist under `src/modules/`
- [ ] `src/lib/moduleRegistry.ts` exists with all 18 modules registered

---

## What comes next: Plan 2

**Plan 2: Core Module Content** will implement full UI for:
- Finance module (student fee summary, class fee structures, payment recording)
- Attendance module (mark attendance, view reports)
- HR module (staff list, leave management)
- Exams module (exam list, marks entry)
- Dashboard (real data from API, charts)

Plan 2 builds on this foundation. All module stores, services, and components go into the `src/modules/[name]/` scaffolds created in Task 20.
