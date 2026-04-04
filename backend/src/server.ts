import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB, { getDatabaseStatus } from "./config/db";

import schoolRoutes from "./routes/schoolRoutes";
import logRoutes from "./routes/logRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import announcementRoutes from "./routes/announcementRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import examRoutes from "./routes/examRoutes";
import markRoutes from "./routes/markRoutes";
import leaveRoutes from "./routes/leaveRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import surveyRoutes from "./routes/surveyRoutes";
import studentRoutes from "./routes/studentRoutes";
import staffRoutes from "./routes/staffRoutes";
import classRoutes from "./routes/classRoutes";
import financeRoutes from "./routes/financeRoutes";
import transportRoutes from "./routes/transportRoutes";
import hostelRoutes from "./routes/hostelRoutes";
import libraryRoutes from "./routes/libraryRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import teacherRoleRoutes from "./routes/teacherRoleRoutes";
import socialMediaRoutes from "./routes/socialMediaRoutes";
import visitorRoutes from "./routes/visitorRoutes";
import dataImportRoutes from "./routes/dataImportRoutes";
import { seedDatabase } from "./seed";
import { authenticateToken } from "./middleware/auth";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

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

console.log("Allowed CORS origins:", Array.from(allowedOrigins).join(", "));

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
  process.env.NODE_ENV === "development" ||
  process.env.SEED_LOCAL_DATA === "true";

async function initializeDatabase() {
  await connectDB();

  if (shouldSeedLocalData) {
    seedDatabase(false).catch((error) => {
      console.error("Local seed failed:", error);
    });
  }
}

initializeDatabase();

// ==========================
// 🚀 ROUTES
// ==========================
app.use("/api/schools", schoolRoutes);
app.use("/api/logs", authenticateToken, logRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/announcements", authenticateToken, announcementRoutes);
app.use("/api/attendance", authenticateToken, attendanceRoutes);
app.use("/api/assignments", authenticateToken, assignmentRoutes);
app.use("/api/exams", authenticateToken, examRoutes);
app.use("/api/marks", authenticateToken, markRoutes);
app.use("/api/leaves", authenticateToken, leaveRoutes);
app.use("/api/maintenance", authenticateToken, maintenanceRoutes);
app.use("/api/surveys", authenticateToken, surveyRoutes);
app.use("/api/students", authenticateToken, studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/classes", authenticateToken, classRoutes);
app.use("/api/finance", authenticateToken, financeRoutes);
app.use("/api/transport", authenticateToken, transportRoutes);
app.use("/api/hostels", authenticateToken, hostelRoutes);
app.use("/api/library", authenticateToken, libraryRoutes);
app.use("/api/inventory", authenticateToken, inventoryRoutes);
app.use("/api/teacher-roles", authenticateToken, teacherRoleRoutes);
app.use("/api/social-media", authenticateToken, socialMediaRoutes);
app.use("/api/visitors", authenticateToken, visitorRoutes);
app.use("/api/data-import", authenticateToken, dataImportRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (process.env.PORT=${process.env.PORT ?? "unset"})`);
});
