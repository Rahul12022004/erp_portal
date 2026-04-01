import express from "express";
import Class from "../models/Class";
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

type StudentSource = Record<string, unknown>;

type ImportedStudentRow = {
  rowNumber?: number;
  formNumber?: string;
  formDate?: string;
  admissionNumber?: string;
  name?: string;
  email?: string;
  className?: string;
  classSection?: string;
  academicYear?: string;
  rollNumber?: string;
  phone?: string;
  aadharNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  religion?: string;
  caste?: string;
  address?: string;
  needsTransport?: boolean;
  busConsent?: boolean;
};

type NormalizedImportedStudentRow = {
  rowNumber: number;
  formNumber: string;
  formDate: string;
  admissionNumber: string;
  name: string;
  email: string;
  className: string;
  classSection: string;
  classLabel: string;
  academicYear: string;
  rollNumber: string;
  phone: string;
  aadharNumber: string;
  gender: string;
  dateOfBirth: string;
  religion: string;
  caste: string;
  address: string;
  needsTransport: boolean;
  busConsent: boolean;
  schoolId: string;
};

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

const buildClassLabel = (name: string, section?: string | null) =>
  section ? `${name} - ${section}` : name;

const normalizeSection = (section?: string | null) => section?.trim().toUpperCase() || "";

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeGender = (value: unknown) => {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("m")) {
    return "Male";
  }

  if (normalized.startsWith("f")) {
    return "Female";
  }

  return "Other";
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildStudentPayload(source: StudentSource) {
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

async function createStudentRecord(source: StudentSource) {
  const name = normalizeText(source.name);
  const email = normalizeText(source.email);
  const studentClass = normalizeText(source.class);
  const rollNumber = normalizeText(source.rollNumber);
  const schoolId = normalizeText(source.schoolId);

  if (!name || !email || !studentClass || !rollNumber || !schoolId) {
    throw new Error("Required fields: name, email, class, rollNumber, schoolId");
  }

  const studentPayload = buildStudentPayload(source);
  const student = await Student.create(studentPayload as any);
  const studentId = (student as any)._id;

  const school = await School.findById(schoolId).select("feeStructures");
  const classFeeStructure = findClassFeeStructure(school, studentClass);

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
      dueDate: normalizedClassFeeStructure.dueDate || getDefaultFeeDueDate(),
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

  return student;
}

function buildGeneratedStudentEmail(
  schoolId: string,
  row: ImportedStudentRow,
  rowIndex: number
) {
  const seed =
    normalizeText(row.admissionNumber) ||
    normalizeText(row.rollNumber) ||
    String(rowIndex + 1);

  const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() || `row-${rowIndex + 1}`;
  return `student-${schoolId}-${safeSeed}@import.local`;
}

function normalizeImportedStudentRow(
  rawRow: ImportedStudentRow,
  rowIndex: number,
  schoolId: string
) {
  const rowNumber =
    typeof rawRow.rowNumber === "number" && Number.isFinite(rawRow.rowNumber)
      ? rawRow.rowNumber
      : rowIndex + 2;
  const className = normalizeText(rawRow.className);
  const classSection = normalizeSection(rawRow.classSection);
  const normalizedRow: NormalizedImportedStudentRow = {
    rowNumber,
    formNumber: normalizeText(rawRow.formNumber),
    formDate: normalizeText(rawRow.formDate),
    admissionNumber: normalizeText(rawRow.admissionNumber),
    name: normalizeText(rawRow.name),
    email: normalizeText(rawRow.email) || buildGeneratedStudentEmail(schoolId, rawRow, rowIndex),
    className,
    classSection,
    classLabel: buildClassLabel(className, classSection),
    academicYear: normalizeText(rawRow.academicYear),
    rollNumber: normalizeText(rawRow.rollNumber),
    phone: normalizeText(rawRow.phone),
    aadharNumber: normalizeText(rawRow.aadharNumber),
    gender: normalizeGender(rawRow.gender),
    dateOfBirth: normalizeText(rawRow.dateOfBirth),
    religion: normalizeText(rawRow.religion),
    caste: normalizeText(rawRow.caste),
    address: normalizeText(rawRow.address),
    needsTransport: Boolean(rawRow.needsTransport),
    busConsent: Boolean(rawRow.busConsent),
    schoolId,
  };

  if (!normalizedRow.name || !normalizedRow.className || !normalizedRow.classSection || !normalizedRow.rollNumber) {
    return {
      valid: false as const,
      reason: "Missing required fields: name, className, classSection, rollNumber",
      rowNumber,
    };
  }

  return {
    valid: true as const,
    row: normalizedRow,
  };
}

async function ensureClassExistsForImportedRow(row: NormalizedImportedStudentRow) {
  const existingClass = await Class.findOne({
    schoolId: row.schoolId,
    name: row.className,
    section: row.classSection,
  }).select("_id");

  if (existingClass) {
    return false;
  }

  await Class.create({
    name: row.className,
    section: row.classSection,
    academicYear: row.academicYear,
    schoolId: row.schoolId,
    studentCount: 0,
  });

  await createLog({
    action: "CREATE_CLASS",
    message: `Class created: ${row.classLabel}`,
    schoolId: row.schoolId,
  });

  return true;
}

async function findDuplicateImportedStudent(row: NormalizedImportedStudentRow) {
  if (row.admissionNumber) {
    const byAdmissionNumber = await Student.findOne({
      schoolId: row.schoolId,
      admissionNumber: row.admissionNumber,
    }).select("_id");

    if (byAdmissionNumber) {
      return byAdmissionNumber;
    }
  }

  return Student.findOne({
    schoolId: row.schoolId,
    class: row.classLabel,
    rollNumber: row.rollNumber,
    name: {
      $regex: new RegExp(`^${escapeRegex(row.name)}$`, "i"),
    },
  }).select("_id");
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
// BULK IMPORT STUDENTS
// ==========================
router.post("/import", async (req, res) => {
  try {
    const schoolId = normalizeText(req.body.schoolId);
    const duplicateMode = normalizeText(req.body.duplicateMode || "skip").toLowerCase();
    const rawRows = Array.isArray(req.body.rows) ? (req.body.rows as ImportedStudentRow[]) : [];

    if (!schoolId) {
      return res.status(400).json({ message: "schoolId is required" });
    }

    if (duplicateMode !== "skip") {
      return res.status(400).json({ message: "Only duplicateMode 'skip' is supported" });
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ message: "rows must be a non-empty array" });
    }

    const school = await School.findById(schoolId).select("_id");
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const invalidRows: Array<{ rowNumber: number; reason: string }> = [];
    const validRows: NormalizedImportedStudentRow[] = [];

    rawRows.forEach((rawRow, index) => {
      const result = normalizeImportedStudentRow(rawRow, index, schoolId);
      if (!result.valid) {
        invalidRows.push({
          rowNumber: result.rowNumber,
          reason: result.reason,
        });
        return;
      }

      validRows.push(result.row);
    });

    const classesCreated: string[] = [];
    const createdClassKeys = new Set<string>();

    for (const row of validRows) {
      const classKey = `${row.className.toLowerCase()}::${row.classSection}`;
      if (createdClassKeys.has(classKey)) {
        continue;
      }

      const created = await ensureClassExistsForImportedRow(row);
      createdClassKeys.add(classKey);

      if (created) {
        classesCreated.push(row.classLabel);
      }
    }

    const duplicates: Array<{ rowNumber: number; reason: string }> = [];
    const failures: Array<{ rowNumber: number; reason: string }> = [];
    let importedCount = 0;

    for (const row of validRows) {
      const duplicate = await findDuplicateImportedStudent(row);
      if (duplicate) {
        duplicates.push({
          rowNumber: row.rowNumber,
          reason: row.admissionNumber
            ? `Student with admission number ${row.admissionNumber} already exists`
            : `Student ${row.name} already exists in ${row.classLabel} with roll number ${row.rollNumber}`,
        });
        continue;
      }

      try {
        await createStudentRecord({
          formNumber: row.formNumber,
          formDate: row.formDate,
          admissionNumber: row.admissionNumber,
          name: row.name,
          email: row.email,
          class: row.classLabel,
          classSection: row.classSection,
          academicYear: row.academicYear,
          rollNumber: row.rollNumber,
          phone: row.phone,
          aadharNumber: row.aadharNumber,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          religion: row.religion,
          caste: row.caste,
          address: row.address,
          needsTransport: row.needsTransport,
          busConsent: row.busConsent,
          schoolId: row.schoolId,
        });
        importedCount += 1;
      } catch (error) {
        failures.push({
          rowNumber: row.rowNumber,
          reason: error instanceof Error ? error.message : "Failed to import row",
        });
      }
    }

    return res.json({
      success: true,
      data: {
        totalRows: rawRows.length,
        validRows: validRows.length,
        invalidRows,
        classesCreated,
        importedCount,
        duplicateCount: duplicates.length,
        duplicates,
        failureCount: failures.length,
        failures,
      },
    });
  } catch (error) {
    console.error("IMPORT STUDENTS ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Failed to import students";
    return res.status(500).json({ message });
  }
});

// ==========================
// CREATE STUDENT
// ==========================
router.post("/", async (req, res) => {
  try {
    const student = await createStudentRecord(req.body as StudentSource);
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
