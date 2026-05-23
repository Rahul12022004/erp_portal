# ERP Portal — Modular Monolith Architecture

## Layer Overview

```mermaid
graph TB
    subgraph entry["Entry Point"]
        S[server.ts]
    end

    subgraph core["core/"]
        ML[moduleLoader.ts]
        MR[module-registry/index.ts]
        EV[events/index.ts]
        MW[middleware/auth.ts]
        CFG[config/db.ts + env.ts]
    end

    subgraph infra["infrastructure/"]
        DB[database/]
        CA[cache/]
        LG[logger/]
        QU[queue/]
    end

    subgraph shared["shared/"]
        TY[types/ — RouteEntry + domain types]
        UT[utils/]
        CN[constants/]
    end

    subgraph modules["modules/ — 35 domains"]
        direction LR
        subgraph active["Active Routes — 17 modules"]
            ACM[academics]
            COM[communication]
            FIN[finance]
            STA[staff]
            STU[students]
            TRP[transport]
            HOS[hostel]
            LIB[library]
            INV[inventory]
            SCH[school]
            LGS[logs]
            MNT[maintenance]
            SRV[survey]
            SOC[social]
            VST[visitor]
            DIM[data-import]
            AIM[ai]
        end
        subgraph scaffold["Scaffolded — 18 modules"]
            AUT[auth]
            ADM[admin]
            ADS[admissions]
            ATT[attendance]
            EXM[exams]
            FEE[fees]
            PAY[payroll]
            ANA[analytics]
            RPT[reports]
            NTF[notifications]
            HWK[homework]
            TMT[timetable]
            PAR[parents]
            AIT[ai-assistant]
            INT[integrations]
            AUD[audit]
            CRT[certificates]
            SET[settings]
        end
    end

    S --> ML
    S --> MW
    ML --> modules
    modules --> shared
    modules --> infra
    core --> infra
```

## Module Internal Structure

Every module follows this layout:

```
modules/{name}/
├── index.ts              ← Route manifest (public API of module)
├── api/                  ← HTTP handlers / controllers
├── application/          ← Use cases / service layer
├── domain/               ← Entities, value objects, domain logic
├── infrastructure/       ← Persistence adapters (repositories)
├── events/               ← Domain event definitions + handlers
├── jobs/                 ← Background tasks / cron jobs
└── tests/                ← Module-scoped tests
```

## Route Registration Flow

```
server.ts
  └── core/moduleLoader.ts  (35 module index.ts imports → flat RouteEntry[])
        ├── modules/academics/index.ts  → [/api/assignments, /api/attendance, ...]
        ├── modules/finance/index.ts    → [/api/finance, /api/expenses, ...]
        ├── modules/school/index.ts     → [/api/schools (skipAuth), /api/dashboard]
        ├── modules/staff/index.ts      → [..., /api/staff (skipAuth), ...]
        └── ... 31 more modules
```

## skipAuth Routes (public endpoints)

| Route | Module |
|-------|--------|
| `/api/schools` | school |
| `/api/staff` | staff |
