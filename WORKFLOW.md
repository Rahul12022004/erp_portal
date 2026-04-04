# Repository Workflow

This repo is a split frontend/backend ERP app. The frontend is a Vite + React + TypeScript app at the repo root, and the backend is an Express + TypeScript API in `backend/`.

## Project Structure

- `src/` - frontend pages, layouts, components, hooks, and shared utilities.
- `backend/src/` - API routes, MongoDB models, config, and seed data.
- `src/pages/school-admin/` - school-admin dashboard and modules.
- `src/pages/super_admin/` - super-admin dashboard, schools, admins, logs, settings, and subscription pages.
- `src/pages/teacher/` - teacher dashboard and teacher modules.
- `backend/src/routes/` - server endpoints for students, finance, exams, marks, schools, logs, and other modules.

## Start The App

- Install root dependencies with `npm install`.
- Install backend dependencies with `npm --prefix backend install`.
- Start the frontend with `npm run dev`.
- Start the backend with `npm run dev:backend`.
- Frontend development uses `scripts/frontend-dev-runner.mjs` and runs on `http://localhost:8081`.
- Backend development uses `backend/scripts/dev-runner.js` and serves the API on `http://localhost:5000`.
- The frontend proxies `/api` requests to the backend during local development.

## Build And Verify

- `npm run build` builds the frontend and backend.
- `npm run build:backend` builds only the backend.
- `npm run start:backend` starts the compiled backend from `backend/dist/server.js`.
- `npm run test` runs the frontend Vitest suite.
- `npm run test:watch` runs Vitest in watch mode.
- `npx tsc --noEmit` is a fast typecheck for the whole repo.
- `npx eslint .` checks linting, but this repo still has some pre-existing lint debt outside a single change set.

## Key Code Areas

- `src/App.tsx` defines the main route map and role-based redirects.
- `src/contexts/RoleContext.tsx` manages auth and role state.
- `src/lib/auth.ts` contains safe localStorage/session helpers.
- `src/pages/school-admin/modules/StudentModule.tsx` handles student records and student finance display.
- `src/pages/school-admin/modules/AdmissionsModule.tsx` handles admissions and import flows.
- `src/pages/school-admin/modules/FinanceModule.tsx` handles finance summaries and ledger imports.
- `src/pages/super_admin/DashboardPage.tsx`, `SchoolsPage.tsx`, `SchoolAdminsPage.tsx`, `LogsPage.tsx`, `SettingsPage.tsx`, and `Subscription.tsx` are the main super-admin screens.
- `backend/src/server.ts` wires Express middleware and all routes together.
- `backend/src/routes/studentRoutes.ts` and `backend/src/routes/financeRoutes.ts` are the main data flows for student and fee operations.

## Safe Change Workflow

1. Check the relevant frontend page and backend route together before editing.
2. Keep changes focused to one feature or bug at a time.
3. Run `npx tsc --noEmit` after edits.
4. Run a targeted `npx eslint <file>` on the files you changed, then broader lint only if needed.
5. Restart the frontend or backend dev runner if you changed startup or route wiring.
6. Refresh the browser and verify the exact module that changed.

## Notes

- If the backend is not connected to MongoDB, many import and save flows will render correctly but fail on submit.
- If the frontend opens blank, check the browser console and `localStorage` session values first.
- The current local development defaults are `8081` for frontend and `5000` for backend.
