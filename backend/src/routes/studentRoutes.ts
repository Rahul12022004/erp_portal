import express from "express";
import Finance from "../models/Finance";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";
import { buildAnnualFeeComponents, getCurrentDueDateForClass, getFeeStructureGroupForClass } from "../utils/feeStructure";

const router = express.Router();

const getDefaultFeeDueDate = () => {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDayOfMonth.toISOString().split("T")[0];
};

// ==========================
// 📚 GET STUDENTS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const students = await Student.find({ schoolId: req.params.schoolId })
      .sort({ class: 1, rollNumber: 1 }); // Sort by class then roll number

    res.json(students);
  } catch (error) {
    console.error("GET STUDENTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// ==========================
// ➕ CREATE STUDENT
// ==========================

router.post("/", async (req, res) => {
  try {
    const {
      formNumber,
      formDate,
      admissionNumber,
      name,
      email,
      class: studentClass,
      classSection,
      academicYear,
      rollNumber,
      phone,
      dateOfBirth,
      aadharNumber,
      placeOfBirth,
      state,
      nationality,
      religion,
      gender,
      caste,
      address,
      pinCode,
      motherTongue,
      bloodGroup,
      identificationMarks,
      previousAcademicRecord,
      achievements,
      generalBehaviour,
      medicalHistory,
      languagePreferences,
      schoolId,
      hasParentConsent,
      needsTransport,
      busConsent,
      photo,
    } = req.body;

    if (!name || !email || !studentClass || !rollNumber || !schoolId) {
      return res.status(400).json({ message: "Required fields: name, email, class, rollNumber, schoolId" });
    }

    const studentPayload: Record<string, unknown> = {
      formNumber,
      formDate,
      admissionNumber,
      name,
      email,
      class: studentClass,
      classSection,
      academicYear,
      rollNumber,
      phone,
      address,
      pinCode,
      dateOfBirth,
      aadharNumber,
      placeOfBirth,
      state,
      nationality,
      religion,
      gender,
      caste,
      motherTongue,
      bloodGroup,
      identificationMarks,
      previousAcademicRecord,
      achievements,
      generalBehaviour,
      medicalHistory,
      languagePreferences: Array.isArray(languagePreferences)
        ? languagePreferences
        : String(languagePreferences || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
      schoolId,
      hasParentConsent: !!hasParentConsent,
      needsTransport: !!needsTransport,
      busConsent: !!busConsent,
      ...(photo ? { photo } : {}),
    };

    const student = await Student.create(studentPayload as any);
    const studentId = (student as any)._id;

    const feeGroup = getFeeStructureGroupForClass(String(studentClass));

    await Finance.create({
      type: "student_fee",
      studentId,
      amount: feeGroup.annualFee,
      paidAmount: 0,
      dueDate: getCurrentDueDateForClass(String(studentClass), 0) || getDefaultFeeDueDate(),
      status: "pending",
      description: `Default fee record for ${name}`,
      feeComponents: buildAnnualFeeComponents(String(studentClass)),
      schoolId,
    });

    await createLog({
      action: "CREATE_STUDENT",
      message: `Student created: ${name} (${studentClass})`,
      schoolId,
    });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error("CREATE STUDENT ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to create student";
    res.status(500).json({ message });
  }
});

// ==========================
// ✏️ UPDATE STUDENT
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }

    await createLog({
      action: "UPDATE_STUDENT",
      message: `Student updated: ${updated.name}`,
      schoolId: updated.schoolId,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE STUDENT ERROR:", error);
    res.status(500).json({ message: "Failed to update student" });
  }
});

// ==========================
// 🗑 DELETE STUDENT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await createLog({
      action: "DELETE_STUDENT",
      message: `Student deleted: ${student.name}`,
      schoolId: student.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE STUDENT ERROR:", error);
    res.status(500).json({ message: "Failed to delete student" });
  }
});

export default router;
