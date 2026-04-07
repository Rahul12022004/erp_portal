import express from "express";
import bcrypt from "bcryptjs";
import School from "../models/School";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";
import { sendTeacherCredentialsEmail } from "../utils/sendEmail";
import { clearLoginFailures, getLoginBlockInfo, getLoginThrottleKey, recordLoginFailure } from "../utils/loginThrottle";
import { signAuthToken } from "../utils/jwt";
import { authenticateToken } from "../middleware/auth";
import { ensureDatabaseConnection, getDatabaseStatus } from "../config/db";

const router = express.Router();

// ==========================
// 🔐 TEACHER LOGIN
// ==========================
router.post("/login", async (req, res) => {
  try {
    await ensureDatabaseConnection();
    const dbStatus = getDatabaseStatus();
    if (!dbStatus.connected) {
      return res.status(503).json({
        message: "Login service is temporarily unavailable. Database is not connected.",
      });
    }

    const { email, password } = req.body;
    const throttleKey = getLoginThrottleKey(req.ip, String(email || ""));
    const blockInfo = getLoginBlockInfo(throttleKey);

    if (blockInfo.blocked) {
      return res.status(429).json({
        message: "Too many failed login attempts. Please try again later.",
        retryAfterSeconds: blockInfo.retryAfterSeconds,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Required fields: email, password" });
    }

    const teacher = await Staff.findOne({
      email,
      position: /^Teacher$/i,
      status: "Active",
    }).select("+password");

    if (!teacher) {
      recordLoginFailure(throttleKey);
      return res.status(404).json({ message: "Teacher not found" });
    }

    const storedPassword = String(teacher.password || "");
    if (!storedPassword) {
      recordLoginFailure(throttleKey);
      return res.status(401).json({ message: "Teacher password not set. Contact school admin." });
    }

    const passwordValid = storedPassword.startsWith("$2")
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;

    if (!passwordValid) {
      recordLoginFailure(throttleKey);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!storedPassword.startsWith("$2")) {
      const upgradedHash = await bcrypt.hash(password, 12);
      await Staff.updateOne({ _id: teacher._id }, { $set: { password: upgradedHash } });
    }

    const school = await School.findById(teacher.schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found for teacher" });
    }

    clearLoginFailures(throttleKey);

    const token = signAuthToken({
      userId: String(teacher._id),
      email: String(teacher.email || ""),
      role: "teacher",
      schoolId: String(school._id),
    });

    res.json({
      success: true,
      token,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        schoolId: teacher.schoolId,
      },
      school: {
        _id: school._id,
        modules: school.modules,
        adminInfo: {
          name: school.adminInfo?.name,
          email: school.adminInfo?.email,
        },
        schoolInfo: {
          name: school.schoolInfo?.name,
          logo: school.schoolInfo?.logo,
        },
      },
    });
  } catch (error) {
    console.error("TEACHER LOGIN ERROR:", error);
    res.status(500).json({ message: "Teacher login failed" });
  }
});

router.use(authenticateToken);

// ==========================
// ✅ TEACHER SESSION CHECK
// ==========================
router.get("/session/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const teacher = await Staff.findOne({
      _id: teacherId,
      schoolId,
      position: /^Teacher$/i,
      status: "Active",
    }).select("_id");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher session invalid" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("TEACHER SESSION CHECK ERROR:", error);
    return res.status(500).json({ message: "Failed to validate teacher session" });
  }
});

// ==========================
// 👥 GET STAFF FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const staff = await Staff.find({ schoolId: req.params.schoolId })
      .sort({ position: 1, name: 1 }); // Sort by position then name

    res.json(staff);
  } catch (error) {
    console.error("GET STAFF ERROR:", error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
});

// ==========================
// ➕ CREATE STAFF
// ==========================
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, position, department, qualification, address, dateOfBirth, gender, joinDate, status, ossId, workHistoryDoc, offerLetterDoc, identityDoc, schoolId } = req.body;

    if (!name || !email || !phone || !position || !schoolId) {
      return res.status(400).json({ message: "Required fields: name, email, phone, position, schoolId" });
    }

    const normalizedPosition = String(position || "").toLowerCase();
    const isTeacher = normalizedPosition === "teacher";
    const generatedPassword = isTeacher ? Math.random().toString(36).slice(-10) : null;
    const hashedPassword = generatedPassword ? await bcrypt.hash(generatedPassword, 12) : undefined;

    const staff = await Staff.create({
      name,
      email,
      password: hashedPassword,
      phone,
      position,
      department,
      qualification,
      address,
      dateOfBirth,
      gender,
      joinDate,
      status,
      ossId,
      workHistoryDoc,
      offerLetterDoc,
      identityDoc,
      schoolId,
    });

    await createLog({
      action: "CREATE_STAFF",
      message: `Staff created: ${name} (${position})`,
      schoolId,
    });

    // 📧 Send email credentials if creating a teacher
    if (isTeacher && generatedPassword) {
      try {
        const school = await School.findById(schoolId);
        const schoolName = school?.schoolInfo?.name || "Our School";
        await sendTeacherCredentialsEmail(name, email, schoolName, generatedPassword);
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Continue even if email fails - don't block staff creation
      }
    }

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("CREATE STAFF ERROR:", error);
    res.status(500).json({ message: "Failed to create staff" });
  }
});

// ==========================
// ✏️ UPDATE STAFF
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const updated = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }

    await createLog({
      action: "UPDATE_STAFF",
      message: `Staff updated: ${updated.name}`,
      schoolId: updated.schoolId,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE STAFF ERROR:", error);
    res.status(500).json({ message: "Failed to update staff" });
  }
});

// ==========================
// 🗑 DELETE STAFF
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    await createLog({
      action: "DELETE_STAFF",
      message: `Staff deleted: ${staff.name}`,
      schoolId: staff.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE STAFF ERROR:", error);
    res.status(500).json({ message: "Failed to delete staff" });
  }
});

export default router;
