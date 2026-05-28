# Frontend Structure & Design System

> **MANDATORY:** Read this file before editing ANY frontend file in `frontend-svelte/`.
> Every new page, component, or feature must follow these conventions exactly.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (Svelte 5 runes) |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Icons | `lucide-svelte` |
| Fonts | Space Grotesk (headings) · Inter (body) |
| Animation | `tailwindcss-animate` |
| Type checking | TypeScript strict |
| Config files | `tailwind.config.ts` · `src/app.css` |

---

## Directory Layout

```
frontend-svelte/src/
├── app.css                          ← global styles, CSS vars, component classes
├── lib/
│   ├── api/client.ts                ← typed API wrapper
│   ├── auth/utils.ts                ← getRoleHome()
│   ├── components/layout/
│   │   ├── Sidebar.svelte           ← navigation (super-admin / school-admin / teacher)
│   │   └── TopNavbar.svelte         ← header with title, bell, user dropdown
│   ├── stores/
│   │   └── school.ts                ← schoolStore (name, logo, modules, plan)
│   └── types/index.ts               ← User, UserRole, ApiError
└── routes/
    ├── (public)/                    ← login, school-login, signup (no auth)
    └── (app)/                       ← all authenticated pages
        ├── +layout.server.ts        ← auth guard + announcement banner load
        ├── +layout.svelte           ← sidebar + navbar + announcement banner
        ├── dashboard/               ← super-admin dashboard
        ├── schools/                 ← school CRUD
        ├── school-admins/
        ├── subscriptions/
        ├── settings/
        ├── logs/
        └── school/                  ← school-admin area
            ├── +layout.server.ts    ← global module disable check
            ├── +layout.svelte       ← maintenance screen gate
            ├── +page.svelte         ← school dashboard
            ├── finance/
            ├── students/
            └── [module]/            ← catch-all for stub pages
```

---

## Color System

All colors defined as CSS HSL variables in `src/app.css`. Use **Tailwind semantic tokens**, not raw hex.

### Semantic Tokens (use these in components)

| Token | Tailwind class | HSL value | Hex approx | Use for |
|-------|---------------|-----------|------------|---------|
| `--primary` | `bg-primary` / `text-primary` | 168 80% 36% | `#0b9e71` | CTA buttons, active states, links, badges |
| `--primary-foreground` | `text-primary-foreground` | 0 0% 100% | `#ffffff` | Text on primary bg |
| `--background` | `bg-background` | 210 20% 98% | `#f7f9fb` | Page background |
| `--foreground` | `text-foreground` | 220 30% 10% | `#131b2e` | Body text, headings |
| `--card` | `bg-card` | 0 0% 100% | `#ffffff` | Card / panel backgrounds |
| `--card-foreground` | `text-card-foreground` | 220 30% 10% | `#131b2e` | Text inside cards |
| `--muted` | `bg-muted` | 220 14% 96% | `#f1f3f7` | Subtle backgrounds, hover states |
| `--muted-foreground` | `text-muted-foreground` | 220 10% 46% | `#6b7280` | Secondary/helper text, placeholders |
| `--border` | `border-border` | 220 13% 91% | `#e5e7eb` | All borders |
| `--destructive` | `bg-destructive` / `text-destructive` | 0 72% 51% | `#e53e3e` | Delete, errors, critical |
| `--success` | `bg-success` / `text-success` | 142 71% 45% | `#22c55e` | Success states, active plans, paid |
| `--warning` | `bg-warning` / `text-warning` | 38 92% 50% | `#f59e0b` | Warnings, expiring soon |
| `--info` | `bg-info` / `text-info` | 217 91% 60% | `#3b82f6` | Informational, upgrades |

### Sidebar Colors (sidebar only — never use elsewhere)

| Variable | Value | Use |
|----------|-------|-----|
| `--sidebar-bg` | hsl(222 47% 11%) `#0e1629` | Sidebar background |
| `--sidebar-fg` | hsl(220 20% 80%) | Inactive nav links |
| `--sidebar-fg-active` | `#ffffff` | Logo/brand text |
| `--sidebar-border` | hsl(222 30% 18%) | Sidebar dividers |
| `--sidebar-hover` | hsl(222 30% 16%) | Nav link hover |
| `--sidebar-accent` | hsl(168 80% 36%) | Active link indicator |
| Active link text | `#FFC107` (amber) | Active nav item text |

### Status Colors (quick reference)

