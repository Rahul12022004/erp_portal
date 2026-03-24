import express from "express";

import Assignment from "../models/Assignment";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📚 GET ASSIGNMENTS FOR A TEACHER
// ==========================
router.get("/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const assignments = await Assignment.find({ schoolId, teacherId }).sort({
      createdAt: -1,
    });

    res.json(assignments);
  } catch (error) {
    console.error("GET ASSIGNMENTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// ==========================
// ➕ CREATE ASSIGNMENT
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      className,
      dueDate,
      fileName,
      fileData,
      teacherId,
      schoolId,
    } = req.body;

    if (!title || !className || !teacherId || !schoolId) {
      return res.status(400).json({
        message: "Required fields: title, className, teacherId, schoolId",
      });
    }

    const teacher = await Staff.findOne({
      _id: teacherId,
      schoolId,
      position: /^Teacher$/i,
    }).select("name");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const assignment = await Assignment.create({
      title,
      description,
      className,
      dueDate,
      fileName,
      fileData,
      teacherId,
      schoolId,
    });

    await createLog({
      action: "CREATE_ASSIGNMENT",
      message: `Assignment created: ${title} for ${className}`,
      user: teacher.name,
      schoolId,
    });

    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error("CREATE ASSIGNMENT ERROR:", error);
    res.status(500).json({ message: "Failed to create assignment" });
  }
});

// ==========================
// 🗑 DELETE ASSIGNMENT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const teacher = await Staff.findById(assignment.teacherId).select("name");

    await createLog({
      action: "DELETE_ASSIGNMENT",
      message: `Assignment deleted: ${assignment.title}`,
      user: teacher?.name || "Teacher",
      schoolId: assignment.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE ASSIGNMENT ERROR:", error);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
});

export default router;
