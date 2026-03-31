import express from "express";
import School from "../models/School";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";
import { sendSchoolAdminCredentialsEmail } from "../utils/sendEmail";

const router = express.Router();


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


// ==========================
// 🔐 SCHOOL ADMIN LOGIN
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const school = await School.findOne({
      $or: [
        { "adminInfo.email": email },
        { "schoolInfo.email": email },
      ],
    });

    if (!school) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (school.adminInfo?.status === "Disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }

    if (school.adminInfo?.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json(school);
  } catch (error) {
    console.error("SCHOOL LOGIN ERROR:", error);
    res.status(500).json({
      message: "School admin login failed",
      error: error instanceof Error ? error.message : String(error),
    });
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

    res.json(school);

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
        password: generatedPassword,
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
        adminPassword: generatedPassword,
        subscriptionPlan: newSchool.systemInfo?.subscriptionPlan,
        modules: newSchool.modules,
      },
    });

  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});


// ==========================
// ✅ CREATE SCHOOL
// ==========================
router.post("/", async (req, res) => {
  try {
    const subscriptionPlan = req.body.subscriptionPlan || "Basic";
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
        password: req.body.adminPassword,
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
    const school = await School.findByIdAndDelete(req.params.id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    await createLog({
      action: "DELETE_SCHOOL",
      message: `${school.schoolInfo?.name} deleted`,
      schoolId: school._id,
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

    res.json(school);
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
    res.json(schools);
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
        password: "admin123",
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
        school,
        teachers,
      },
    });
  } catch (error) {
    console.error("SEED DUMMY ERROR:", error);
    return res.status(500).json({ message: "Failed to seed dummy data" });
  }
});


export default router;
