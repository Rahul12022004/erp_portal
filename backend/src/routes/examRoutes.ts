import express from "express";

import Exam from "../models/Exam";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📚 GET EXAMS FOR A TEACHER
// ==========================
router.get("/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const exams = await Exam.find({ schoolId, teacherId }).sort({
      examDate: 1,
      startTime: 1,
      createdAt: -1,
    });

    res.json(exams);
  } catch (error) {
    console.error("GET EXAMS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
});

// ==========================
// ➕ CREATE EXAM
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      examType,
      className,
      examDate,
      startTime,
      endTime,
      documentName,
      documentData,
      teacherId,
      schoolId,
    } = req.body;

    if (
      !title ||
      !examType ||
      !className ||
      !examDate ||
      !startTime ||
      !endTime ||
      !teacherId ||
      !schoolId
    ) {
      return res.status(400).json({
        message:
          "Required fields: title, examType, className, examDate, startTime, endTime, teacherId, schoolId",
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

    const exam = await Exam.create({
      title,
      examType,
      className,
      examDate,
      startTime,
      endTime,
      documentName,
      documentData,
      teacherId,
      schoolId,
    });

    await createLog({
      action: "CREATE_EXAM",
      message: `Exam scheduled: ${title} for ${className} on ${examDate}`,
      user: teacher.name,
      schoolId,
    });

    res.json({ success: true, data: exam });
  } catch (error) {
    console.error("CREATE EXAM ERROR:", error);
    res.status(500).json({ message: "Failed to create exam" });
  }
});

// ==========================
// 🗑 DELETE EXAM
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const teacher = await Staff.findById(exam.teacherId).select("name");

    await createLog({
      action: "DELETE_EXAM",
      message: `Exam deleted: ${exam.title}`,
      user: teacher?.name || "Teacher",
      schoolId: exam.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE EXAM ERROR:", error);
    res.status(500).json({ message: "Failed to delete exam" });
  }
});

export default router;
