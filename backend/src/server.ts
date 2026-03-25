import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";

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

dotenv.config();

const app = express();

// ==========================
// 🔧 MIDDLEWARE
// ==========================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================
// 🗄 DATABASE
// ==========================
connectDB();

// ==========================
// 🚀 ROUTES
// ==========================
app.use("/api/schools", schoolRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/marks", markRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/teacher-roles", teacherRoleRoutes);
app.use("/api/social-media", socialMediaRoutes);

// ==========================
// 🧪 TEST ROUTE
// ==========================
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

// Handle large payload errors (e.g., base64 file uploads)
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === "entity.too.large") {
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
  console.log(`Server running on port ${PORT}`);
});
