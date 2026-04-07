import express from "express";
import Class from "../models/Class";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";

const router = express.Router();

const buildClassLabel = (name: string, section?: string | null) =>
  section ? `${name} - ${section}` : name;

const normalizeSection = (section?: string | null) => section?.trim().toUpperCase() || "";

// ==========================
// 📚 GET ALL CLASSES FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const classes = await Class.find({ schoolId: req.params.schoolId })
      .populate("classTeacher", "name email position")
      .sort({ name: 1 });

    // Count students for each class
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const classLabel = buildClassLabel(cls.name, cls.section);
        const studentCount = await Student.countDocuments({ 
          class: classLabel,
          schoolId: req.params.schoolId,
          admissionCompleted: { $ne: false },
        });
        return {
          ...cls.toObject(),
          studentCount,
        };
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

    const newClass = await Class.create({
      name: name.trim(),
      section: normalizedSection,
      stream,
      classTeacher,
      academicYear,
      description,
      meetLink,
      schoolId,
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
