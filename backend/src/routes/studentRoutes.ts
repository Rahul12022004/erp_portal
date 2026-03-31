import express from "express";
import Finance from "../models/Finance";
import School from "../models/School";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";
import {
  buildAppliedStudentFeeStructure,
  findClassFeeStructure,
  normalizeClassFeeStructure,
} from "../utils/classFeeStructure";

const router = express.Router();

const getDefaultFeeDueDate = () => {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDayOfMonth.toISOString().split("T")[0];
};

const studentFieldNames = [
  "formNumber",
  "formDate",
  "admissionNumber",
  "name",
  "email",
  "class",
  "classSection",
  "academicYear",
  "rollNumber",
  "phone",
  "aadharNumber",
  "gender",
  "dateOfBirth",
  "placeOfBirth",
  "state",
  "nationality",
  "religion",
  "caste",
  "pinCode",
  "motherTongue",
  "bloodGroup",
  "photo",
  "address",
  "identificationMarks",
  "previousAcademicRecord",
  "achievements",
  "generalBehaviour",
  "medicalHistory",
  "languagePreferences",
  "schoolId",
  "hasParentConsent",
  "needsTransport",
  "busConsent",
  "house",
] as const;

const booleanStudentFields = new Set([
  "hasParentConsent",
  "needsTransport",
  "busConsent",
]);

function buildStudentPayload(source: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  for (const fieldName of studentFieldNames) {
    if (!(fieldName in source)) {
      continue;
    }

    const fieldValue = source[fieldName];

    if (fieldName === "languagePreferences") {
      payload.languagePreferences = Array.isArray(fieldValue)
        ? fieldValue
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        : String(fieldValue || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
      continue;
    }

    if (booleanStudentFields.has(fieldName)) {
      payload[fieldName] = Boolean(fieldValue);
      continue;
    }

    payload[fieldName] = fieldValue;
  }

  return payload;
}

// ==========================
// GET STUDENT BY ID OR STUDENTS BY SCHOOL ID
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const requestedId = req.params.id;
    const student = await Student.findById(requestedId);

    if (student) {
      return res.json(student);
    }

    const students = await Student.find({ schoolId: requestedId }).sort({
      class: 1,
      rollNumber: 1,
    });

    return res.json(students);
  } catch (error) {
    console.error("GET STUDENT(S) ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch student data" });
  }
});

// ==========================
// CREATE STUDENT
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      class: studentClass,
      rollNumber,
      schoolId,
    } = req.body;

    if (!name || !email || !studentClass || !rollNumber || !schoolId) {
      return res.status(400).json({
        message: "Required fields: name, email, class, rollNumber, schoolId",
      });
    }

    const studentPayload = buildStudentPayload(req.body);
    const student = await Student.create(studentPayload as any);
    const studentId = (student as any)._id;

    const school = await School.findById(schoolId).select("feeStructures");
    const classFeeStructure = findClassFeeStructure(school, String(studentClass));

    if (classFeeStructure) {
      const normalizedClassFeeStructure = normalizeClassFeeStructure(classFeeStructure);
      const appliedStudentFee = buildAppliedStudentFeeStructure(
        normalizedClassFeeStructure,
        Boolean((student as any).needsTransport)
      );

      await Finance.create({
        type: "student_fee",
        studentId,
        amount: appliedStudentFee.totalAmount,
        paidAmount: 0,
        dueDate:
          normalizedClassFeeStructure.dueDate ||
          getDefaultFeeDueDate(),
        academicYear: normalizedClassFeeStructure.academicYear,
        status: "pending",
        description: `Common fee structure for ${studentClass}`,
        feeComponents: appliedStudentFee.feeComponents,
        schoolId,
      });
    }

    await createLog({
      action: "CREATE_STUDENT",
      message: `Student created: ${name} (${studentClass})`,
      schoolId,
    });

    return res.json({ success: true, data: student });
  } catch (error) {
    console.error("CREATE STUDENT ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create student";
    return res.status(500).json({ message });
  }
});

// ==========================
// UPDATE STUDENT
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const studentPayload = buildStudentPayload(req.body);
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      studentPayload,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }

    const school = await School.findById(updated.schoolId).select("feeStructures");
    const classFeeStructure = findClassFeeStructure(school, String(updated.class || ""));

    if (classFeeStructure) {
      const normalizedClassFeeStructure = normalizeClassFeeStructure(classFeeStructure);
      const appliedStudentFee = buildAppliedStudentFeeStructure(
        normalizedClassFeeStructure,
        Boolean(updated.needsTransport)
      );

      await Finance.findOneAndUpdate(
        {
          schoolId: updated.schoolId,
          type: "student_fee",
          studentId: updated._id,
        },
        {
          amount: appliedStudentFee.totalAmount,
          dueDate: normalizedClassFeeStructure.dueDate || getDefaultFeeDueDate(),
          academicYear: normalizedClassFeeStructure.academicYear,
          feeComponents: appliedStudentFee.feeComponents,
          description: `Common fee structure for ${updated.class}`,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    await createLog({
      action: "UPDATE_STUDENT",
      message: `Student updated: ${updated.name}`,
      schoolId: updated.schoolId,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE STUDENT ERROR:", error);
    return res.status(500).json({ message: "Failed to update student" });
  }
});

// ==========================
// DELETE STUDENT
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

    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE STUDENT ERROR:", error);
    return res.status(500).json({ message: "Failed to delete student" });
  }
});

export default router;
