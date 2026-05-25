import express from "express";
import bcrypt from "bcryptjs";
import School from "../../school/models/School";
import Staff from "../../staff/models/Staff";
import { AuthService } from "../application/AuthService";
import {
  sendSchoolAdminCredentialsEmail,
} from "../../../core/utils/sendEmail";
import { eventBus } from "../../../core/events";

const router = express.Router();

function toSchoolSessionResponse(school: Record<string, unknown>) {
  const s = school as {
    _id?: unknown;
    modules?: string[];
    adminInfo?: Record<string, unknown>;
    schoolInfo?: Record<string, unknown>;
    systemInfo?: Record<string, unknown>;
  };
  return {
    _id: s._id,
    modules: s.modules,
    adminInfo: {
      name: s.adminInfo?.name,
      email: s.adminInfo?.email,
      phone: s.adminInfo?.phone,
      image: s.adminInfo?.image,
      status: s.adminInfo?.status,
    },
    schoolInfo: {
      name: s.schoolInfo?.name,
      logo: s.schoolInfo?.logo,
      email: s.schoolInfo?.email,
      phone: s.schoolInfo?.phone,
      address: s.schoolInfo?.address,
      website: s.schoolInfo?.website,
      location: s.schoolInfo?.location,
    },
    systemInfo: {
      schoolType: s.systemInfo?.schoolType,
      subscriptionPlan: s.systemInfo?.subscriptionPlan,
      subscriptionEndDate: s.systemInfo?.subscriptionEndDate,
    },
  };
}

function toSchoolSessionWithToken(school: Record<string, unknown>) {
  const s = school as { _id?: unknown; adminInfo?: Record<string, unknown>; schoolInfo?: Record<string, unknown> };
  const token = AuthService.issueToken({
    userId: String(s._id),
    email: String(s.adminInfo?.email || s.schoolInfo?.email || ""),
    role: "school-admin",
    schoolId: String(s._id),
  });
  return { ...toSchoolSessionResponse(school), token };
}

function getModulesByPlan(plan: string): string[] {
  const modulesByPlan: Record<string, string[]> = {
    Basic: ["Student Management", "Attendance", "Marks & Results", "Announcements"],
    Standard: ["Student Management", "Staff Management", "Attendance", "Marks & Results",
      "Announcements", "Leave Management", "Class Management", "Finance & Fees"],
    Premium: ["Student Management", "Staff Management", "Attendance", "Marks & Results",
      "Announcements", "Leave Management", "Class Management", "Finance & Fees",
      "Hostel Management", "Transport Management", "Library Management",
      "Inventory Management", "Surveys & Feedback", "Social Media Integration"],
  };
  return modulesByPlan[plan] || modulesByPlan["Basic"];
}

function generateRandomPassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

function getEndDate(plan: string): string | null {
  const date = new Date();
  if (plan === "Basic") return null;
  if (plan === "Standard") date.setMonth(date.getMonth() + 6);
  if (plan === "Premium") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}

// POST /api/auth/school/login
router.post("/school/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const throttleKey = AuthService.getThrottleKey(req, email || "");
    const blockInfo = AuthService.checkThrottle(req, email || "");

    if (blockInfo.blocked) {
      return res.status(429).json({
        message: "Too many failed login attempts. Please try again later.",
        retryAfterSeconds: blockInfo.retryAfterSeconds,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const school = await School.findOne({
      $or: [{ "adminInfo.email": email }, { "schoolInfo.email": email }],
    }).select("+adminInfo.password");

    if (!school) {
      AuthService.recordFailure(throttleKey);
      return res.status(404).json({ message: "Admin not found" });
    }

    if (school.adminInfo?.status === "Disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }

    const storedPassword = String(school.adminInfo?.password || "");
    const passwordValid = await AuthService.verifyPassword(password, storedPassword);

    if (!passwordValid) {
      AuthService.recordFailure(throttleKey);
      return res.status(401).json({ message: "Invalid password" });
    }

    const upgradedHash = await AuthService.upgradePasswordIfPlain(password, storedPassword);
    if (upgradedHash) {
      await School.updateOne({ _id: school._id }, { $set: { "adminInfo.password": upgradedHash } });
    }

    AuthService.clearFailures(throttleKey);
    return res.json(toSchoolSessionWithToken(school as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("SCHOOL LOGIN ERROR:", error);
    return res.status(500).json({ message: "School admin login failed" });
  }
});

// POST /api/auth/super-admin/login
router.post("/super-admin/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!AuthService.isGmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Super admin login requires a gmail.com email address" });
    }

    const { email: expectedEmail, password: expectedPassword } = AuthService.getSuperAdminCredentials();

    if (!expectedEmail || !expectedPassword) {
      return res.status(500).json({ message: "Super admin credentials are not configured on server" });
    }

    const normalizedExpected = expectedEmail.trim().toLowerCase();
    if (!AuthService.isGmailAddress(normalizedExpected)) {
      return res.status(500).json({ message: "Super admin email on server must be a gmail.com address" });
    }

    if (normalizedEmail !== normalizedExpected || password !== expectedPassword) {
      return res.status(401).json({ message: "Invalid super admin credentials" });
    }

    const token = AuthService.issueToken({
      userId: "super-admin",
      email: normalizedEmail,
      role: "super-admin",
    });

    return res.json({
      success: true,
      token,
      user: { id: "super_admin_001", email: normalizedEmail, name: "Super Admin", role: "super-admin" },
    });
  } catch (error) {
    console.error("SUPER ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ message: "Super admin login failed" });
  }
});

