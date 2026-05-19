import express from "express";
import Class from "../models/Class";
import Student from "../models/Student";
import { createLog } from "../core/utils/createLog";

const router = express.Router();

const buildClassLabel = (name: string, section?: string | null) =>
  section ? `${name} - ${section}` : name;

const normalizeSection = (section?: string | null) => section?.trim().toUpperCase() || "";

async function generateUniqueCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const exists = await Class.exists({ classCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique class code");
}

// ==========================
// 📚 GET ALL CLASSES — ?schoolId= query param (used by Academics)
// ==========================
router.get("/", async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId?: string };
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const classes = await Class.find({ schoolId })
      .populate("classTeacher", "name email position")
      .populate("assignedTeachers", "name email position")
      .sort({ name: 1 })
      .lean();

    // Backfill any class that has no code yet (permanent per academic year)
    const result = await Promise.all(
      classes.map(async (cls) => {
        if (cls.classCode) return cls;
        const code = await generateUniqueCode();
        await Class.findByIdAndUpdate(cls._id, { classCode: code });
        return { ...cls, classCode: code };
      })
    );

    res.json(result);
  } catch (err) {
    console.error("GET CLASSES (query):", err);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

// ==========================
// 🔍 GET SINGLE CLASS BY ID
// ==========================
router.get("/detail/:id", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate("classTeacher", "name email position")
      .populate("assignedTeachers", "name email position")
      .lean();
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const classLabel = cls.section ? `${cls.name} - ${cls.section}` : cls.name;
    const studentCount = await Student.countDocuments({ class: classLabel, schoolId: cls.schoolId });
    res.json({ success: true, data: { ...cls, studentCount } });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch class" });
  }
});

// ==========================
// 👩‍🏫 ASSIGN TEACHER TO CLASS
// ==========================
router.post("/:id/assign-teacher", async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ message: "teacherId required" });

    const cls = await Class.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { assignedTeachers: teacherId } },
      { new: true }
    ).populate("assignedTeachers", "name email position").lean();

    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ success: true, data: cls });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign teacher" });
  }
});

// ==========================
// 🔑 GENERATE / REGENERATE CLASS CODE
// ==========================
router.post("/:id/generate-code", async (req, res) => {
  try {
    const code = await generateUniqueCode();
    const cls = await Class.findByIdAndUpdate(
      req.params.id,
      { classCode: code },
      { new: true }
    )
      .populate("classTeacher", "name email position")
      .populate("assignedTeachers", "name email position")
      .lean();
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    res.json({ success: true, data: cls });
  } catch (err) {
    console.error("GENERATE CODE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to generate code" });
  }
});

