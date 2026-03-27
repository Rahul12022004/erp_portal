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

The checked-in `.env` uses `VITE_API_URL=auto`.
In auto mode, the frontend uses the local backend only when `http://localhost:5000/api/health` reports a healthy Mongo-backed backend.
If the local backend is unavailable or MongoDB is disconnected, the frontend falls back to the deployed backend automatically.

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
By default it switches automatically:
- local backend when healthy and connected to MongoDB
- deployed backend when local backend is unavailable or has no DB connection

To force a specific backend, set `VITE_API_URL` in `.env` to an explicit URL such as `http://localhost:5000` or `https://erp-portal-1-ftwe.onrender.com`.

## Build

```bash
npm run build
```

## Environment Notes

- Frontend API base is configured with `VITE_API_URL`, and `auto` enables health-based local/deployed switching.
- Backend CORS is configured by `FRONTEND_ORIGINS` (comma-separated).
- Existing hardcoded deployed API URLs are rewritten at runtime to the active API base to keep older modules working in local mode.

