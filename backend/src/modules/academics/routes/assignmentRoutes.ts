import express from "express";
import { eventBus } from "../../../core/events";
import mongoose from "mongoose";
import Assignment from "../models/Assignment";
import AssignmentSubmission from "../models/AssignmentSubmission";
import Student from "../../students/models/Student";
import Staff from "../../staff/models/Staff";


const router = express.Router();

function toOid(id: string) { return new mongoose.Types.ObjectId(id); }

// ─── Teacher: list assignments ────────────────────────────────────────────────
// GET /api/assignments?schoolId=&classId=&teacherId=&status=
router.get("/", async (req, res) => {
  try {
    const { schoolId, classId, teacherId, status } = req.query as Record<string, string>;
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const filter: Record<string, unknown> = { schoolId: toOid(schoolId) };
    if (classId)   filter.classId   = toOid(classId);
    if (teacherId) filter.teacherId = toOid(teacherId);
    if (status)    filter.status    = status;

    const assignments = await Assignment.find(filter)
      .populate("teacherId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // attach submission counts
    const ids = assignments.map((a) => a._id);
    const counts = await AssignmentSubmission.aggregate([
      { $match: { assignmentId: { $in: ids } } },
      { $group: { _id: "$assignmentId", total: { $sum: 1 }, graded: { $sum: { $cond: [{ $eq: ["$status", "GRADED"] }, 1, 0] } } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c]));

    const result = assignments.map((a) => {
      const c = countMap.get(String(a._id));
      return { ...a, submissionsTotal: c?.total ?? 0, submissionsGraded: c?.graded ?? 0 };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("GET ASSIGNMENTS:", err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// ─── Teacher: get single assignment ──────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("teacherId", "name")
      .lean();
    if (!assignment) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assignment" });
  }
});

// ─── Teacher: create assignment ───────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { schoolId, classId, className, subject, title, instructions, dueDate, totalPoints, attachments, teacherId, status } = req.body;

    if (!schoolId || !className || !title || !teacherId)
      return res.status(400).json({ message: "schoolId, className, title, teacherId required" });

    const teacher = await Staff.findOne({ _id: teacherId, schoolId }).select("name");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignment = await Assignment.create({
      schoolId: toOid(schoolId),
      classId: classId ? toOid(classId) : null,
      className,
      subject: subject ?? "",
      title,
      instructions: instructions ?? "",
      dueDate: dueDate ? new Date(dueDate) : null,
      totalPoints: totalPoints ?? 100,
      attachments: attachments ?? [],
      teacherId: toOid(teacherId),
      status: status ?? "PUBLISHED",
    });

    eventBus.publish("audit.entry", { action: "CREATE_ASSIGNMENT", message: `Assignment "${title}" for ${className}`, user: teacher.name, schoolId });
    res.json({ success: true, data: assignment });
  } catch (err) {
    console.error("CREATE ASSIGNMENT:", err);
    res.status(500).json({ message: "Failed to create assignment" });
  }
});

// ─── Teacher: update assignment ───────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["title", "instructions", "subject", "dueDate", "totalPoints", "attachments", "status", "className"];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    if (update.dueDate) update.dueDate = new Date(update.dueDate as string);

    const assignment = await Assignment.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!assignment) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ message: "Failed to update assignment" });
  }
});

// ─── Teacher: delete assignment ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Not found" });
    await AssignmentSubmission.deleteMany({ assignmentId: assignment._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete assignment" });
  }
});