```
Paid / Active / Enabled    → text-green-600  bg-green-50  border-green-200
Pending / Warning          → text-yellow-600 bg-yellow-50 border-yellow-200
Overdue / Error / Critical → text-red-600    bg-red-50    border-red-200
Info / Upgrade             → text-blue-600   bg-blue-50   border-blue-200
Disabled / Inactive        → text-gray-400   bg-gray-100
```

---

## Typography

```
Font display (headings h1–h6) : "Space Grotesk", system-ui, sans-serif
Font body (all other text)    : "Inter", system-ui, sans-serif
```

### Text scale

| Class | Usage |
|-------|-------|
| `text-2xl font-bold text-gray-900` | Page title (`<h1>`) |
| `text-lg font-semibold text-foreground` | Top navbar title |
| `text-sm font-semibold text-gray-500 uppercase tracking-wider` | Section header inside card |
| `text-sm font-medium text-gray-700` | Form label, table header |
| `text-sm text-gray-600` | Body / description text |
| `text-xs text-gray-400` | Helper text, timestamps |
| `font-display` | Apply to all `<h1>`–`<h6>` (Tailwind class from config) |
| `font-body` | Applied globally to `<body>` in app.css |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Announcement Banner (full width, when enabled)           │
├──────────┬──────────────────────────────────────────────┤
│          │ TopNavbar (sticky, h-16, bg-card, z-30)       │
│ Sidebar  ├──────────────────────────────────────────────┤
│ (w-64,   │ <main> p-6 pt-20 lg:pt-6 overflow-auto        │
│ fixed,   │                                               │
│ dark)    │   Page content here                           │
│          │                                               │
└──────────┴──────────────────────────────────────────────┘
```

- Sidebar: `fixed left-0 inset-y-0 w-64` (desktop), slide-in on mobile
- Main area: `ml-0 lg:ml-64 flex-1 flex flex-col`
- Content padding: `p-6` (24px all sides)
- Top padding on mobile: `pt-20` (accounts for fixed navbar)

---

## Component Patterns

### Page skeleton

```svelte
<svelte:head><title>Page Name — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Page Title</h1>

  <!-- content -->
</div>
```

### Stat card row

```svelte
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <div class="bg-white shadow rounded-xl p-5">
    <p class="text-sm text-gray-500">Label</p>
    <p class="text-2xl font-bold text-gray-900">Value</p>
  </div>
</div>
```

Color variants for stat values:
- Positive/paid: `text-green-600`
- Negative/unpaid: `text-red-600`
- Warning: `text-yellow-500`
- Neutral: `text-gray-900`

### Content card / section

```svelte
<div class="bg-white shadow rounded-xl p-6">
  <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
    Section Title
  </h3>
  <!-- content -->
