import express from "express";
import cors from "cors";
import connectDB, { getDatabaseStatus } from "./core/config/db";
import { initEnv } from "./core/config/env";

import { moduleRoutes } from "./core/moduleLoader";
import { seedDatabase } from "./seed";
import { authenticateToken } from "./core/middleware/auth";
import { withModuleBoundary, pathToModuleName } from "./core/middleware/errorBoundary";
import { moduleHealth } from "./core/health/moduleHealth";
import { getStats } from "./core/health/circuitBreaker";
import { startWorkers, stopWorkers } from "./workers/index";
import { jobsRouter } from "./workers/routes";
import {
  initSentry,
  mountSentryErrorHandler,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from "./core/observability";
import { auditRouter } from "./core/observability/audit/auditRoutes";

const env = initEnv();

const app = express();
initSentry(app);
const defaultAllowedOrigins = [
  "https://erp-portal-seven.vercel.app",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
];

const allowedOrigins = new Set([...defaultAllowedOrigins, ...env.frontendOrigins]);

function isLocalDevOrigin(origin: string) {
  try {
    const { protocol, hostname } = new URL(origin);
    return (
      (protocol === "http:" || protocol === "https:") &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

// ==========================
// 🔧 MIDDLEWARE
// ==========================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================
// 🗄 DATABASE
// ==========================
const shouldSeedLocalData = env.seedLocalData;

async function initializeDatabase() {
  await connectDB();

  if (shouldSeedLocalData) {
    seedDatabase(false).catch((error) => {
      console.error("Local seed failed:", error);
    });
  }
}

// ==========================
// 🚀 ROUTES  (with per-module error isolation)
// ==========================
moduleRoutes.forEach(({ path, router, skipAuth }) => {
  const moduleName = pathToModuleName(path);
  const boundary = withModuleBoundary(moduleName, router);
  if (skipAuth) {
    app.use(path, ...boundary);
  } else {
    app.use(path, authenticateToken, ...boundary);
  }
});

// ==========================
// ⚙️  JOB QUEUE ROUTES  (authenticated — enqueue + status polling)
// ==========================
app.use("/api/jobs",  authenticateToken, jobsRouter);

// ==========================
// 📋 AUDIT LOG ROUTES  (authenticated — read-only, admin use)
// ==========================
app.use("/api/audit", authenticateToken, auditRouter);

// ==========================
// 🩺 HEALTH ENDPOINT  (no auth — monitoring tools must be able to reach it)
// ==========================
app.get("/api/health", (_req, res) => {
  const db = getDatabaseStatus();
  const modules = moduleHealth.getSummary();
  const allHealthy = Object.values(modules).every((s) => s === "healthy");

  res.status(allHealthy ? 200 : 207).json({
    ok: db.connected,
    status: allHealthy ? "healthy" : "degraded",
    database: {
      connected: db.connected,
      readyState: db.readyState,
      lastError: db.lastError ?? null,
    },
    modules,
  });
});

// Detailed health — includes error counts and circuit stats (internal use)
app.get("/api/health/details", (_req, res) => {
  const db = getDatabaseStatus();
  const all = moduleHealth.getAll();
  const details: Record<string, unknown> = {};

  for (const [name, entry] of Object.entries(all)) {
    details[name] = {
      ...entry,
      circuit: getStats(name) ?? null,
    };
  }

  res.json({
    ok: db.connected,
    database: {
      connected: db.connected,
      readyState: db.readyState,
      lastError: db.lastError ?? null,
    },
    modules: details,
    superAdminConfigured: Boolean(env.superAdminEmail && env.superAdminPassword),
  });
});

app.get("/", (_req, res) => {
  res.send("API Running");
});

// Sentry error handler must be AFTER all routes
mountSentryErrorHandler(app);

// Handle large payload errors (e.g., base64 file uploads)
type PayloadTooLargeError = {
  type?: string;
};

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((error as PayloadTooLargeError | null)?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Uploaded file is too large. Please upload a smaller file.",
    });
  }

  return next(error);
});

// ==========================
// 🚀 SERVER START
// ==========================
const PORT = env.port;

async function startServer() {
  try {
    await initializeDatabase();
    startWorkers();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on("SIGTERM", async () => {
      console.log("[server] SIGTERM — draining workers...");
      await stopWorkers();
      process.exit(0);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Server startup failed: ${message}`);
    process.exit(1);
  }
}

void startServer();
