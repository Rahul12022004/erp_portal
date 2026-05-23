import express from "express";
import cors from "cors";
import connectDB, { getDatabaseStatus } from "./core/config/db";
import { loadEnvironment } from "./core/config/env";

import { moduleRoutes } from "./core/moduleLoader";
import { seedDatabase } from "./seed";
import { authenticateToken } from "./core/middleware/auth";

loadEnvironment();

const app = express();
const defaultAllowedOrigins = [
  "https://erp-portal-seven.vercel.app",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
];

const envAllowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================
// 🗄 DATABASE
// ==========================
const shouldSeedLocalData =
  process.env.SEED_LOCAL_DATA === "true";

async function initializeDatabase() {
  await connectDB();

  if (shouldSeedLocalData) {
    seedDatabase(false).catch((error) => {
      console.error("Local seed failed:", error);
    });
  }
}

// ==========================
// 🚀 ROUTES
// ==========================
moduleRoutes.forEach(({ path, router, skipAuth }) => {
  if (skipAuth) {
    app.use(path, router);
  } else {
    app.use(path, authenticateToken, router);
  }
});

// ==========================
// 🧪 TEST ROUTE
// ==========================
app.get("/api/health", (req, res) => {
  const db = getDatabaseStatus();
  const hasSuperAdminEmail = Boolean((process.env.SUPER_ADMIN_EMAIL || "").trim());
  const hasSuperAdminPassword = Boolean((process.env.SUPER_ADMIN_PASSWORD || "").trim());

  res.json({
    ok: true,
    dbConnected: db.connected,
    dbReadyState: db.readyState,
    dbLastError: db.lastError,
    superAdminConfigured: hasSuperAdminEmail && hasSuperAdminPassword,
    superAdminEnv: {
      email: hasSuperAdminEmail,
      password: hasSuperAdminPassword,
    },
  });
});

app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

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
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Server startup failed: ${message}`);
    process.exit(1);
  }
}

void startServer();
