# ERP Portal

This project supports both local development and deployed environments.

## Local Setup

1. Install dependencies at the project root:
	- `npm install`
2. Install backend dependencies:
	- `npm --prefix backend install`
3. Create environment files:
	- Copy `.env.example` to `.env`
	- Copy `backend/.env.example` to `backend/.env`
4. Update `backend/.env` with a valid `MONGO_URI`.
5. Optional: set `SEED_LOCAL_DATA=true` in `backend/.env` only if you want demo school data inserted locally.

## Run Locally

Start backend:

```bash
npm run dev:backend
```

Start frontend (new terminal):

```bash
npm run dev
```

Frontend runs on `http://localhost:8080`.
Set `VITE_API_URL` in `.env` to the backend you want the frontend to call, for example `http://localhost:5000`.

## Build

```bash
npm run build
```

## Environment Notes

- Frontend API base is configured with `VITE_API_URL`.
- Backend database and demo-seed behavior are configured from `backend/.env`.
- Backend CORS is configured by `FRONTEND_ORIGINS` (comma-separated) and also allows localhost ports during development.
- Existing hardcoded deployed API URLs are rewritten at runtime to the active API base to keep older modules working in local mode.

