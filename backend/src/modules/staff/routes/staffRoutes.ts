import express from "express";
import { eventBus } from "../../../core/events";
import bcrypt from "bcryptjs";
import School from "../../school/models/School";
import Staff from "../models/Staff";

import { sendTeacherCredentialsEmail } from "../../../core/utils/sendEmail";
import { authenticateToken } from "../../../core/middleware/auth";

const router = express.Router();


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

    eventBus.publish("audit.entry", {
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

    eventBus.publish("audit.entry", {
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

    eventBus.publish("audit.entry", {
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
