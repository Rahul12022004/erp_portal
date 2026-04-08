import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import School from "../models/School";
import Staff from "../models/Staff";
import Student from "../models/Student";
import Announcement from "../models/Announcement";
import Assignment from "../models/Assignment";
import Attendance from "../models/Attendance";
import ClassModel from "../models/Class";
import ClassFeeStructure from "../models/ClassFeeStructure";
import DataImportBatch from "../models/DataImportBatch";
import Exam from "../models/Exam";
import Finance from "../models/Finance";
import Hostel from "../models/Hostel";
import InventoryItem from "../models/InventoryItem";
import InvestorLedger from "../models/InvestorLedger";
import LeaveApplication from "../models/LeaveApplication";
import LibraryAssignment from "../models/LibraryAssignment";
import LibraryBook from "../models/LibraryBook";
import Log from "../models/Logs";
import Maintenance from "../models/Maintenance";
import Mark from "../models/Mark";
import SalaryRole from "../models/SalaryRole";
import SocialMedia from "../models/SocialMedia";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";
import Survey from "../models/Survey";
import TeacherRoleAssignment from "../models/TeacherRoleAssignment";
import Transport from "../models/Transport";
import Visitor from "../models/Visitor";
import { createLog } from "../utils/createLog";
import { sendSchoolAdminCredentialsEmail } from "../utils/sendEmail";
import { clearLoginFailures, getLoginBlockInfo, getLoginThrottleKey, recordLoginFailure } from "../utils/loginThrottle";
import { signAuthToken } from "../utils/jwt";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

const isGmailAddress = (email: string) => {
  const normalized = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@gmail\.com$/.test(normalized);
};


// ==========================
// 🔥 HELPER FUNCTION
// ==========================
const getEndDate = (plan: string) => {
  const date = new Date();

  if (plan === "Basic") return null;
  if (plan === "Standard") date.setMonth(date.getMonth() + 6);
  if (plan === "Premium") date.setFullYear(date.getFullYear() + 1);

  return date.toISOString().split("T")[0];
};

// Generate random password
const generateRandomPassword = (length: number = 12): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Get modules based on subscription plan
const getModulesByPlan = (plan: string): string[] => {
  const modulesByPlan: { [key: string]: string[] } = {
    Basic: [
      "Student Management",
      "Attendance",
      "Marks & Results",
      "Announcements"
    ],
    Standard: [
      "Student Management",
      "Staff Management",
      "Attendance",
      "Marks & Results",
      "Announcements",
      "Leave Management",
      "Class Management",
      "Finance & Fees"
    ],
    Premium: [
      "Student Management",
      "Staff Management",
      "Attendance",
      "Marks & Results",
      "Announcements",
      "Leave Management",
      "Class Management",
      "Finance & Fees",
      "Hostel Management",
      "Transport Management",
      "Library Management",
      "Inventory Management",
      "Surveys & Feedback",
      "Social Media Integration"
    ]
  };

  return modulesByPlan[plan] || modulesByPlan["Basic"];
};

const getRequestedModules = (subscriptionPlan: string, modules?: unknown): string[] => {
  if (Array.isArray(modules)) {
    const cleaned = modules
      .map((moduleName) => String(moduleName || "").trim())
      .filter(Boolean);

    if (cleaned.length > 0) {
      return [...new Set(cleaned)];
    }
  }

  return getModulesByPlan(subscriptionPlan);
};

const toSchoolSessionResponse = (school: any) => ({
  _id: school._id,
  modules: school.modules,
  adminInfo: {
    name: school.adminInfo?.name,
    email: school.adminInfo?.email,
    phone: school.adminInfo?.phone,
    image: school.adminInfo?.image,
    status: school.adminInfo?.status,
  },
  schoolInfo: {
    name: school.schoolInfo?.name,
    logo: school.schoolInfo?.logo,
    email: school.schoolInfo?.email,
    phone: school.schoolInfo?.phone,
    address: school.schoolInfo?.address,
    website: school.schoolInfo?.website,
    location: school.schoolInfo?.location,
  },
  systemInfo: {
    schoolType: school.systemInfo?.schoolType,
    subscriptionPlan: school.systemInfo?.subscriptionPlan,
    subscriptionEndDate: school.systemInfo?.subscriptionEndDate,
  },
});

