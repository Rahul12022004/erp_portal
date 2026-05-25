# ERP Portal

A modular monolith ERP system for educational institutions. Built with React + TypeScript (frontend) and Node.js + Express + MongoDB (backend).

## Repository Structure

```
erp_portal/
├── frontend/          # Vite + React + TypeScript application
├── backend/           # Express + TypeScript + MongoDB API
├── docs/              # Project documentation and API references
├── deployment/        # Deployment configuration and scripts
├── .env.example       # Root environment variable template
└── package.json       # Monorepo root scripts
```

## Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm 9+

## Quick Start

```bash
# 1. Install all dependencies
npm install
npm --prefix backend install

# 2. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
# Edit backend/.env — set MONGO_URI to your MongoDB connection string

# 3. Start development servers (separate terminals)
npm run dev:backend   # API server → http://localhost:5000
npm run dev           # Frontend   → http://localhost:8080
```

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `VITE_API_URL` | `.env` | Frontend API base URL |
| `MONGO_URI` | `backend/.env` | MongoDB connection string |
| `FRONTEND_ORIGINS` | `backend/.env` | Comma-separated allowed CORS origins |
| `SEED_LOCAL_DATA` | `backend/.env` | Set `true` to seed demo school data on startup |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run dev:backend` | Start backend dev server |
| `npm run build` | Build frontend and backend for production |
| `npm run build:frontend` | Build frontend only |
| `npm run build:backend` | Build backend only |
| `npm start` | Start backend in production mode |
| `npm test` | Run frontend tests |
| `npm run lint` | Run frontend linter |

## Documentation

- [Authentication](docs/AUTHENTICATION.md)
- [Finance API Reference](docs/FINANCE_API_REFERENCE.md)
- [Finance Quickstart](docs/FINANCE_QUICKSTART.md)
- [School Signup Guide](docs/SCHOOL_SIGNUP_GUIDE.md)
- [Testing Guide](docs/TESTING_GUIDE.md)

## Modules

The platform covers the full school operations lifecycle:

- **Finance** — fee structures, student fee assignments, payment tracking
- **Students** — enrollment, profiles, academic records
- **Academics** — classes, sections, subjects, timetables
- **Attendance** — daily tracking with reports
- **Exams** — scheduling, results, report cards
- **Transport** — routes, vehicles, student assignment
- **Staff** — HR, payroll, leave management
- **Library** — catalog, issue/return tracking
- **Hostel** — room allocation, fee management
- **Notifications** — email, SMS, push alerts

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `git commit -m "feat(module): description"`
4. Open a pull request against `main`
