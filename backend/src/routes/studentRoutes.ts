import express from "express";
import mongoose from "mongoose";
import Class from "../models/Class";
import Finance from "../models/Finance";
import School from "../models/School";
import Student from "../models/Student";
import Transport from "../models/Transport";
import { getDatabaseStatus } from "../config/db";
import { createLog } from "../utils/createLog";
import {
  buildAppliedStudentFeeStructure,
  findClassFeeStructure,
  normalizeClassFeeStructure,
} from "../utils/classFeeStructure";

const router = express.Router();

type StudentSource = Record<string, unknown>;

type FeeComponent = {
  label: string;
  amount: number;
};

type ClassFeeStructureTemplate = {
  className?: string;
  amount?: number;
  transportFee?: number;
  academicYear?: string;
  dueDate?: string;
  feeComponents?: FeeComponent[];
};

type SyncStudentFeeAssignmentArgs = {
  studentId: string | mongoose.Types.ObjectId;
  schoolId: string;
  transportActiveOverride?: boolean;
  session?: mongoose.ClientSession;
};

type SyncStudentFeeAssignmentResult = {
  created: boolean;
  financeId: string | null;
  studentId: string;
  schoolId: string;
  academicFee: number;
  transportFee: number;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  academicYear: string;
  status: string;
  transportActive: boolean;
};

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
  "rteDocument",
  "bodCertificate",
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

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeClassKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const todayDateInput = () => new Date().toISOString().split("T")[0];

const getLatestFeeStructureForClass = (
  feeStructures: unknown,
  className: string,
  academicYear?: string | null
) => {
  const normalizedClassKey = normalizeClassKey(className);
  const structures = Array.isArray(feeStructures)
    ? (feeStructures as ClassFeeStructureTemplate[])
    : [];

  const matchingStructures = structures.filter((structure) => {
    const structureClassKey = normalizeClassKey(String(structure?.className || ""));
    if (structureClassKey !== normalizedClassKey) {
      return false;
    }

    if (!academicYear) {
      return true;
    }

    return normalizeText(structure?.academicYear) === normalizeText(academicYear);
  });

  return matchingStructures.length > 0
    ? matchingStructures[matchingStructures.length - 1]
    : null;
};

const buildFeeComponents = (academicFee: number, transportFee: number): FeeComponent[] => {
  const components: FeeComponent[] = [];

  if (academicFee > 0) {
    components.push({ label: "Academic Fee", amount: academicFee });
  }

  if (transportFee > 0) {
    components.push({ label: "Transport Fee", amount: transportFee });
  }

  return components;
};

const getComponentAmountByLabel = (feeComponents: unknown, labelMatcher: RegExp) => {
  if (!Array.isArray(feeComponents)) {
    return 0;
  }

  return (feeComponents as Array<{ label?: string; amount?: number }>).reduce((sum, component) => {
    if (labelMatcher.test(String(component?.label || ""))) {
      return sum + normalizeNumber(component?.amount);
    }

    return sum;
  }, 0);
};

const getLatestPaymentDate = (paymentHistory: unknown) => {
  if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) {
    return null;
  }

  const lastItem = paymentHistory[paymentHistory.length - 1] as { paymentDate?: string };
  return normalizeText(lastItem?.paymentDate) || null;
};