// ==========================
// 📍 UPDATE SCHOOL GEOFENCE LOCATION
// ==========================
router.put("/:id/location", async (req, res) => {
  try {
    const { latitude, longitude, radiusMeters } = req.body as {
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
    };

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    if (school.schoolInfo?.location?.locked) {
      return res.status(423).json({
        message: "Geofence is locked. Unlock it before making changes.",
      });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ message: "latitude and longitude are required numbers" });
    }

    const safeRadius =
      typeof radiusMeters === "number" && radiusMeters > 0 ? Math.round(radiusMeters) : 200;

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "schoolInfo.location.latitude": latitude,
          "schoolInfo.location.longitude": longitude,
          "schoolInfo.location.radiusMeters": safeRadius,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found" });
    }

    await createLog({
      action: "UPDATE_SCHOOL_GEOFENCE",
      message: `${updated.schoolInfo?.name} geofence updated`,
      schoolId: updated._id,
    });

    return res.json({ success: true, data: toSchoolSessionResponse(updated) });
  } catch (error) {
    console.error("UPDATE SCHOOL GEOFENCE ERROR:", error);
    return res.status(500).json({ message: "Failed to update school geofence" });
  }
});

// ==========================
// 🔒 LOCK / UNLOCK SCHOOL GEOFENCE LOCATION
// ==========================
router.patch("/:id/location-lock", async (req, res) => {
  try {
    const { locked } = req.body as { locked?: boolean };

    if (typeof locked !== "boolean") {
      return res.status(400).json({ message: "locked must be a boolean" });
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "schoolInfo.location.locked": locked,
          "schoolInfo.location.lockedAt": locked ? new Date() : null,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found" });
    }

    await createLog({
      action: locked ? "LOCK_SCHOOL_GEOFENCE" : "UNLOCK_SCHOOL_GEOFENCE",
      message: `${updated.schoolInfo?.name} geofence ${locked ? "locked" : "unlocked"}`,
      schoolId: updated._id,
    });

    return res.json({ success: true, data: toSchoolSessionResponse(updated) });
  } catch (error) {
    console.error("TOGGLE SCHOOL GEOFENCE LOCK ERROR:", error);
    return res.status(500).json({ message: "Failed to update geofence lock" });
  }
});

function toSchoolSessionWithToken(school: any) {
  const token = signAuthToken({
    userId: String(school._id),
    email: String(school.adminInfo?.email || school.schoolInfo?.email || ""),
    role: "school-admin",
    schoolId: String(school._id),
  });

  return {
    ...toSchoolSessionResponse(school),
    token,
  };
}


// ==========================
// 🔐 SCHOOL ADMIN LOGIN
// ==========================
router.post("/login", async (req, res) => {
  try {
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
      return res.status(400).json({ message: "Email and password are required" });
    }

    const school = await School.findOne({
      $or: [
        { "adminInfo.email": email },
        { "schoolInfo.email": email },
      ],
    }).select("+adminInfo.password");

    if (!school) {
      recordLoginFailure(throttleKey);
      return res.status(404).json({ message: "Admin not found" });
    }

    if (school.adminInfo?.status === "Disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }

    const storedPassword = String(school.adminInfo?.password || "");
    const passwordValid = storedPassword.startsWith("$2")
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;

    if (!passwordValid) {
      recordLoginFailure(throttleKey);
      return res.status(401).json({ message: "Invalid password" });
    }

    if (!storedPassword.startsWith("$2")) {
      const upgradedHash = await bcrypt.hash(password, 12);
      await School.updateOne({ _id: school._id }, { $set: { "adminInfo.password": upgradedHash } });
    }

    clearLoginFailures(throttleKey);

    res.json(toSchoolSessionWithToken(school));
  } catch (error) {
    console.error("SCHOOL LOGIN ERROR:", error);
    res.status(500).json({
      message: "School admin login failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================
// 🔐 SUPER ADMIN LOGIN
// ==========================
router.post("/super-admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isGmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Super admin login requires a gmail.com email address" });
    }

    const expectedEmail = process.env.SUPER_ADMIN_EMAIL;
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const normalizedExpectedEmail = String(expectedEmail || "").trim().toLowerCase();

    if (!expectedEmail || !expectedPassword) {
      return res.status(500).json({
        message: "Super admin credentials are not configured on server",
      });
    }

    if (!isGmailAddress(normalizedExpectedEmail)) {
      return res.status(500).json({
        message: "Super admin email on server must be a gmail.com address",
      });
    }

    if (normalizedEmail !== normalizedExpectedEmail || password !== expectedPassword) {
      return res.status(401).json({ message: "Invalid super admin credentials" });
    }

    const token = signAuthToken({
      userId: "super-admin",
      email: normalizedEmail,
      role: "super-admin",
    });

    return res.json({
      success: true,
      token,
      user: {
        id: "super_admin_001",
        email: normalizedEmail,
        name: "Super Admin",
        role: "super-admin",
      },
    });
  } catch (error) {
    console.error("SUPER ADMIN LOGIN ERROR:", error);
    return res.status(500).json({ message: "Super admin login failed" });
  }
});

