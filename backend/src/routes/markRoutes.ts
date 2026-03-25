import express from "express";

import Class from "../models/Class";
import Exam from "../models/Exam";
import Mark from "../models/Mark";
import Staff from "../models/Staff";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";

const router = express.Router();

const buildClassLabel = (name: string, section?: string | null) =>
  section ? `${name} - ${section}` : name;

const getTeacherClassLabels = async (schoolId: string, teacherId: string) => {
  const classes = await Class.find({ schoolId, classTeacher: teacherId }).select("name section");
  return classes.map((classDoc) => buildClassLabel(classDoc.name, classDoc.section));
};

const isExamCompleted = (examDate: string, endTime: string) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  if (examDate < today) {
    return true;
  }

  if (examDate > today) {
    return false;
  }

  return endTime <= currentTime;
};

// ==========================
// 📚 GET COMPLETED EXAMS FOR MARK ENTRY
// ==========================
router.get("/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const classLabels = await getTeacherClassLabels(schoolId, teacherId);

    if (classLabels.length === 0) {
      return res.json([]);
    }

    const exams = await Exam.find({ schoolId, className: { $in: classLabels } }).sort({
      examDate: -1,
      startTime: -1,
    });

    const completedExams = exams.filter((exam) =>
      isExamCompleted(exam.examDate, exam.endTime)
    );

    res.json(completedExams);
  } catch (error) {
    console.error("GET MARK EXAMS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch completed exams" });
  }
});

// ==========================
// 👨‍🎓 GET STUDENTS + SAVED MARKS FOR AN EXAM
// ==========================
router.get("/:schoolId/:teacherId/:examId", async (req, res) => {
  try {
    const { schoolId, teacherId, examId } = req.params;

    const exam = await Exam.findOne({ _id: examId, schoolId });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const classLabels = await getTeacherClassLabels(schoolId, teacherId);
    if (!classLabels.includes(exam.className)) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const [students, marks] = await Promise.all([
      Student.find({ schoolId, class: exam.className }).sort({
        rollNumber: 1,
        name: 1,
      }),
      Mark.find({ schoolId, teacherId, examId }),
    ]);

    const markMap = new Map(
      marks.map((mark) => [mark.studentId.toString(), mark])
    );

    const studentMarks = students.map((student) => {
      const mark = markMap.get(student._id.toString());

      return {
        markId: mark?._id || null,
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        obtainedMarks: mark?.obtainedMarks ?? "",
        maxMarks: mark?.maxMarks ?? 100,
        remarks: mark?.remarks || "",
      };
    });

    res.json({
      exam,
      students: studentMarks,
    });
  } catch (error) {
    console.error("GET EXAM MARKS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch marks data" });
  }
});

// ==========================
// ➕ SAVE MARKS
// ==========================
router.post("/", async (req, res) => {
  try {
    const { examId, teacherId, schoolId, entries } = req.body;

    if (!examId || !teacherId || !schoolId || !Array.isArray(entries)) {
      return res.status(400).json({
        message: "Required fields: examId, teacherId, schoolId, entries",
      });
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const classLabels = await getTeacherClassLabels(schoolId, teacherId);
    if (!classLabels.includes(exam.className)) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const teacher = await Staff.findById(teacherId).select("name");

    const validEntries = entries.filter(
      (entry: any) =>
        entry?.studentId &&
        entry?.obtainedMarks !== "" &&
        entry?.obtainedMarks !== null &&
        entry?.obtainedMarks !== undefined
    );

    await Promise.all(
      validEntries.map((entry: any) =>
        Mark.findOneAndUpdate(
          { examId, studentId: entry.studentId },
          {
            examId,
            studentId: entry.studentId,
            teacherId,
            schoolId,
            className: exam.className,
            obtainedMarks: Number(entry.obtainedMarks),
            maxMarks: Number(entry.maxMarks) || 100,
            remarks: entry.remarks || "",
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        )
      )
    );

    await createLog({
      action: "SAVE_MARKS",
      message: `Marks uploaded for ${exam.title} (${exam.className})`,
      user: teacher?.name || "Teacher",
      schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("SAVE MARKS ERROR:", error);
    res.status(500).json({ message: "Failed to save marks" });
  }
});

export default router;
