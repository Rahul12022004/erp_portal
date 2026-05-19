import express from "express";
import mongoose from "mongoose";
import StudyMaterial from "../models/StudyMaterial";

const router = express.Router();
const toOid = (id: string) => new mongoose.Types.ObjectId(id);

// GET /api/materials?classId=&schoolId=&subjectId=
router.get("/", async (req, res) => {
  try {
    const { classId, schoolId, subjectId } = req.query as Record<string, string>;
    if (!classId || !schoolId) return res.status(400).json({ message: "classId and schoolId required" });

    const filter: Record<string, unknown> = { classId: toOid(classId), schoolId: toOid(schoolId) };
    if (subjectId) filter.subjectId = toOid(subjectId);

    const materials = await StudyMaterial.find(filter)
      .populate("teacherId", "name")
      .populate("subjectId", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch materials" });
  }
});

// POST /api/materials
router.post("/", async (req, res) => {
  try {
    const { schoolId, classId, subjectId, teacherId, title, description, type, url, fileName, fileData } = req.body;
    if (!schoolId || !classId || !teacherId || !title) {
      return res.status(400).json({ message: "schoolId, classId, teacherId, title required" });
    }

    const material = await StudyMaterial.create({
      schoolId: toOid(schoolId),
      classId: toOid(classId),
      subjectId: subjectId ? toOid(subjectId) : null,
      teacherId: toOid(teacherId),
      title: title.trim(),
      description: description ?? "",
      type: type ?? "FILE",
      url: url ?? "",
      fileName: fileName ?? "",
      fileData: fileData ?? "",
    });

    const populated = await material.populate([
      { path: "teacherId", select: "name" },
      { path: "subjectId", select: "name" },
    ]);
    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("CREATE MATERIAL:", err);
    res.status(500).json({ message: "Failed to create material" });
  }
});

// DELETE /api/materials/:id
router.delete("/:id", async (req, res) => {
  try {
    const m = await StudyMaterial.findByIdAndDelete(req.params.id);
    if (!m) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete material" });
  }
});

export default router;
