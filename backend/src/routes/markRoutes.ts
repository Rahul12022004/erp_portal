import express from "express";

import Class from "../models/Class";
import Exam from "../models/Exam";
import Mark from "../models/Mark";
import School from "../models/School";
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
// 📥 DOWNLOAD MARKS AS PDF
// ==========================
router.get("/download/:schoolId/:examId", async (req, res) => {
  try {
    const { schoolId, examId } = req.params;

    const exam = await Exam.findOne({ _id: examId, schoolId }).populate("teacherId", "name email");
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const school = await School.findById(schoolId).select("schoolInfo.name schoolInfo.address schoolInfo.logo");

    const marks = await Mark.find({ schoolId, examId })
      .populate("studentId", "name rollNumber email class")
      .sort({ "studentId.rollNumber": 1 });

    res.json({
      exam: {
        title: exam.title,
        examType: exam.examType,
        className: exam.className,
        subject: exam.subject,
        examDate: exam.examDate,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
      school: school ? { name: school.schoolInfo?.name, address: school.schoolInfo?.address, logo: school.schoolInfo?.logo } : null,
      teacher: exam.teacherId
        ? typeof exam.teacherId === "object"
          ? (exam.teacherId as any).name
          : exam.teacherId
        : null,
      marks: marks.map((m) => ({
        studentName: (m.studentId as any)?.name || "N/A",
        rollNumber: (m.studentId as any)?.rollNumber || "N/A",
        email: (m.studentId as any)?.email || "N/A",
        obtainedMarks: m.obtainedMarks,
        maxMarks: m.maxMarks,
        remarks: m.remarks,
      })),
    });
  } catch (error) {
    console.error("DOWNLOAD MARKS ERROR:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to download marks", error: message });
  }
});

// ==========================
// 📚 GET COMPLETED EXAMS FOR MARK ENTRY
// ==========================
router.get("/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const classLabels = await getTeacherClassLabels(schoolId, teacherId);

    // Exams where teacher is explicitly assigned OR no teacher assigned (null)
    const assignedExams = await Exam.find({
      schoolId,
      teacherId: { $in: [teacherId, null] },
    }).sort({ examDate: -1, startTime: -1 });

    // Only filter by class if teacher is not explicitly assigned to any exam
    const examsForTeacher = assignedExams.filter((exam) => {
      // If teacher is explicitly assigned to this exam, no class check needed
      if (exam.teacherId && exam.teacherId.toString() === teacherId) {
        return true;
      }
      // Otherwise teacher must be classTeacher of the exam's class
      return classLabels.includes(exam.className);
    });

    const completedExams = examsForTeacher.filter((exam) =>
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

    // Check if teacher is explicitly assigned to this exam
    const isExplicitlyAssigned = exam.teacherId && exam.teacherId.toString() === teacherId;

    // If not explicitly assigned, teacher must be classTeacher of the exam's class
    if (!isExplicitlyAssigned) {
      const classLabels = await getTeacherClassLabels(schoolId, teacherId);
      if (!classLabels.includes(exam.className)) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }
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

    // Check if teacher is explicitly assigned to this exam
    const isExplicitlyAssigned = exam.teacherId && exam.teacherId.toString() === teacherId;

    // If not explicitly assigned, teacher must be classTeacher of the exam's class
    if (!isExplicitlyAssigned) {
      const classLabels = await getTeacherClassLabels(schoolId, teacherId);
      if (!classLabels.includes(exam.className)) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }
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