// ==========================
// 🧨 SUPER ADMIN CLEAR DATABASE (DANGER ZONE)
// ==========================
router.post("/super-admin/clear-database", authenticateToken, async (req, res) => {
  try {
    const authUser = (req as express.Request & { user?: { role?: string } }).user;
    if (authUser?.role !== "super-admin") {
      return res.status(403).json({ message: "Only super admin can clear the database" });
    }

    const { email, password, confirmationText } = req.body as {
      email?: string;
      password?: string;
      confirmationText?: string;
    };
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Super admin email and password are required" });
    }

    if (!isGmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Super admin operations require a gmail.com email address" });
    }

    if (confirmationText !== "CLEAR DATABASE") {
      return res.status(400).json({ message: "Type CLEAR DATABASE to confirm" });
    }

    const expectedEmail = process.env.SUPER_ADMIN_EMAIL;
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    const normalizedExpectedEmail = String(expectedEmail || "").trim().toLowerCase();

    if (!expectedEmail || !expectedPassword) {
      return res.status(500).json({
        message: "Super admin credentials are not configured on server",
      });
    }

    if (!isGmailAddress(normalizedExpectedEmail)) {
      return res.status(500).json({
        message: "Super admin email on server must be a gmail.com address",
      });
    }

    if (normalizedEmail !== normalizedExpectedEmail || password !== expectedPassword) {
      return res.status(401).json({ message: "Invalid super admin credentials" });
    }

    const database = mongoose.connection.db;
    if (!database) {
      return res.status(500).json({ message: "Database connection not ready" });
    }

    const collections = await database.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = collections
      .map((item) => item.name)
      .filter((name) => !name.startsWith("system."));

    await Promise.all(
      collectionNames.map((collectionName) => database.collection(collectionName).deleteMany({}))
    );

    return res.json({
      success: true,
      message: "Database cleared successfully",
      collectionsCleared: collectionNames.length,
      clearedCollections: collectionNames,
    });
  } catch (error) {
    console.error("CLEAR DATABASE ERROR:", error);
    return res.status(500).json({ message: "Failed to clear database" });
  }
});

