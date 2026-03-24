import express from "express";
import School from "../models/School";
import { createLog } from "../utils/createLog";

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
// ✅ CREATE SCHOOL
// ==========================
router.post("/", async (req, res) => {
  try {
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
        status: "Active",
      },
      systemInfo: {
        schoolType: req.body.schoolType,
        maxStudents: req.body.maxStudents,
        subscriptionPlan: req.body.subscriptionPlan,
        subscriptionEndDate: getEndDate(req.body.subscriptionPlan),
      },
      modules: req.body.modules || [],
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

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "systemInfo.subscriptionPlan": subscriptionPlan,
          "systemInfo.subscriptionEndDate": getEndDate(subscriptionPlan),
        },
      },
      { new: true }
    );

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


export default router;