const getFeeStatus = (totalFee: number, paidAmount: number, dueDate?: string | null) => {
  const dueAmount = Math.max(totalFee - paidAmount, 0);

  if (dueAmount <= 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  if (dueDate) {
    const dueTime = new Date(dueDate).getTime();
    if (Number.isFinite(dueTime) && dueTime < Date.now()) {
      return "overdue";
    }
  }

  return "pending";
};

const resolveTransportActive = (source: StudentSource) => {
  const transportStatus = normalizeText(source.transportStatus || source.transport_status).toUpperCase();
  const transportRouteId = normalizeText(source.transportRouteId || source.transport_route_id);

  if (transportStatus === "ACTIVE") {
    return true;
  }

  if (transportStatus === "INACTIVE" || transportStatus === "NO TRANSPORT") {
    return false;
  }

  if (typeof source.needsTransport === "boolean") {
    return Boolean(source.needsTransport);
  }

  if (transportRouteId) {
    return true;
  }

  return null;
};

const getStudentTransportActiveFromRoutes = async (studentId: string, schoolId: string) => {
  const transportExists = await Transport.exists({
    schoolId,
    assignedStudents: studentId,
  });

  return Boolean(transportExists);
};

const buildNormalizedFeeStructure = (
  school: any,
  student: any,
  existingFinance: any,
  transportActive: boolean
) => {
  const latestStructure = getLatestFeeStructureForClass(
    school?.feeStructures,
    String(student?.class || ""),
    student?.academicYear || existingFinance?.academicYear || null
  );

  const existingFeeComponents = Array.isArray(existingFinance?.feeComponents)
    ? existingFinance.feeComponents
    : [];

  const academicFee = latestStructure
    ? normalizeNumber(latestStructure.amount)
    : Math.max(
        normalizeNumber(existingFinance?.amount) - getComponentAmountByLabel(existingFeeComponents, /transport/i),
        0
      );

  const templateTransportFee = latestStructure
    ? normalizeNumber(latestStructure.transportFee)
    : getComponentAmountByLabel(existingFeeComponents, /transport/i);

  const transportFee = transportActive ? templateTransportFee : 0;
  const feeComponents = buildFeeComponents(academicFee, transportFee);
  const totalFee = feeComponents.reduce((sum, component) => sum + component.amount, 0);
  const paidAmount = normalizeNumber(existingFinance?.paidAmount);
  const dueAmount = Math.max(totalFee - paidAmount, 0);
  const dueDate =
    normalizeText(latestStructure?.dueDate) ||
    normalizeText(existingFinance?.dueDate) ||
    todayDateInput();
  const academicYear =
    normalizeText(latestStructure?.academicYear) ||
    normalizeText(student?.academicYear) ||
    normalizeText(existingFinance?.academicYear) ||
    "";
  const status = getFeeStatus(totalFee, paidAmount, dueDate);
  const paymentDate =
    getLatestPaymentDate(existingFinance?.paymentHistory) ||
    normalizeText(existingFinance?.paymentDate) ||
    (paidAmount > 0 ? todayDateInput() : "");

  return {
    academicFee,
    transportFee,
    feeComponents,
    totalFee,
    paidAmount,
    dueAmount,
    dueDate,
    academicYear,
    status,
    paymentDate,
  };
};

async function syncStudentFeeAssignmentForStudent({
  studentId,
  schoolId,
  transportActiveOverride,
  session,
}: SyncStudentFeeAssignmentArgs): Promise<SyncStudentFeeAssignmentResult | null> {
  const studentQuery = Student.findOne({ _id: studentId, schoolId }).select(
    "name class academicYear needsTransport schoolId"
  );
  const schoolQuery = School.findById(schoolId).select("feeStructures");
  const existingFinanceQuery = Finance.findOne({
    schoolId,
    type: "student_fee",
    studentId,
  }).sort({ createdAt: -1 });

  if (session) {
    studentQuery.session(session);
    schoolQuery.session(session);
    existingFinanceQuery.session(session);
  }

  const [student, school, existingFinance] = await Promise.all([
    studentQuery,
    schoolQuery,
    existingFinanceQuery,
  ]);

  if (!student || !school) {
    return null;
  }

  const transportActive =
    typeof transportActiveOverride === "boolean"
      ? transportActiveOverride
      : Boolean(student.needsTransport) || (await getStudentTransportActiveFromRoutes(String(student._id), schoolId));

  const normalized = buildNormalizedFeeStructure(school, student, existingFinance, transportActive);

  if (!existingFinance && normalized.totalFee <= 0) {
    return null;
  }

  const payload = {
    type: "student_fee" as const,
    studentId: student._id,
    amount: normalized.totalFee,
    paidAmount: normalized.paidAmount,
    dueDate: normalized.dueDate,
    paymentDate: normalized.paymentDate || undefined,
    status: normalized.status,
    description: `Common fee structure for ${student.class}`,
    academicYear: normalized.academicYear,
    feeComponents: normalized.feeComponents,
    schoolId,
  };

  if (existingFinance) {
    const updatedFinance = await Finance.findByIdAndUpdate(existingFinance._id, payload, {
      new: true,
      session,
    });

    return {
      created: false,
      financeId: updatedFinance?._id ? String(updatedFinance._id) : String(existingFinance._id),
      studentId: String(student._id),
      schoolId,
      academicFee: normalized.academicFee,
      transportFee: normalized.transportFee,
      totalFee: normalized.totalFee,
      paidAmount: normalized.paidAmount,
      dueAmount: normalized.dueAmount,
      dueDate: normalized.dueDate,
      academicYear: normalized.academicYear,
      status: normalized.status,
      transportActive,
    };
  }

  const createdFinance = await Finance.create([
    {
      ...payload,
      paymentHistory: [],
    },
  ], session ? { session } : undefined);

  const financeDoc = createdFinance[0];

  return {
    created: true,
    financeId: financeDoc?._id ? String(financeDoc._id) : null,
    studentId: String(student._id),
    schoolId,
    academicFee: normalized.academicFee,
    transportFee: normalized.transportFee,
    totalFee: normalized.totalFee,
    paidAmount: normalized.paidAmount,
    dueAmount: normalized.dueAmount,
    dueDate: normalized.dueDate,
    academicYear: normalized.academicYear,
    status: normalized.status,
    transportActive,
  };
}

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

function ensureDatabaseReady() {
  const dbStatus = getDatabaseStatus();
  if (!dbStatus.connected) {
    throw new Error(
      dbStatus.lastError
        ? `Database unavailable: ${dbStatus.lastError}`
        : "Database unavailable. Please connect MongoDB and try again."
    );
  }
}

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
  const transportActive = resolveTransportActive(source);

  if (!name || !email || !studentClass || !rollNumber || !schoolId) {
    throw new Error("Required fields: name, email, class, rollNumber, schoolId");
  }

  const studentPayload = buildStudentPayload(source);
  if (transportActive !== null) {
    studentPayload.needsTransport = transportActive;
  }

  const student = await Student.create(studentPayload as any);

  await syncStudentFeeAssignmentForStudent({
    studentId: student._id,
    schoolId,
    transportActiveOverride: transportActive ?? undefined,
  });

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

async function syncStudentTransportStatusAndFee(studentId: string, schoolId: string, transportActive: boolean) {
  const updatedStudent = await Student.findOneAndUpdate(
    { _id: studentId, schoolId },
    { needsTransport: transportActive },
    { new: true }
  );

  const feeSync = await syncStudentFeeAssignmentForStudent({
    studentId,
    schoolId,
    transportActiveOverride: transportActive,
  });

  return {
    student: updatedStudent,
    feeSync,
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
    ensureDatabaseReady();

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
// UPDATE STUDENT TRANSPORT STATUS
// ==========================
router.patch("/:id/transport-status", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const transportActive = resolveTransportActive(req.body);
    const nextTransportStatus =
      transportActive !== null
        ? transportActive
        : Boolean(req.body?.transportStatus || req.body?.needsTransport);

    const syncResult = await syncStudentTransportStatusAndFee(
      String(student._id),
      String(student.schoolId),
      nextTransportStatus
    );

    await createLog({
      action: "UPDATE_STUDENT_TRANSPORT",
      message: `Transport status updated for ${student.name}: ${nextTransportStatus ? "ACTIVE" : "INACTIVE"}`,
      schoolId: student.schoolId,
    });

    return res.json({
      success: true,
      data: {
        student: syncResult.student,
        feeSync: syncResult.feeSync,
      },
    });
  } catch (error) {
    console.error("UPDATE STUDENT TRANSPORT ERROR:", error);
    return res.status(500).json({ message: "Failed to update student transport status" });
  }
});

// ==========================
// CREATE STUDENT
// ==========================
router.post("/", async (req, res) => {
  try {
    ensureDatabaseReady();
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
    const transportActive = resolveTransportActive(req.body);
    if (transportActive !== null) {
      studentPayload.needsTransport = transportActive;
    }

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      studentPayload,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }

    await syncStudentFeeAssignmentForStudent({
      studentId: updated._id,
      schoolId: String(updated.schoolId),
      transportActiveOverride: transportActive ?? undefined,
    });

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