// POST /api/auth/staff/login  (teacher login)
router.post("/staff/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const throttleKey = AuthService.getThrottleKey(req, email || "");
    const blockInfo = AuthService.checkThrottle(req, email || "");

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
      AuthService.recordFailure(throttleKey);
      return res.status(404).json({ message: "Teacher not found" });
    }

    const storedPassword = String(teacher.password || "");
    if (!storedPassword) {
      AuthService.recordFailure(throttleKey);
      return res.status(401).json({ message: "Teacher password not set. Contact school admin." });
    }

    const passwordValid = await AuthService.verifyPassword(password, storedPassword);

    if (!passwordValid) {
      AuthService.recordFailure(throttleKey);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const upgradedHash = await AuthService.upgradePasswordIfPlain(password, storedPassword);
    if (upgradedHash) {
      await Staff.updateOne({ _id: teacher._id }, { $set: { password: upgradedHash } });
    }

    const school = await School.findById(teacher.schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found for teacher" });
    }

    AuthService.clearFailures(throttleKey);

    const token = AuthService.issueToken({
      userId: String(teacher._id),
      email: String(teacher.email || ""),
      role: "teacher",
      schoolId: String(school._id),
    });

    eventBus.publish("audit.entry", {
      action: "TEACHER_LOGIN",
      message: `Teacher ${teacher.name} logged in`,
      user: String(teacher.name || email),
      schoolId: String(teacher.schoolId || ""),
    });

    return res.json({
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
        adminInfo: { name: school.adminInfo?.name, email: school.adminInfo?.email },
        schoolInfo: { name: school.schoolInfo?.name, logo: school.schoolInfo?.logo },
      },
    });
  } catch (error) {
    console.error("STAFF LOGIN ERROR:", error);
    return res.status(500).json({ message: "Staff login failed" });
  }
});

// POST /api/auth/school/register
router.post("/school/register", async (req, res) => {
  try {
    const {
      schoolName, schoolEmail, schoolPhone, schoolAddress, schoolWebsite,
      adminName, adminEmail, adminPhone, schoolType, maxStudents, subscriptionPlan,
    } = req.body as Record<string, string>;

    if (!schoolName || !schoolEmail || !adminName || !adminEmail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingSchool = await School.findOne({ "schoolInfo.email": schoolEmail });
    if (existingSchool) {
      return res.status(400).json({ message: "School email already registered" });
    }

    const existingAdmin = await School.findOne({ "adminInfo.email": adminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin email already registered" });
    }

    const generatedPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 12);

    const newSchool = await School.create({
      schoolInfo: { name: schoolName, email: schoolEmail, phone: schoolPhone, address: schoolAddress, website: schoolWebsite, logo: "" },
      adminInfo: { name: adminName, email: adminEmail, password: hashedPassword, phone: adminPhone, image: req.body.adminImage || "", status: "Active" },
      systemInfo: { schoolType: schoolType || "Public", maxStudents: parseInt(maxStudents) || 500, subscriptionPlan: subscriptionPlan || "Basic", subscriptionEndDate: getEndDate(subscriptionPlan) },
      modules: getModulesByPlan(subscriptionPlan),
    });

    try {
      await sendSchoolAdminCredentialsEmail(adminName, adminEmail, schoolName, generatedPassword, subscriptionPlan);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    eventBus.publish("audit.entry", {
      action: "SCHOOL_REGISTERED",
      message: `New school registered: ${schoolName}`,
      schoolId: String(newSchool._id),
    });

    return res.status(201).json({
      success: true,
      message: "School registered successfully! Admin credentials sent to email.",
      schoolId: newSchool._id,
    });
  } catch (error) {
    console.error("SCHOOL REGISTER ERROR:", error);
    return res.status(500).json({ message: "School registration failed" });
  }
});

export default router;
