import express from "express";
import Class from "../models/Class";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";

const router = express.Router();

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
        const studentCount = await Student.countDocuments({ 
          class: cls.name,
          schoolId: req.params.schoolId 
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

    if (!name || !schoolId) {
      return res.status(400).json({ message: "Required fields: name, schoolId" });
    }

    const newClass = await Class.create({
      name,
      section,
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
    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    const classDoc = await Class.findOne({
      name: req.params.className,
      schoolId: req.params.schoolId,
    }).populate("classTeacher", "name email position");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const students = await Student.find({
      class: req.params.className,
      schoolId: req.params.schoolId,
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