</div>
```

### Data table

```svelte
<div class="bg-white shadow rounded-xl overflow-hidden">
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Column
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#each items as item}
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            {item.value}
          </td>
        </tr>
      {/each}
      {#if items.length === 0}
        <tr>
          <td colspan="N" class="px-6 py-8 text-center text-gray-400">No data found.</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
```

### Search bar

```svelte
<input
  bind:value={search}
  type="text"
  placeholder="Search..."
  class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

### Buttons

```svelte
<!-- Primary action -->
<button class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
  Add New
</button>

<!-- Success / save -->
<button class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
  Save
</button>

<!-- Danger / delete -->
<button class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
  Delete
</button>

<!-- Secondary / outline -->
<button class="border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
  Cancel
</button>

<!-- Small action (in table rows) -->
<button class="text-xs font-medium px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100">
  Edit
</button>

<!-- Disabled state — always add to all buttons -->
disabled={saving}
class="... disabled:opacity-50"
```

### Toggle switch

```svelte
<button
  onclick={() => { value = !value; }}
  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {value ? 'bg-green-500' : 'bg-gray-300'}"
  role="switch"
  aria-checked={value}
  aria-label="Toggle label"
>
  <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {value ? 'translate-x-6' : 'translate-x-1'}"></span>
</button>
```

### Form input

```svelte
<div>
  <label class="block text-xs font-medium text-gray-600 mb-1" for="fieldId">
    Field Label
  </label>
  <input
    id="fieldId"
    bind:value={formField}
    type="text"
    placeholder="..."
    class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

Form grids: `grid grid-cols-1 sm:grid-cols-2 gap-4` (inside a card)

### Modal / Dialog

```svelte
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <button
      type="button"
      aria-label="Close"
      class="absolute inset-0 bg-black/50"
      onclick={closeModal}
    ></button>
    <!-- Panel -->
    <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
      <h2 class="text-lg font-bold text-gray-900">Modal Title</h2>
      <!-- content -->
      <div class="flex gap-3 pt-2">
        <button onclick={closeModal} class="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50">
          Cancel
        </button>
        <button onclick={handleConfirm} class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm">
          Confirm
        </button>
      </div>
    </div>
  </div>
{/if}
```

### Status badge

```svelte
<!-- Paid / Active -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  Paid
</span>

<!-- Pending -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
  Pending
</span>

<!-- Overdue / Error -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
  Overdue
</span>
```

### Loading state

```svelte
{#if loading}
  <p class="text-gray-500">Loading...</p>
{:else}
  <!-- content -->
{/if}
```

### Empty state

```svelte
<div class="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3">
  <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
    <!-- icon -->
  </div>
  <h3 class="text-lg font-semibold text-gray-700">No Data Found</h3>
  <p class="text-sm text-gray-500 max-w-sm">Description of empty state.</p>
</div>
```

### Tabs

```svelte
<div class="flex border-b border-gray-200">
  {#each (['Tab1', 'Tab2'] as const) as tab}
    <button
      onclick={() => { activeTab = tab; }}
      class="px-5 py-3 text-sm font-medium border-b-2 transition
        {activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
    >
      {tab}
    </button>
  {/each}
</div>
```

---

## Svelte 5 Patterns

**Always use Svelte 5 runes. Never use Svelte 4 reactive syntax.**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // State
  let items = $state<Item[]>([]);
  let loading = $state(true);
  let search = $state('');

  // Derived (computed)
  const filtered = $derived(items.filter(i => i.name.includes(search)));
  const total = $derived(items.length);

  // Derived with complex logic
  const stats = $derived.by(() => {
    // multi-line logic here
    return items.reduce(/* ... */);
  });

  // Get user/schoolId from page data
  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const role = $derived($page.data.user?.role ?? '');

  onMount(async () => {
    await fetchData();
  });
</script>
```

**DO NOT use:**
- `$: reactiveVar = ...` (Svelte 4)
- `export let prop` for page data (use `$props()`)
- `writable()` stores for local component state (use `$state`)

---

## API Patterns

### Base URL

All API calls go to `/api/...` (Vite proxies to Go backend at `localhost:8080`).

### Response shape (Go backend)

```json
{ "success": true, "data": <payload> }
```

Always unwrap with: `json?.data ?? json`

### Fetch pattern (client-side)

```typescript
async function fetchItems() {
  loading = true;
  try {
    const res = await fetch('/api/schools');
    const json = await res.json();
    items = json?.data?.schools ?? json?.schools ?? [];
  } catch (e) {
    console.error(e);
  } finally {
    loading = false;
  }
}
```

### Mutation pattern

```typescript
async function save() {
  saving = true;
  saveError = '';
  try {
    const res = await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      saveError = String(data?.error ?? data?.message ?? `Error ${res.status}`);
      return;
    }
    // success — refresh or update local state
    await fetchItems();
  } catch (e) {
    saveError = e instanceof Error ? e.message : 'Network error';
  } finally {
    saving = false;
  }
}
```

### Auth & user data

```typescript
// In +layout.server.ts / +page.server.ts
// user lives in locals.user, returned from load()

// In .svelte files
const user = $derived($page.data.user);
const schoolId = $derived(user?.schoolId ?? '');
const role = $derived(user?.role ?? '');

// ALWAYS use user?.id (NOT user?._id — backend returns id)
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Route files | SvelteKit convention | `+page.svelte`, `+layout.server.ts` |
| Components | PascalCase | `SchoolCard.svelte` |
| Stores | camelCase | `schoolStore.ts` |
| State variables | camelCase | `let showModal = $state(false)` |
| Form variables | prefix `f` | `let fSchoolName = $state('')` |
| API functions | `fetch` + noun | `fetchSchools()`, `fetchModules()` |
| Boolean state | `is`/`show`/`has` prefix | `isLoading`, `showModal`, `hasError` |

---

## Adding a New Feature — Checklist

When adding any new page or feature to the frontend:

### 1. Route file
- Create `src/routes/(app)/[path]/+page.svelte`
- Add `<svelte:head><title>Page — ERP Portal</title></svelte:head>`
- Start with `<div class="space-y-6">` wrapper
- Add `<h1 class="text-2xl font-bold text-gray-900">Title</h1>`

### 2. If school-admin feature
- The page lives under `src/routes/(app)/school/[module]/`
- The school layout (`school/+layout.svelte`) handles global module disable automatically
- Map the module path in `PATH_MODULE` in `school/+layout.svelte` if not already present

### 3. If super-admin feature
- Add route path to `superAdminPaths` array in `(app)/+layout.server.ts`
- Add title to `superAdminTitles` in `TopNavbar.svelte`
- Add nav item to `superAdminItems` in `Sidebar.svelte`

### 4. Sidebar
- Super-admin items: edit `superAdminItems` array in `Sidebar.svelte`
- School-admin items: check `schoolMenuGroups` array — add to correct group
- Add icon import from `lucide-svelte` at top of `Sidebar.svelte`
- Add icon to `schoolIconMap` if school-admin module

### 5. Colors & styling
- Use semantic tokens (`bg-primary`, `text-muted-foreground`, etc.) — not raw hex
- Status colors: green=paid/active, yellow=warning, red=error/critical, blue=info
- All cards: `bg-white shadow rounded-xl p-6`
- All borders: `border border-gray-200` or `border-border`

### 6. Loading & errors
- ALWAYS show loading state while fetching
- ALWAYS show empty state when list is empty
- ALWAYS handle fetch errors (set `saveError` string, show inline)
- NEVER use `alert()` — use inline error messages

### 7. Forms & modals
- Modals use the fixed overlay pattern (see Modal section above)
- Form grids: `sm:grid-cols-2`
- All inputs use `focus:ring-2 focus:ring-blue-500` pattern
- Disable submit button when `saving === true`
- Show `saveError` in red below form, never in alert

### 8. Data
- All data from backend — no hardcoded lists in production features
- Unwrap responses: `json?.data ?? json`
- Re-fetch after mutations (don't manually splice state)

### 9. Backend module key
- If new module = new school admin route, add the backend module name to:
  - `modulesByPlan()` in `go-backend/internal/modules/school/services/service.go`
  - `portalModulesByNormalized` in `Sidebar.svelte`
  - `PATH_MODULE` in `(app)/school/+layout.svelte`
  - `ALL_MODULES` in `(app)/settings/+page.svelte`

---

## Global CSS Classes (defined in `app.css`)

| Class | Description |
|-------|-------------|
| `.stat-card` | Card with hover shadow — `bg-card rounded-xl border border-border p-6 shadow-sm` |
| `.sidebar-link` | Nav link in sidebar — flex, gap-3, rounded-lg, transitions |
| `.sidebar-link.active` | Active nav — accent bg, amber text `#FFC107` |
| `.page-header` | `text-2xl font-display font-bold tracking-tight text-foreground` |
| `.tab-content-enter` | Fade-in animation for tab content (0.18s) |
| `.input-field` | Form input — defined in `settings/+page.svelte` (move to app.css if reused) |

---

## Border Radius

```
--radius: 0.625rem (10px)

rounded-sm  = 6px  (calc(var(--radius) - 4px))
rounded-md  = 8px  (calc(var(--radius) - 2px))
rounded-lg  = 10px (var(--radius))  ← default for cards, inputs
rounded-xl  = 12px                  ← cards, modals
rounded-2xl = 16px                  ← large cards
rounded-full = pill / avatar
```

---

## Spacing Conventions

| Context | Spacing |
|---------|---------|
| Page top-level sections | `space-y-6` |
| Inside cards | `space-y-4` |
| Form fields inside grid | `gap-4` |
| Stat cards grid | `gap-4` |
| Inline button row | `gap-2` or `gap-3` |
| Table cell padding | `px-6 py-4` (body) · `px-6 py-3` (header) |
| Card padding | `p-6` |
| Modal padding | `p-6` |

---

## Announcement Banner (Global)

Set from **Settings → General → System Announcement Banner**.  
Renders in `(app)/+layout.svelte` above all content when enabled.

- `info` type → `bg-blue-600 text-white`
- `warning` type → `bg-yellow-400 text-yellow-900`
- `critical` type → `bg-red-600 text-white`

Target options: `all`, `school-admin`, `super-admin`

---

## Module Maintenance Gate

All routes under `/school/*` are wrapped by `(app)/school/+layout.svelte`.  
If super admin disables a module in **Settings → Modules**, the corresponding school page shows a maintenance screen instead of content.

Maintenance screen renders: wrench icon + "Maintenance in Progress" heading + subtext.

Path → module key mapping lives in `PATH_MODULE` in `school/+layout.svelte`.