// ==========================
// 🔐 LOGIN (GET SCHOOL BY ADMIN EMAIL)
// ==========================
router.get("/admin/:email", async (req, res) => {
  try {
    const school = await School.findOne({
      "adminInfo.email": req.params.email,
    });

    if (!school) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (school.adminInfo?.status === "Disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }

    res.json(toSchoolSessionResponse(school));

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Login failed" });
  }
});


// ==========================
// 📝 SCHOOL REGISTRATION (SIGN UP)
// ==========================
router.post("/register", async (req, res) => {
  try {
    const { schoolName, schoolEmail, schoolPhone, schoolAddress, schoolWebsite, adminName, adminEmail, adminPhone, schoolType, maxStudents, subscriptionPlan } = req.body;

    // Validation
    if (!schoolName || !schoolEmail || !adminName || !adminEmail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if school email already exists
    const existingSchool = await School.findOne({ "schoolInfo.email": schoolEmail });
    if (existingSchool) {
      return res.status(400).json({ message: "School email already registered" });
    }

    // Check if admin email already exists
    const existingAdmin = await School.findOne({ "adminInfo.email": adminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin email already registered" });
    }

    // Generate random password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 12);

    // Create school with auto-generated credentials
    const newSchool = await School.create({
      schoolInfo: {
        name: schoolName,
        email: schoolEmail,
        phone: schoolPhone,
        address: schoolAddress,
        website: schoolWebsite,
        logo: "",
      },
      adminInfo: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        phone: adminPhone,
        image: req.body.adminImage || "",
        status: "Active",
      },
      systemInfo: {
        schoolType: schoolType || "Public",
        maxStudents: parseInt(maxStudents) || 500,
        subscriptionPlan: subscriptionPlan || "Basic",
        subscriptionEndDate: getEndDate(subscriptionPlan),
      },
      modules: getModulesByPlan(subscriptionPlan),
    });

    // Send email with credentials
    try {
      await sendSchoolAdminCredentialsEmail(
        adminName,
        adminEmail,
        schoolName,
        generatedPassword,
        subscriptionPlan
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the registration if email fails, but log it
    }

    // Create log entry
    await createLog({
      action: "SCHOOL_REGISTERED",
      message: `New school registered: ${schoolName}`,
      schoolId: newSchool._id,
    });

    res.status(201).json({
      success: true,
      message: "School registered successfully! Admin credentials sent to email.",
      data: {
        _id: newSchool._id,
        schoolName: newSchool.schoolInfo?.name,
        adminEmail: newSchool.adminInfo?.email,
        subscriptionPlan: newSchool.systemInfo?.subscriptionPlan,
        modules: newSchool.modules,
      },
    });

  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

router.use(authenticateToken);


// ==========================
// ✅ CREATE SCHOOL
// ==========================
router.post("/", async (req, res) => {
  try {
    const subscriptionPlan = req.body.subscriptionPlan || "Basic";
    const adminPasswordRaw = String(req.body.adminPassword || generateRandomPassword());
    const hashedAdminPassword = await bcrypt.hash(adminPasswordRaw, 12);
    const newSchoolData = {
      schoolInfo: {
        name: req.body.schoolName,
        email: req.body.schoolEmail,
        phone: req.body.schoolPhone,
        address: req.body.schoolAddress,
        website: req.body.schoolWebsite,
        logo: req.body.logo || "",
      },
      adminInfo: {
        name: req.body.adminName,
        email: req.body.adminEmail,
        password: hashedAdminPassword,
        phone: req.body.adminPhone,
        image: req.body.adminImage || "",
        status: "Active",
      },
      systemInfo: {
        schoolType: req.body.schoolType,
        maxStudents: req.body.maxStudents,
        subscriptionPlan,
        subscriptionEndDate: getEndDate(subscriptionPlan),
      },
      modules: getRequestedModules(subscriptionPlan, req.body.modules),
    };

    const school = await School.create(newSchoolData);

    await createLog({
      action: "CREATE_SCHOOL",
      message: `School created: ${school.schoolInfo?.name}`,
      schoolId: school._id,
    });

    res.json({ success: true, data: school });

  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ error: "Failed to create school" });
  }
});


// ==========================
// ✏️ UPDATE SCHOOL
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const subscriptionPlan =
      req.body.subscriptionPlan || school.systemInfo?.subscriptionPlan || "Basic";

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "schoolInfo.name": req.body.schoolName,
          "schoolInfo.email": req.body.schoolEmail,
          "schoolInfo.phone": req.body.schoolPhone,
          "schoolInfo.address": req.body.schoolAddress,
          "schoolInfo.website": req.body.schoolWebsite,
          "schoolInfo.logo": req.body.logo,

          "adminInfo.name": req.body.adminName,
          "adminInfo.email": req.body.adminEmail,
          "adminInfo.phone": req.body.adminPhone,
          "adminInfo.image": req.body.adminImage,

          "systemInfo.schoolType": req.body.schoolType,
          "systemInfo.maxStudents": req.body.maxStudents,
          "systemInfo.subscriptionPlan": subscriptionPlan,
          "systemInfo.subscriptionEndDate": getEndDate(subscriptionPlan),

          modules: getRequestedModules(subscriptionPlan, req.body.modules),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found" });
    }

    await createLog({
      action: "UPDATE_SCHOOL",
      message: `${updated.schoolInfo?.name} updated`,
      schoolId: updated._id,
    });

    res.json({ success: true, data: updated });

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: "Update failed" });
  }
});


