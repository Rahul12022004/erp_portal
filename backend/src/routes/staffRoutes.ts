import express from "express";
import School from "../models/School";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 🔐 TEACHER LOGIN
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Required fields: name, email" });
    }

    const teacher = await Staff.findOne({
      name,
      email,
      position: /^Teacher$/i,
      status: "Active",
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const school = await School.findById(teacher.schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found for teacher" });
    }

    res.json({
      success: true,
      teacher,
      school,
    });
  } catch (error) {
    console.error("TEACHER LOGIN ERROR:", error);
    res.status(500).json({ message: "Teacher login failed" });
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
    const { name, email, phone, position, department, qualification, address, dateOfBirth, gender, joinDate, status, schoolId } = req.body;

    if (!name || !email || !phone || !position || !schoolId) {
      return res.status(400).json({ message: "Required fields: name, email, phone, position, schoolId" });
    }

    const staff = await Staff.create({
      name,
      email,
      phone,
      position,
      department,
      qualification,
      address,
      dateOfBirth,
      gender,
      joinDate,
      status,
      schoolId,
    });

    await createLog({
      action: "CREATE_STAFF",
      message: `Staff created: ${name} (${position})`,
      schoolId,
    });

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