// ==========================
// 🚪 STUDENT JOIN BY CLASS CODE
// ==========================
router.post("/join-by-code", async (req, res) => {
  try {
    const { code, studentId } = req.body as { code?: string; studentId?: string };
    if (!code || !studentId) {
      return res.status(400).json({ success: false, message: "code and studentId required" });
    }

    const cls = await Class.findOne({ classCode: code.trim().toUpperCase() });
    if (!cls) return res.status(404).json({ success: false, message: "Invalid class code" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const classLabel = buildClassLabel(cls.name, cls.section);
    if ((student as any).class === classLabel) {
      return res.status(400).json({ success: false, message: "Already enrolled in this class" });
    }

    await Student.findByIdAndUpdate(studentId, { class: classLabel });
    await Class.findByIdAndUpdate(cls._id, { $inc: { studentCount: 1 } });

    res.json({ success: true, data: { className: classLabel, classId: cls._id } });
  } catch (err) {
    console.error("JOIN BY CODE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to join class" });
  }
});

// ==========================
// 📚 GET ALL CLASSES FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const classes = await Class.find({ schoolId: req.params.schoolId })
      .populate("classTeacher", "name email position")
      .sort({ name: 1 });

    // Count students + backfill missing class codes
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const classLabel = buildClassLabel(cls.name, cls.section);
        const studentCount = await Student.countDocuments({
          class: classLabel,
          schoolId: req.params.schoolId,
          admissionCompleted: { $ne: false },
        });
        let { classCode } = cls;
        if (!classCode) {
          classCode = await generateUniqueCode();
          await Class.findByIdAndUpdate(cls._id, { classCode });
        }
        return { ...cls.toObject(), studentCount, classCode };
      })
    );

    res.json(classesWithCounts);
  } catch (error) {
    console.error("GET CLASSES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

// ==========================
// ➕ CREATE CLASS
// ==========================
router.post("/", async (req, res) => {
  try {
    const { name, section, stream, classTeacher, academicYear, description, meetLink, schoolId } = req.body;
    const normalizedSection = normalizeSection(section);

    if (!name || !schoolId) {
      return res.status(400).json({ message: "Required fields: name, schoolId" });
    }

    const existingClass = await Class.findOne({
      schoolId,
      name: name.trim(),
      section: normalizedSection || "",
    });

    if (existingClass) {
      return res.status(400).json({ message: "This class and section already exist" });
    }

    const classCode = await generateUniqueCode();

    const newClass = await Class.create({
      name: name.trim(),
      section: normalizedSection,
      stream,
      classTeacher,
      academicYear,
      description,
      meetLink,
      schoolId,
      classCode,
      studentCount: 0,
    });

    const classWithTeacher = await newClass.populate("classTeacher", "name email position");

    await createLog({
      action: "CREATE_CLASS",
      message: `Class created: ${name}`,
      schoolId,
    });

    res.json({ success: true, data: classWithTeacher });
  } catch (error) {
    console.error("CREATE CLASS ERROR:", error);
    res.status(500).json({ message: "Failed to create class" });
  }
});

// ==========================
// ✏️ UPDATE CLASS
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const existingClass = await Class.findById(req.params.id);

    if (!existingClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    const nextName = typeof req.body.name === "string" ? req.body.name.trim() : existingClass.name;
    const nextSection =
      req.body.section !== undefined
        ? normalizeSection(req.body.section)
        : normalizeSection(existingClass.section);

    const duplicateClass = await Class.findOne({
      _id: { $ne: req.params.id },
      schoolId: existingClass.schoolId,
      name: nextName,
      section: nextSection || "",
    });

    if (duplicateClass) {
      return res.status(400).json({ message: "This class and section already exist" });
    }

    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...(req.body.name !== undefined ? { name: nextName } : {}),
        ...(req.body.section !== undefined ? { section: nextSection } : {}),
      },
      { new: true }
    ).populate("classTeacher", "name email position");

    if (!updated) {
      return res.status(404).json({ message: "Class not found" });
    }

    await createLog({
      action: "UPDATE_CLASS",
      message: `Class updated: ${updated.name}`,
      schoolId: updated.schoolId,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE CLASS ERROR:", error);
    res.status(500).json({ message: "Failed to update class" });
  }
});

// ==========================
// 🗑 DELETE CLASS
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const classDoc = await Class.findByIdAndDelete(req.params.id);

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    await createLog({
      action: "DELETE_CLASS",
      message: `Class deleted: ${classDoc.name}`,
      schoolId: classDoc.schoolId,
    });

    res.json({ success: true, message: "Class deleted" });
  } catch (error) {
    console.error("DELETE CLASS ERROR:", error);
    res.status(500).json({ message: "Failed to delete class" });
  }
});

// ==========================
// 👥 GET CLASS DETAILS WITH STUDENTS
// ==========================
router.get("/:schoolId/:className", async (req, res) => {
  try {
    const requestedClass = decodeURIComponent(req.params.className);
    const classes = await Class.find({
      schoolId: req.params.schoolId,
    }).populate("classTeacher", "name email position");

    const classDoc =
      classes.find((cls) => buildClassLabel(cls.name, cls.section) === requestedClass) ||
      classes.find((cls) => cls.name === requestedClass);

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const classLabel = buildClassLabel(classDoc.name, classDoc.section);
    const students = await Student.find({
      class: classLabel,
      schoolId: req.params.schoolId,
      admissionCompleted: { $ne: false },
    }).sort({ rollNumber: 1 });

    res.json({
      class: classDoc,
      students,
      studentCount: students.length,
    });
  } catch (error) {
    console.error("GET CLASS DETAILS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch class details" });
  }
});

export default router;
