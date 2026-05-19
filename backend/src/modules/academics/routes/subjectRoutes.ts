import express from "express";
import mongoose from "mongoose";
import Subject from "../models/Subject";

const router = express.Router();
const toOid = (id: string) => new mongoose.Types.ObjectId(id);

// GET /api/subjects?classId=&schoolId=
router.get("/", async (req, res) => {
  try {
    const { classId, schoolId } = req.query as Record<string, string>;
    if (!classId || !schoolId) return res.status(400).json({ message: "classId and schoolId required" });

    const subjects = await Subject.find({ classId: toOid(classId), schoolId: toOid(schoolId), isActive: true })
      .populate("teacherId", "name department")
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

// POST /api/subjects
router.post("/", async (req, res) => {
  try {
    const { schoolId, classId, name, code, description, teacherId } = req.body;
    if (!schoolId || !classId || !name) return res.status(400).json({ message: "schoolId, classId, name required" });

    const exists = await Subject.findOne({ schoolId: toOid(schoolId), classId: toOid(classId), name: name.trim() });
    if (exists) return res.status(400).json({ message: "Subject already exists in this class" });

    const subject = await Subject.create({
      schoolId: toOid(schoolId),
      classId: toOid(classId),
      name: name.trim(),
      code: code ?? "",
      description: description ?? "",
      teacherId: teacherId ? toOid(teacherId) : null,
    });

    const populated = await subject.populate("teacherId", "name department");
    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("CREATE SUBJECT:", err);
    res.status(500).json({ message: "Failed to create subject" });
  }
});

// PUT /api/subjects/:id
router.put("/:id", async (req, res) => {
  try {
    const allowed = ["name", "code", "description", "teacherId", "isActive"];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    if (update.teacherId) update.teacherId = toOid(update.teacherId as string);

    const subject = await Subject.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate("teacherId", "name department")
      .lean();
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(500).json({ message: "Failed to update subject" });
  }
});

// DELETE /api/subjects/:id
router.delete("/:id", async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete subject" });
  }
});

export default router;
