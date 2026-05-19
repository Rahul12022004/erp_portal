import express from "express";
import cors from "cors";
import connectDB, { getDatabaseStatus } from "./core/config/db";
import { loadEnvironment } from "./core/config/env";

import schoolRoutes from "./modules/school/routes/schoolRoutes";
import logRoutes from "./modules/logs/routes/logRoutes";
import dashboardRoutes from "./modules/school/routes/dashboardRoutes";
import announcementRoutes from "./modules/communication/routes/announcementRoutes";
import communicationRoutes from "./modules/communication/routes/communicationRoutes";
import attendanceRoutes from "./modules/academics/routes/attendanceRoutes";
import assignmentRoutes from "./modules/academics/routes/assignmentRoutes";
import examRoutes from "./modules/academics/routes/examRoutes";
import markRoutes from "./modules/academics/routes/markRoutes";
import leaveRoutes from "./modules/staff/routes/leaveRoutes";
import maintenanceRoutes from "./modules/maintenance/routes/maintenanceRoutes";
import surveyRoutes from "./modules/survey/routes/surveyRoutes";
import studentRoutes from "./modules/students/routes/studentRoutes";
import staffRoutes from "./modules/staff/routes/staffRoutes";
import classRoutes from "./modules/academics/routes/classRoutes";
import financeRoutes from "./modules/finance/routes/financeRoutes";
import transportRoutes from "./modules/transport/routes/transportRoutes";
import hostelRoutes from "./modules/hostel/routes/hostelRoutes";
import libraryRoutes from "./modules/library/routes/libraryRoutes";
import inventoryRoutes from "./modules/inventory/routes/inventoryRoutes";
import teacherRoleRoutes from "./modules/staff/routes/teacherRoleRoutes";
import socialMediaRoutes from "./modules/social/routes/socialMediaRoutes";
import visitorRoutes from "./modules/visitor/routes/visitorRoutes";
import dataImportRoutes from "./modules/data-import/routes/dataImportRoutes";
import salaryStructureRoutes from "./modules/finance/routes/salaryStructureRoutes";
import expenseRoutes from "./modules/finance/routes/expenseRoutes";
import bankingRoutes from "./modules/finance/routes/bankingRoutes";
import subjectRoutes from "./modules/academics/routes/subjectRoutes";
import materialRoutes from "./modules/academics/routes/materialRoutes";
import aiRoutes from "./modules/ai/routes/aiRoutes";
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
app.use("/api/schools", schoolRoutes);
app.use("/api/logs", authenticateToken, logRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/announcements", authenticateToken, announcementRoutes);
app.use("/api/communication", authenticateToken, communicationRoutes);
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
app.use("/api/salary-structures", authenticateToken, salaryStructureRoutes);
app.use("/api/expenses", authenticateToken, expenseRoutes);
app.use("/api/banking", authenticateToken, bankingRoutes);
app.use("/api/subjects", authenticateToken, subjectRoutes);
app.use("/api/materials", authenticateToken, materialRoutes);
app.use("/api/ai", authenticateToken, aiRoutes);

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