// ==========================
// 🗑 DELETE SCHOOL
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const schoolId = req.params.id;
    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Cascade delete all school-scoped data across ERP modules.
    await Promise.all([
      Announcement.deleteMany({ schoolId }),
      Assignment.deleteMany({ schoolId }),
      Attendance.deleteMany({ schoolId }),
      ClassModel.deleteMany({ schoolId }),
      ClassFeeStructure.deleteMany({ school_id: schoolId }),
      DataImportBatch.deleteMany({ school_id: schoolId }),
      Exam.deleteMany({ schoolId }),
      Finance.deleteMany({ schoolId }),
      Hostel.deleteMany({ schoolId }),
      InventoryItem.deleteMany({ schoolId }),
      InvestorLedger.deleteMany({ schoolId }),
      LeaveApplication.deleteMany({ schoolId }),
      LibraryAssignment.deleteMany({ schoolId }),
      LibraryBook.deleteMany({ schoolId }),
      Maintenance.deleteMany({ schoolId }),
      Mark.deleteMany({ schoolId }),
      SalaryRole.deleteMany({ schoolId }),
      SocialMedia.deleteMany({ schoolId }),
      Staff.deleteMany({ schoolId }),
      Student.deleteMany({ schoolId }),
      StudentFeeAssignment.deleteMany({ school_id: schoolId }),
      StudentFeePayment.deleteMany({ school_id: schoolId }),
      Survey.deleteMany({ schoolId }),
      TeacherRoleAssignment.deleteMany({ schoolId }),
      Transport.deleteMany({ schoolId }),
      Visitor.deleteMany({ schoolId }),
      Log.deleteMany({ schoolId: String(schoolId) }),
    ]);

    await School.findByIdAndDelete(schoolId);

    await createLog({
      action: "DELETE_SCHOOL",
      message: `${school.schoolInfo?.name} deleted with all related records`,
    });

    res.json({ success: true });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: "Delete failed" });
  }
});


// ==========================
// 🔒 TOGGLE ADMIN STATUS
// ==========================
router.put("/toggle/:id", async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const currentStatus = school.adminInfo?.status || "Active";
    const newStatus = currentStatus === "Active" ? "Disabled" : "Active";

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      { $set: { "adminInfo.status": newStatus } },
      { new: true }
    );

    await createLog({
      action: "TOGGLE_ADMIN",
      message: `${school.schoolInfo?.name} admin ${newStatus}`,
      schoolId: school._id,
    });

    res.json({ success: true, data: updated });

  } catch (error) {
    console.error("TOGGLE ERROR:", error);
    res.status(500).json({ message: "Toggle failed" });
  }
});


// ==========================
// ✅ GET ALL SCHOOLS
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(toSchoolSessionResponse(school));
  } catch (error) {
    console.error("FETCH SCHOOL ERROR:", error);
    res.status(500).json({ error: "Failed to fetch school" });
  }
});

