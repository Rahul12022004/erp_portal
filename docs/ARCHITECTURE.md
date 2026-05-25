# ERP Portal — Backend Architecture

## Modular Monolith Structure

```
backend/src/
│
├── server.ts                    # Express app bootstrap & route wiring
├── seed.ts                      # Data seeder (dev only)
├── cleanupDemoData.ts           # Demo data cleanup script
│
├── core/                        # Framework-level concerns
│   ├── config/
│   │   ├── db.ts                # MongoDB connection
│   │   └── env.ts               # Validated env config
│   ├── middleware/
│   │   └── auth.ts              # JWT auth middleware
│   ├── utils/
│   │   ├── createLog.ts         # Audit log writer
│   │   ├── jwt.ts               # JWT sign/verify
│   │   ├── loginThrottle.ts     # Brute-force rate limiting
│   │   └── sendEmail.ts         # Nodemailer wrapper
│   ├── events/
│   │   └── index.ts             # EventBus (pub/sub for domain events)
│   └── module-registry/
│       └── index.ts             # ModuleRegistry (module manifest store)
│
├── infrastructure/              # Cross-cutting technical concerns
│   ├── database/
│   │   └── index.ts             # DB connection re-export
│   ├── cache/
│   │   └── index.ts             # CacheProvider interface + NoOp stub
│   ├── logger/
│   │   └── index.ts             # Structured logger
│   └── queue/
│       └── index.ts             # Job queue interface + InMemory stub
│
├── shared/                      # Types/constants used across modules
│   ├── types/
│   │   └── index.ts             # PaginatedResponse, ApiResponse, ObjectId
│   ├── constants/
│   │   └── index.ts             # HTTP_STATUS, ROLES, page limits
│   └── utils/
│       └── index.ts             # Shared pure utilities
│
└── modules/                     # Domain modules (26 target domains)
    │
    ├── [DOMAIN]/                # One folder per bounded context
    │   ├── api/                 # Route handlers (Express routers)
    │   ├── application/         # Use cases, services, orchestration
    │   ├── domain/              # Mongoose models, business rules
    │   ├── infrastructure/      # Module-scoped DB/storage adapters
    │   ├── events/              # Domain event definitions & handlers
    │   ├── jobs/                # Background jobs for this module
    │   ├── tests/               # Module-scoped unit/integration tests
    │   └── index.ts             # Public API surface (barrel export)
    │
    ├── auth/                    # JWT auth, sessions, password management
    ├── students/                # Student enrollment & profiles ← HAS CODE
    ├── academics/               # Classes, subjects, marks ← HAS CODE
    ├── attendance/              # Daily attendance tracking (stub)
    ├── exams/                   # Exam scheduling & results (stub)
    ├── finance/                 # Fee structures, payments ← HAS CODE
    ├── payroll/                 # Staff salary & payslips (stub)
    ├── transport/               # Routes, vehicles, assignments ← HAS CODE
    ├── hostel/                  # Room allocation & fees ← HAS CODE
    ├── library/                 # Book catalog & issue tracking ← HAS CODE
    ├── reports/                 # Report generation (stub)
    ├── notifications/           # Email/SMS/push alerts (stub)
    ├── admissions/              # Application & enrollment workflow (stub)
    ├── timetable/               # Period/schedule management (stub)
    ├── homework/                # Assignment & submission (stub)
    ├── staff/                   # HR, leave, roles ← HAS CODE
    ├── analytics/               # Dashboards & KPIs (stub)
    ├── settings/                # School config, feature flags (stub)
    ├── admin/                   # Super-admin operations (stub)
    ├── communication/           # Announcements, campaigns ← HAS CODE
    ├── inventory/               # Asset tracking ← HAS CODE
    ├── certificates/            # Certificate generation (stub)
    ├── parents/                 # Parent portal & communication (stub)
    ├── fees/                    # Fee collection UI flows (stub)
    ├── ai-assistant/            # AI features ← HAS CODE
    ├── integrations/            # Third-party webhooks & APIs (stub)
    └── audit/                   # Audit log query & reporting (stub)
```

## Layer Responsibilities

| Layer | Responsibility | Contains |
|-------|---------------|----------|
| `api/` | HTTP boundary | Express routers, request validation, response mapping |
| `application/` | Orchestration | Services, use cases, transaction coordination |
| `domain/` | Business rules | Mongoose models, domain logic, value objects |
| `infrastructure/` | Adapters | Module-specific external service clients |
| `events/` | Async messaging | Domain event types and handlers |
| `jobs/` | Background work | Scheduled and async job processors |
| `tests/` | Verification | Unit and integration tests |

## Path Aliases

Configured in `backend/tsconfig.json`:

```typescript
import { eventBus }    from "@core/events";
import { logger }      from "@infrastructure/logger";
import { ApiResponse } from "@shared/types";
import FinanceService  from "@modules/finance/application";
```

> **Note:** Install `tsc-alias` (`npm i -D tsc-alias`) and update build script to
> `"build": "tsc && tsc-alias"` for aliases to work in compiled output.
> For dev (`ts-node`), install `tsconfig-paths` and pass `-r tsconfig-paths/register`.
