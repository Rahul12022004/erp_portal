import express from "express";
import School from "../models/School";
import Staff from "../models/Staff";
import TeacherRoleAssignment from "../models/TeacherRoleAssignment";
import { createLog } from "../utils/createLog";
import { sendTeacherRoleCredentialsEmail } from "../utils/sendEmail";

const router = express.Router();

const normalizeModules = (modules: unknown): string[] => {
  if (!Array.isArray(modules)) {
    return [];
  }

  return modules
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

router.post("/login", async (req, res) => {
  try {
    const { schoolId, teacherEmail, generatedPassword } = req.body;

    if (!schoolId || !teacherEmail || !generatedPassword) {
      return res.status(400).json({
        message: "Required fields: schoolId, teacherEmail, generatedPassword",
      });
    }

    const assignment = await TeacherRoleAssignment.findOne({
      schoolId,
      teacherEmail: String(teacherEmail).trim(),
      generatedPassword: String(generatedPassword),
    })
      .populate("teacherId", "name email position status schoolId")
      .sort({ updatedAt: -1 });

    if (!assignment || !assignment.teacherId) {
      return res.status(401).json({ message: "Invalid login credentials" });
    }

    const teacher = await Staff.findOne({
      _id: assignment.teacherId,
      schoolId,
      position: /^Teacher$/i,
      status: "Active",
    });

    if (!teacher) {
      return res.status(404).json({ message: "Active teacher not found" });
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    return res.json({
      success: true,
      teacher,
      school,
      roleName: assignment.roleName,
      modules: assignment.modules || [],
    });
  } catch (error) {
    console.error("TEACHER ROLE LOGIN ERROR:", error);
    return res.status(500).json({ message: "Teacher role login failed" });
  }
});

router.get("/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;
    const assignments = await TeacherRoleAssignment.find({ schoolId })
      .populate("teacherId", "name email position status")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: assignments });
  } catch (error) {
    console.error("GET TEACHER ROLE ASSIGNMENTS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch teacher role assignments" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { schoolId, teacherId, roleName, modules, generatedPassword, createdBy } = req.body;

    if (!schoolId || !teacherId || !roleName || !generatedPassword) {
      return res.status(400).json({
        message: "Required fields: schoolId, teacherId, roleName, generatedPassword",
      });
    }

    const teacher = await Staff.findOne({
      _id: teacherId,
      schoolId,
      position: /^Teacher$/i,
      status: "Active",
    });

    if (!teacher) {
      return res.status(404).json({ message: "Active teacher not found" });
    }

    const school = await School.findById(schoolId);
    const schoolName = school && "name" in school ? String(school.name || "Our School") : "Our School";

    const safeModules = normalizeModules(modules);

    const assignment = await TeacherRoleAssignment.findOneAndUpdate(
      { schoolId, teacherId, roleName: String(roleName).trim() },
      {
        schoolId,
        teacherId,
        roleName: String(roleName).trim(),
        modules: safeModules,
        generatedPassword: String(generatedPassword),
        teacherEmail: String(teacher.email),
        createdBy: String(createdBy || "School Admin"),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("teacherId", "name email position status");

    try {
      await sendTeacherRoleCredentialsEmail({
        teacherName: String(teacher.name),
        teacherEmail: String(teacher.email),
        schoolName,
        generatedPassword: String(generatedPassword),
        roleName: String(roleName).trim(),
        modules: safeModules,
      });
    } catch (mailError) {
      console.error("TEACHER ROLE EMAIL ERROR:", mailError);
    }

    await createLog({
      action: "CREATE_TEACHER_ROLE_ASSIGNMENT",
      message: `Teacher role assigned: ${teacher.name} -> ${String(roleName).trim()}`,
      schoolId,
      user: String(createdBy || "School Admin"),
    });

    return res.json({ success: true, data: assignment });
  } catch (error) {
    console.error("CREATE TEACHER ROLE ASSIGNMENT ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to create teacher role assignment";
    return res.status(500).json({ message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const assignment = await TeacherRoleAssignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await createLog({
      action: "DELETE_TEACHER_ROLE_ASSIGNMENT",
      message: `Teacher role assignment deleted: ${assignment.roleName}`,
      schoolId: assignment.schoolId,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE TEACHER ROLE ASSIGNMENT ERROR:", error);
    return res.status(500).json({ message: "Failed to delete teacher role assignment" });
  }
});

export default router;