// ─── Teacher: list submissions for an assignment ──────────────────────────────
router.get("/:id/submissions", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const submissions = await AssignmentSubmission.find({ assignmentId: req.params.id })
      .populate("studentId", "name rollNumber class classSection")
      .lean();

    // also return list of students in the class who haven't submitted
    const students = await Student.find({ schoolId: assignment.schoolId, class: assignment.className }).select("name rollNumber class classSection").lean();
    const submittedIds = new Set(submissions.map((s) => String(s.studentId._id ?? s.studentId)));

    const pending = students
      .filter((s) => !submittedIds.has(String(s._id)))
      .map((s) => ({ student: s, status: "NOT_SUBMITTED" }));

    res.json({ success: true, data: { submissions, pending } });
  } catch (err) {
    console.error("GET SUBMISSIONS:", err);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

// ─── Teacher: grade a submission ─────────────────────────────────────────────
router.post("/:id/grade/:submissionId", async (req, res) => {
  try {
    const { gradePoints, gradeComment, gradedBy } = req.body;
    if (gradePoints === undefined) return res.status(400).json({ message: "gradePoints required" });

    const submission = await AssignmentSubmission.findByIdAndUpdate(
      req.params.submissionId,
      {
        $set: {
          gradePoints: Number(gradePoints),
          gradeComment: gradeComment ?? "",
          status: "GRADED",
          gradedBy: gradedBy ? toOid(gradedBy) : undefined,
          gradedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!submission) return res.status(404).json({ message: "Submission not found" });
    res.json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ message: "Failed to grade submission" });
  }
});

// ─── Student: assignments for their class ────────────────────────────────────
// GET /api/assignments/student/:studentId?schoolId=
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.query as { schoolId: string };
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const student = await Student.findById(studentId).select("class class_id").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    const filter: Record<string, unknown> = { schoolId: toOid(schoolId), status: "PUBLISHED" };
    if (student.class_id) filter.classId = student.class_id;
    else filter.className = student.class;

    const assignments = await Assignment.find(filter)
      .populate("teacherId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // attach per-assignment submission status for this student
    const ids = assignments.map((a) => a._id);
    const mySubs = await AssignmentSubmission.find({ assignmentId: { $in: ids }, studentId: toOid(studentId) }).lean();
    const subMap = new Map(mySubs.map((s) => [String(s.assignmentId), s]));

    const result = assignments.map((a) => {
      const sub = subMap.get(String(a._id));
      return {
        ...a,
        submissionStatus: sub ? sub.status : "NOT_SUBMITTED",
        submissionId: sub ? sub._id : null,
        gradePoints: sub?.gradePoints ?? null,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("STUDENT ASSIGNMENTS:", err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// ─── Student: get own submission ──────────────────────────────────────────────
router.get("/:id/my-submission/:studentId", async (req, res) => {
  try {
    const sub = await AssignmentSubmission.findOne({
      assignmentId: req.params.id,
      studentId: req.params.studentId,
    }).lean();
    res.json({ success: true, data: sub ?? null });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submission" });
  }
});

// ─── Student: submit assignment ───────────────────────────────────────────────
router.post("/:id/submit", async (req, res) => {
  try {
    const { studentId, schoolId, content, attachments } = req.body;
    if (!studentId || !schoolId) return res.status(400).json({ message: "studentId and schoolId required" });

    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (assignment.status === "CLOSED") return res.status(400).json({ message: "Assignment is closed" });

    const existing = await AssignmentSubmission.findOne({ assignmentId: req.params.id, studentId: toOid(studentId) });

    let submission;
    if (existing) {
      // resubmit
      existing.content = content ?? "";
      existing.attachments = attachments ?? [];
      existing.submittedAt = new Date();
      existing.status = "SUBMITTED";
      existing.gradePoints = null as unknown as number;
      existing.gradeComment = "";
      await existing.save();
      submission = existing;
    } else {
      submission = await AssignmentSubmission.create({
        assignmentId: toOid(req.params.id),
        studentId: toOid(studentId),
        schoolId: toOid(schoolId),
        content: content ?? "",
        attachments: attachments ?? [],
      });
    }

    res.json({ success: true, data: submission });
  } catch (err) {
    console.error("SUBMIT ASSIGNMENT:", err);
    res.status(500).json({ message: "Failed to submit assignment" });
  }
});

export default router;