// ==========================
// ✅ GET ALL SCHOOLS
// ==========================
router.get("/", async (req, res) => {
  try {
    const schools = await School.find();
    res.json(schools.map((school) => toSchoolSessionResponse(school)));
  } catch (error) {
    console.error("FETCH ERROR:", error);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});


// ==========================
// 🔥 UPGRADE SUBSCRIPTION
// ==========================
router.put("/upgrade/:id", async (req, res) => {
  try {
    const { subscriptionPlan } = req.body;

    if (!subscriptionPlan) {
      return res.status(400).json({ message: "subscriptionPlan is required" });
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "systemInfo.subscriptionPlan": subscriptionPlan,
          "systemInfo.subscriptionEndDate": getEndDate(subscriptionPlan),
          modules: getModulesByPlan(subscriptionPlan),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found" });
    }

    await createLog({
      action: "UPGRADE_SUBSCRIPTION",
      message: `${updated.schoolInfo?.name} moved to ${subscriptionPlan}`,
      schoolId: updated._id,
    });

    res.json({ success: true, data: updated });

  } catch (error) {
    console.error("UPGRADE ERROR:", error);
    res.status(500).json({ message: "Upgrade failed" });
  }
});


// ==========================
// 🔥 RENEW SUBSCRIPTION
// ==========================
router.put("/renew/:id", async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school || !school.systemInfo) {
      return res.status(404).json({ message: "School not found" });
    }

    let newDate = new Date();

    if (school.systemInfo.subscriptionPlan === "Standard") {
      newDate.setMonth(newDate.getMonth() + 6);
    } else if (school.systemInfo.subscriptionPlan === "Premium") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "systemInfo.subscriptionEndDate": newDate
            .toISOString()
            .split("T")[0],
        },
      },
      { new: true }
    );

    res.json({ success: true, data: updated });

  } catch (error) {
    console.error("RENEW ERROR:", error);
    res.status(500).json({ message: "Renew failed" });
  }
});

// ==========================
// 🧪 SEED DUMMY SCHOOL + TEACHERS
// ==========================
router.post("/seed-dummy", async (req, res) => {
  try {
    const stamp = Date.now().toString().slice(-6);

    const adminPassword = "admin123";
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

    const school = await School.create({
      schoolInfo: {
        name: `Demo Public School ${stamp}`,
        email: `demo.school.${stamp}@example.com`,
        phone: "+91-9000000001",
        website: "https://demo-school.example.com",
        address: "MG Road, Bengaluru",
        logo: "",
      },
      adminInfo: {
        name: "Demo Admin",
        email: `admin.${stamp}@example.com`,
        password: hashedAdminPassword,
        phone: "+91-9000000002",
        image: "",
        status: "Active",
      },
      systemInfo: {
        schoolType: "CBSE",
        maxStudents: 1200,
        subscriptionPlan: "Standard",
        subscriptionEndDate: getEndDate("Standard"),
      },
      modules: [
        "dashboard",
        "students",
        "attendance",
        "staff",
        "exams",
        "communication",
      ],
    });

    const teachers = await Staff.insertMany([
      {
        name: "Aarav Sharma",
        email: `aarav.${stamp}@example.com`,
        phone: "+91-9000001001",
        position: "Teacher",
        department: "Mathematics",
        qualification: "M.Sc, B.Ed",
        address: "BTM Layout, Bengaluru",
        dateOfBirth: "1990-05-12",
        gender: "Male",
        joinDate: "2022-06-15",
        status: "Active",
        schoolId: school._id,
      },
      {
        name: "Diya Verma",
        email: `diya.${stamp}@example.com`,
        phone: "+91-9000001002",
        position: "Teacher",
        department: "Science",
        qualification: "M.Sc Physics, B.Ed",
        address: "Indiranagar, Bengaluru",
        dateOfBirth: "1992-11-03",
        gender: "Female",
        joinDate: "2021-07-01",
        status: "Active",
        schoolId: school._id,
      },
      {
        name: "Rohan Patel",
        email: `rohan.${stamp}@example.com`,
        phone: "+91-9000001003",
        position: "Teacher",
        department: "English",
        qualification: "M.A English, B.Ed",
        address: "Whitefield, Bengaluru",
        dateOfBirth: "1988-02-22",
        gender: "Male",
        joinDate: "2020-06-10",
        status: "Active",
        schoolId: school._id,
      },
    ]);

    await createLog({
      action: "SEED_DUMMY_DATA",
      message: `Seeded dummy school and ${teachers.length} teachers`,
      schoolId: school._id,
    });

    return res.json({
      success: true,
      message: "Dummy school and teacher data created",
      data: {
        school: toSchoolSessionResponse(school),
        teachers,
      },
    });
  } catch (error) {
    console.error("SEED DUMMY ERROR:", error);
    return res.status(500).json({ message: "Failed to seed dummy data" });
  }
});


export default router;
