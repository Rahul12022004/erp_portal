import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { createWorker } from "tesseract.js";
import { financeService } from "../services/financeService";
import ClassFeeStructure from "../models/ClassFeeStructure";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";
import Student from "../models/Student";
import Class from "../models/Class";
import Staff from "../models/Staff";
import Finance from "../models/Finance";
import SalaryRole from "../models/SalaryRole";
import InvestorLedger from "../models/InvestorLedger";
import { createLog } from "../utils/createLog";
import { sendStudentFeeReceiptEmail } from "../utils/sendEmail";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

type LooseRecord = Record<string, unknown>;

type ReceiptRecord = {
  receiptNumber: string;
  transactionId: string;
  paymentDate: string;
  amountPaid: number;
  paymentType: string;
  sentToEmail: boolean;
  createdAt: string | null;
};

type ClassLookup = {
  _id: unknown;
  name?: string;
  section?: string | null;
};

type ClassFeeStructureRecord = LooseRecord & {
  class_id?: unknown;
  class_name?: unknown;
  className?: unknown;
  section?: unknown;
  academic_fee?: unknown;
  default_transport_fee?: unknown;
  other_fee?: unknown;
  due_date?: unknown;
  academic_year?: unknown;
};

type AssignmentRecord = LooseRecord & {
  _id?: unknown;
  student_id?: unknown;
  fee_status?: unknown;
  total_fee?: unknown;
  paid_amount?: unknown;
  due_amount?: unknown;
  academic_fee?: unknown;
  transport_fee?: unknown;
  other_fee?: unknown;
  due_date?: unknown;
  last_payment_date?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  class_fee_structure_id?: unknown;
  discount_amount?: unknown;
};

type StructureRecord = LooseRecord & {
  academic_fee?: unknown;
  default_transport_fee?: unknown;
  other_fee?: unknown;
};

type ClassQuery = {
  schoolId: mongoose.Types.ObjectId;
  name: string;
  section?: string;
};

type AiFeeStructurePreviewPayload = {
  classLabel?: string;
  academic_year?: string;
  due_date?: string;
  academic_fee?: number;
  default_transport_fee?: number;
  other_fee?: number;
  confidence?: number;
  notes?: string[];
};

const asRecord = (value: unknown): LooseRecord | null =>
  value && typeof value === "object" ? (value as LooseRecord) : null;

const toObjectRecord = (value: unknown): LooseRecord => {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  const toObject = record.toObject;
  if (typeof toObject === "function") {
    const plain = toObject.call(value) as unknown;
    return asRecord(plain) || record;
  }

  return record;
};

const toStringValue = (value: unknown): string => String(value || "");
const toOptionalString = (value: unknown): string | null => {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
};
const toNumberValue = (value: unknown): number => Number(value || 0);
const getSingleString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
};
const getOptionalString = (value: unknown): string | undefined => {
  const normalized = getSingleString(value).trim();
  return normalized || undefined;
};
const toIdString = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const record = value as { _id?: unknown; toString?: () => string };
    if (record._id && record._id !== value) {
      return toIdString(record._id);
    }
    if (typeof record.toString === "function") {
      return record.toString();
    }
  }

  return String(value);
};
const asMongoFilter = <T extends LooseRecord>(filter: T) => filter as never;
const cleanJson = (value: string) => value.replace(/```json|```/gi, "").trim();

const parseClassLabel = (label: string) => {
  const normalized = String(label || "").trim();
  if (!normalized) {
    return { name: "", section: "" };
  }

  const parts = normalized.split("-").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { name: normalized, section: "" };
  }

  return {
    name: parts[0],
    section: parts[parts.length - 1].toUpperCase(),
  };
};

const toIsoDate = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;

  const dmy = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
};

const normalizeCompact = (value: string) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const parseAmountFromText = (rawText: string, labels: string[]) => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped}[^\\d]{0,30}(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)`, "i");
    const match = rawText.match(regex);
    if (match?.[1]) {
      return Number(match[1].replace(/,/g, "")) || 0;
    }
  }

  return 0;
};

const parseAcademicYearFromText = (rawText: string) => {
  const match = rawText.match(/\b(20\d{2})\s*[-\/]\s*(20\d{2})\b/);
  if (!match) {
    return "";
  }

  return `${match[1]}-${match[2]}`;
};

const parseDueDateFromText = (rawText: string) => {
  const dueLine = rawText.match(/(?:due\s*date|last\s*date)[^\n\r]{0,40}/i)?.[0] || rawText;
  const dateMatch = dueLine.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/);
  if (!dateMatch) {
    return "";
  }

  return toIsoDate(dateMatch[0]);
};

const toClassLookup = (value: unknown): ClassLookup => {
  const record = toObjectRecord(value);
  return {
    _id: record._id,
    name: toOptionalString(record.name) || undefined,
    section: toOptionalString(record.section),
  };
};

const computeAssignmentAmountsFromStructure = (
  assignment: AssignmentRecord,
  studentRecord?: LooseRecord | null
) => {
  const structure = toObjectRecord(assignment.class_fee_structure_id) as StructureRecord;
  const hasStructureValues =
    assignment.class_fee_structure_id &&
    (structure.academic_fee !== undefined ||
      structure.default_transport_fee !== undefined ||
      structure.other_fee !== undefined);

  const needsTransport = studentRecord
    ? Boolean(
        studentRecord.needsTransport ||
          studentRecord.transport_status === "ACTIVE" ||
          studentRecord.transport_route_id
      )
    : false;

  const academicFee = hasStructureValues
    ? toNumberValue(structure.academic_fee)
    : toNumberValue(assignment.academic_fee);
  const transportFee = hasStructureValues
    ? (needsTransport ? toNumberValue(structure.default_transport_fee) : 0)
    : toNumberValue(assignment.transport_fee);
  const otherFee = hasStructureValues
    ? toNumberValue(structure.other_fee)
    : toNumberValue(assignment.other_fee);
  const discountAmount = toNumberValue(assignment.discount_amount);

  const totalFee = Math.max(academicFee + transportFee + otherFee - discountAmount, 0);
  const paidAmount = toNumberValue(assignment.paid_amount);
  const dueAmount = Math.max(totalFee - paidAmount, 0);

  return {
    academicFee,
    transportFee,
    otherFee,
    totalFee,
    paidAmount,
    dueAmount,
  };
};

const mapLegacyStudentAssignment = (value: unknown) => {
  const assignment = toObjectRecord(value) as AssignmentRecord;
  const studentRecord = toObjectRecord(assignment.student_id);
  const amounts = computeAssignmentAmountsFromStructure(assignment, studentRecord);
  const studentShape = assignment.student_id
    ? {
        ...studentRecord,
        classId: toIdString(studentRecord.class_id),
        rollNumber: toStringValue(studentRecord.rollNumber) || toStringValue(studentRecord.roll_no),
      }
    : null;

  return {
    _id: assignment._id,
    student: studentShape,
    studentId: studentShape,
    academicFee: amounts.academicFee,
    transportFee: amounts.transportFee,
    otherFee: amounts.otherFee,
    totalFee: amounts.totalFee,
    paidAmount: amounts.paidAmount,
    dueAmount: amounts.dueAmount,
    remainingAmount: amounts.dueAmount,
    status: toStringValue(assignment.fee_status).toLowerCase(),
    dueDate: assignment.due_date,
    lastPaymentDate: assignment.last_payment_date,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
    financeId: assignment._id,
  };
};

const mapLegacyClassFeeStructure = (
  value: unknown,
  classMap: Map<string, ClassLookup>
) => {
  const structure = toObjectRecord(value) as ClassFeeStructureRecord;
  const classId = toIdString(structure.class_id);
  const classDoc = classMap.get(classId);
  const className = classDoc?.name || toStringValue(structure.class_name) || toStringValue(structure.className);
  const section = classDoc?.section || toOptionalString(structure.section) || "";

  return {
    ...structure,
    classId,
    className,
    classLabel: buildClassLabel(className, section) || className,
    section,
    amount: toNumberValue(structure.academic_fee),
    academicFee: toNumberValue(structure.academic_fee),
    transportFee: toNumberValue(structure.default_transport_fee),
    defaultTransportFee: toNumberValue(structure.default_transport_fee),
    otherFee: toNumberValue(structure.other_fee),
    dueDate: toStringValue(structure.due_date),
    academicYear: toStringValue(structure.academic_year),
  };
};

const buildClassLabel = (name?: string | null, section?: string | null) =>
  [String(name || "").trim(), String(section || "").trim()].filter(Boolean).join(" - ");

const mapPaymentToReceipt = (payment: unknown): ReceiptRecord => {
  const record = toObjectRecord(payment);

  return {
  receiptNumber: toStringValue(record.receipt_no),
  transactionId: toStringValue(record.reference_no) || toIdString(record._id),
  paymentDate: toStringValue(record.payment_date),
  amountPaid: toNumberValue(record.payment_amount),
  paymentType: toStringValue(record.payment_mode) || "cash",
  sentToEmail: false,
  createdAt: toOptionalString(record.created_at),
};
};

const buildAssignmentSummary = async (
  schoolId: string,
  studentId: string,
  classMap?: Map<string, ClassLookup>
) => {
  const assignment = await StudentFeeAssignment.findOne(asMongoFilter({
    school_id: new mongoose.Types.ObjectId(schoolId),
    student_id: new mongoose.Types.ObjectId(studentId),
  }))
    .populate("student_id", "name email class class_id section_id classSection rollNumber roll_no registration_no needsTransport")
    .populate("class_fee_structure_id")
    .sort({ created_at: -1 });

  if (!assignment) {
    return null;
  }

  const payments = await StudentFeePayment.find(asMongoFilter({
    school_id: new mongoose.Types.ObjectId(schoolId),
    student_fee_assignment_id: assignment._id,
  })).sort({ payment_date: 1, created_at: 1 });

  const student = toObjectRecord(assignment.student_id);
  const amounts = computeAssignmentAmountsFromStructure(toObjectRecord(assignment) as AssignmentRecord, student);
  const studentClassId = toIdString(student.class_id);
  const classDoc = classMap?.get(studentClassId);
  const classLabel = classDoc
    ? buildClassLabel(classDoc.name, classDoc.section) || classDoc.name
    : toStringValue(student.class);

  const paymentHistory = payments.map(mapPaymentToReceipt);
  const latestReceipt = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;

  const summary = {
    financeId: assignment._id,
    student: {
      ...student,
      class: classLabel || toStringValue(student.class),
      classId: studentClassId,
      rollNumber: toStringValue(student.rollNumber) || toStringValue(student.roll_no),
      needsTransport: Boolean(student.needsTransport),
    },
    studentId: {
      ...student,
      class: classLabel || toStringValue(student.class),
      classId: studentClassId,
      rollNumber: toStringValue(student.rollNumber) || toStringValue(student.roll_no),
      needsTransport: Boolean(student.needsTransport),
    },
    totalFee: amounts.totalFee,
    paidAmount: amounts.paidAmount,
    remainingAmount: amounts.dueAmount,
    pendingBalance: amounts.dueAmount,
    currentDueAmount: amounts.dueAmount,
    status: toStringValue(assignment.fee_status || "UNPAID").toLowerCase(),
    paymentStatus: toStringValue(assignment.fee_status || "UNPAID").toLowerCase(),
    dueDate: toOptionalString(assignment.due_date),
    effectiveDueDate: toOptionalString(assignment.due_date),
    academicYear: toOptionalString(assignment.academic_year),
    feeComponents: [
      ...(amounts.academicFee > 0
        ? [{ label: "Academic Fee", amount: amounts.academicFee }]
        : []),
      ...(amounts.transportFee > 0
        ? [{ label: "Transport Fee", amount: amounts.transportFee }]
        : []),
      ...(amounts.otherFee > 0
        ? [{ label: "Other Fee", amount: amounts.otherFee }]
        : []),
    ],
    latestReceipt,
    paymentHistory,
  };

  return {
    summary,
    assignment,
    student,
    payments,
  };
};

// ============================
// CLASS FEE STRUCTURE ENDPOINTS
// ============================

/**
 * POST /api/finance/class-fee-structures
 * Create a new class fee structure and auto-assign to students
 */
router.post("/class-fee-structures", async (req: Request, res: Response) => {
  try {
    const {
      schoolId,
      class_id,
      section_id,
      academic_year,
      academic_fee,
      default_transport_fee,
      other_fee,
      fee_breakdown,
      due_date,
      created_by,
      late_fee_type,
      late_fee_amount,
      late_fee_description,
      late_fee_grace_days,
    } = req.body;

    // Validation
    if (!schoolId || !class_id || !academic_year || academic_fee === undefined || default_transport_fee === undefined || !due_date) {
      return res.status(400).json({
        error: "Missing required fields: schoolId, class_id, academic_year, academic_fee, default_transport_fee, due_date",
      });
    }

    // Ensure at least one valid fee component
    const numericAcademicFee = Number(academic_fee);
    const numericTransportFee = Number(default_transport_fee);
    const numericOtherFee = Number(other_fee) || 0;
    const normalizedFeeBreakdown: Array<{ label: string; amount: number }> = Array.isArray(fee_breakdown)
      ? fee_breakdown
          .filter((item: unknown) => item && typeof item === "object")
          .map((item: Record<string, unknown>) => ({ label: String(item.label || "").trim(), amount: Math.max(Number(item.amount) || 0, 0) }))
          .filter((item) => item.label && item.amount > 0)
      : [];
    const breakdownTotal = normalizedFeeBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const normalizedLateFeeTypeRaw = String(late_fee_type || "none").toLowerCase();
    const normalizedLateFeeType =
      normalizedLateFeeTypeRaw === "per_day"
        ? "daily"
        : normalizedLateFeeTypeRaw === "fixed" || normalizedLateFeeTypeRaw === "daily" || normalizedLateFeeTypeRaw === "percentage"
          ? normalizedLateFeeTypeRaw
          : "none";
    const normalizedLateFeeAmount = Math.max(Number(late_fee_amount) || 0, 0);
    const normalizedLateFeeGraceDays = Math.max(Math.floor(Number(late_fee_grace_days) || 0), 0);

    if (numericAcademicFee <= 0 && numericTransportFee <= 0 && numericOtherFee <= 0 && breakdownTotal <= 0) {
      return res.status(400).json({
        error: "Add at least one valid fee component",
        message: "At least one of academic fee, transport fee, other fee, or breakdown item must be greater than 0",
      });
    }

    const result = await financeService.saveClassFeeStructure(schoolId, {
      class_id,
      section_id: section_id || null,
      academic_year,
      academic_fee: numericAcademicFee,
      default_transport_fee: numericTransportFee,
      other_fee: numericOtherFee,
      fee_breakdown: normalizedFeeBreakdown,
      due_date,
      created_by,
      late_fee_type: normalizedLateFeeType,
      late_fee_amount: normalizedLateFeeAmount,
      late_fee_description: String(late_fee_description || "").trim(),
      late_fee_grace_days: normalizedLateFeeGraceDays,
    });

    await createLog({
      action: "CREATE_CLASS_FEE_STRUCTURE",
      message: `Class fee structure created: ${class_id} (${academic_year}) - ${result.assignedCount} students assigned`,
      schoolId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("CREATE CLASS FEE STRUCTURE ERROR:", error);
    res.status(500).json({
      error: "Failed to create class fee structure",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * PUT /api/finance/class-fee-structures/:id
 * Update a class fee structure and sync assignments
 */
router.put("/class-fee-structures/:id", async (req: Request, res: Response) => {
  try {
    const id = getSingleString(req.params.id);
    const {
      schoolId,
      academic_fee,
      default_transport_fee,
      other_fee,
      fee_breakdown,
      due_date,
      late_fee_type,
      late_fee_amount,
      late_fee_description,
      late_fee_grace_days,
    } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    // Fetch structure
    const structure = await ClassFeeStructure.findById(id);
    if (!structure) {
      return res.status(404).json({ error: "Class fee structure not found" });
    }

    // Update structure
    if (academic_fee !== undefined) structure.academic_fee = academic_fee;
    if (default_transport_fee !== undefined) structure.default_transport_fee = default_transport_fee;
    if (other_fee !== undefined) structure.other_fee = other_fee;
    if (Array.isArray(fee_breakdown)) {
      const cleaned = fee_breakdown
        .filter((item: unknown) => item && typeof item === "object")
        .map((item: Record<string, unknown>) => ({ label: String(item.label || "").trim(), amount: Math.max(Number(item.amount) || 0, 0) }))
        .filter((item) => item.label && item.amount > 0);
      structure.set("fee_breakdown", cleaned);
    }
    if (due_date) structure.due_date = due_date;
    if (late_fee_type !== undefined) {
      const normalizedLateFeeTypeRaw = String(late_fee_type || "none").toLowerCase();
      const normalizedLateFeeType =
        normalizedLateFeeTypeRaw === "per_day"
          ? "daily"
          : normalizedLateFeeTypeRaw === "fixed" || normalizedLateFeeTypeRaw === "daily" || normalizedLateFeeTypeRaw === "percentage"
            ? normalizedLateFeeTypeRaw
            : "none";
      structure.set("late_fee_type", normalizedLateFeeType);
    }
    if (late_fee_amount !== undefined) structure.set("late_fee_amount", Math.max(Number(late_fee_amount) || 0, 0));
    if (late_fee_description !== undefined) structure.set("late_fee_description", String(late_fee_description || "").trim());
    if (late_fee_grace_days !== undefined) structure.set("late_fee_grace_days", Math.max(Math.floor(Number(late_fee_grace_days) || 0), 0));

    await structure.save();

    // Refresh structure from DB to ensure all data is current
    const updatedStructure = await ClassFeeStructure.findById(id);
    if (!updatedStructure) {
      return res.status(404).json({ error: "Failed to refresh class fee structure" });
    }

    const syncResult = await financeService.syncStudentAssignmentsForStructure(
      schoolId,
      updatedStructure
    );
    const syncedCount = syncResult.assignedCount;

    await createLog({
      action: "UPDATE_CLASS_FEE_STRUCTURE",
      message: `Class fee structure updated: ${id} - ${syncedCount} assignments synced`,
      schoolId,
    });

    res.json({
      success: true,
      data: {
        structure: updatedStructure.toObject?.() || updatedStructure,
        syncedCount,
      },
    });
  } catch (error) {
    console.error("UPDATE CLASS FEE STRUCTURE ERROR:", error);
    res.status(500).json({
      error: "Failed to update class fee structure",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * DELETE /api/finance/class-fee-structures/:id
 * Delete a class fee structure and associated assignments
 */
router.delete("/class-fee-structures/:id", async (req: Request, res: Response) => {
  try {
    const id = getSingleString(req.params.id);
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    // Fetch structure to verify it exists
    const structure = await ClassFeeStructure.findById(id);
    if (!structure) {
      return res.status(404).json({ error: "Class fee structure not found" });
    }

    // Delete associated student fee assignments
    const deleteResult = await StudentFeeAssignment.deleteMany({
      class_fee_structure_id: id,
    });

    // Delete the structure itself
    await ClassFeeStructure.findByIdAndDelete(id);

    await createLog({
      action: "DELETE_CLASS_FEE_STRUCTURE",
      message: `Class fee structure deleted: ${id} - ${deleteResult.deletedCount} assignments removed`,
      schoolId,
    });

    res.json({
      success: true,
      data: {
        deletedStructure: structure.toObject?.() || structure,
        deletedAssignments: deleteResult.deletedCount,
      },
    });
  } catch (error) {
    console.error("DELETE CLASS FEE STRUCTURE ERROR:", error);
    res.status(500).json({
      error: "Failed to delete class fee structure",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/class-fee-structures
 * Get all class fee structures with stats
 */
router.get("/class-fee-structures", async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;

    const schoolIdStr = getSingleString(schoolId);

    if (!schoolIdStr) {
      return res.status(400).json({ error: "schoolId query parameter is required" });
    }

    const structures = await financeService.getClassFeeStructuresWithStats(schoolIdStr);

    res.json({
      success: true,
      data: structures,
    });
  } catch (error) {
    console.error("GET CLASS FEE STRUCTURES ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch class fee structures",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/class-fee-structures/:id
 * Get a specific class fee structure
 */
router.get("/class-fee-structures/:id", async (req: Request, res: Response) => {
  try {
    const id = getSingleString(req.params.id);

    const structure = await ClassFeeStructure.findById(id);
    if (!structure) {
      return res.status(404).json({ error: "Class fee structure not found" });
    }

    res.json({
      success: true,
      data: structure,
    });
  } catch (error) {
    console.error("GET CLASS FEE STRUCTURE ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch class fee structure",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/fee-structure-ai-preview
 * Upload an image and generate OCR-based preview for class fee structure
 */
router.post("/fee-structure-ai-preview", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const schoolIdStr = getSingleString(req.body?.schoolId);
    if (!schoolIdStr) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Upload file is required" });
    }

    if (!String(req.file.mimetype || "").startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are supported for OCR preview" });
    }

    const classes = await Class.find({ schoolId: new mongoose.Types.ObjectId(schoolIdStr) })
      .select("_id name section")
      .sort({ name: 1, section: 1 });

    const classChoices = classes.map((value) => {
      const record = toObjectRecord(value);
      const label = buildClassLabel(toStringValue(record.name), toOptionalString(record.section));
      return {
        class_id: toIdString(record._id),
        class_label: label,
      };
    });

    const worker = await createWorker("eng");
    const recognition = await worker.recognize(req.file.buffer);
    await worker.terminate();

    const rawText = toStringValue(recognition?.data?.text);
    const compactText = normalizeCompact(rawText);

    let classLabel = "";
    let classDoc: LooseRecord | null = null;

    for (const choice of classChoices) {
      const label = toStringValue(choice.class_label);
      if (!label) continue;
      if (compactText.includes(normalizeCompact(label))) {
        classLabel = label;
        classDoc = choice;
        break;
      }
    }

    if (!classLabel) {
      const fallback = rawText.match(/\b(?:CLASS|GRADE|STD|STANDARD)\s*[:\-]?\s*([A-Z0-9 ]+(?:\s*-\s*[A-Z0-9]+)?)/i);
      classLabel = String(fallback?.[1] || "").trim();
    }

    const parsedClass = parseClassLabel(classLabel);
    if (!classDoc && classLabel) {
      const matchedClass = await Class.findOne({
        schoolId: new mongoose.Types.ObjectId(schoolIdStr),
        name: parsedClass.name,
        ...(parsedClass.section ? { section: parsedClass.section } : {}),
      });

      if (matchedClass) {
        classDoc = toObjectRecord(matchedClass);
      } else {
        const fallbackClass = await Class.findOne({
          schoolId: new mongoose.Types.ObjectId(schoolIdStr),
          name: classLabel,
        });
        classDoc = fallbackClass ? toObjectRecord(fallbackClass) : null;
      }
    }

    const academicFee = parseAmountFromText(rawText, ["academic fee", "tuition fee", "annual fee", "academic"]);
    const transportFee = parseAmountFromText(rawText, ["transport fee", "bus fee", "transport"]);
    const otherFee = parseAmountFromText(rawText, ["other fee", "misc fee", "miscellaneous", "development fee"]);
    const academicYear = parseAcademicYearFromText(rawText);
    const dueDate = parseDueDateFromText(rawText);

    const detectedFields = [
      classLabel ? 1 : 0,
      academicYear ? 1 : 0,
      dueDate ? 1 : 0,
      academicFee > 0 ? 1 : 0,
      transportFee > 0 || otherFee > 0 ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);

    const notes: string[] = [];
    if (!classLabel) notes.push("Class could not be confidently detected from image text");
    if (!academicYear) notes.push("Academic year not detected");
    if (!dueDate) notes.push("Due date not detected");
    if (academicFee <= 0 && transportFee <= 0 && otherFee <= 0) {
      notes.push("Fee amounts not detected confidently");
    }

    const preview = {
      classLabel,
      class_id: classDoc ? toIdString(classDoc._id) : "",
      academic_year: academicYear,
      due_date: dueDate,
      academic_fee: academicFee,
      default_transport_fee: transportFee,
      other_fee: otherFee,
      confidence: Number((detectedFields / 5).toFixed(2)),
      notes,
      rawExtract: rawText,
    };

    res.json({ success: true, data: { preview } });
  } catch (error) {
    console.error("FEE STRUCTURE OCR PREVIEW ERROR:", error);
    res.status(500).json({
      error: "Failed to generate fee structure preview",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/fee-structure-ai-apply
 * Confirm AI preview and apply/save class fee structure
 */
router.post("/fee-structure-ai-apply", async (req: Request, res: Response) => {
  try {
    const schoolIdStr = getSingleString(req.body?.schoolId);
    const preview = toObjectRecord(req.body?.preview);

    if (!schoolIdStr) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const classId = toStringValue(preview.class_id).trim();
    const academicYear = toStringValue(preview.academic_year).trim();
    const dueDate = toIsoDate(preview.due_date);
    const academicFee = toNumberValue(preview.academic_fee);
    const transportFee = toNumberValue(preview.default_transport_fee);
    const otherFee = toNumberValue(preview.other_fee);

    if (!classId || !academicYear || !dueDate) {
      return res.status(400).json({
        error: "Preview is incomplete. class_id, academic_year and due_date are required",
      });
    }

    if (academicFee <= 0 && transportFee <= 0 && otherFee <= 0) {
      return res.status(400).json({
        error: "Add at least one valid fee component",
      });
    }

    const result = await financeService.saveClassFeeStructure(schoolIdStr, {
      class_id: classId,
      section_id: null,
      academic_year: academicYear,
      academic_fee: academicFee,
      default_transport_fee: transportFee,
      other_fee: otherFee,
      due_date: dueDate,
    });

    res.json({
      success: true,
      data: {
        applied: true,
        assignedCount: result.assignedCount,
        structure: result.structure,
      },
    });
  } catch (error) {
    console.error("FEE STRUCTURE AI APPLY ERROR:", error);
    res.status(500).json({
      error: "Failed to apply fee structure",
      message: error instanceof Error ? error.message : "",
    });
  }
});

// ============================
// STUDENT FEE ASSIGNMENT ENDPOINTS
// ============================

/**
 * GET /api/finance/student-fee-assignments
 * Get student fee assignments with filters
 */
router.get("/student-fee-assignments", async (req: Request, res: Response) => {
  try {
    const { schoolId, class_id, section_id, academic_year, search } = req.query;

    const schoolIdStr = getSingleString(schoolId);
    const classIdStr = getOptionalString(class_id);
    const sectionIdStr = getOptionalString(section_id);
    const academicYearStr = getOptionalString(academic_year);
    const searchStr = getOptionalString(search);

    if (!schoolIdStr) {
      return res.status(400).json({ error: "schoolId query parameter is required" });
    }

    const assignments = await financeService.getStudentFeeAssignments(schoolIdStr, {
      class_id: classIdStr,
      section_id: sectionIdStr,
      academic_year: academicYearStr,
      search: searchStr,
    });

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error("GET STUDENT FEE ASSIGNMENTS ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch student fee assignments",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/student-fee-assignments/:id
 * Get a specific student fee assignment with payments
 */
router.get("/student-fee-assignments/:id", async (req: Request, res: Response) => {
  try {
    const id = getSingleString(req.params.id);

    const assignment = await StudentFeeAssignment.findById(id)
      .populate("student_id")
      .populate("class_fee_structure_id");

    if (!assignment) {
      return res.status(404).json({ error: "Fee assignment not found" });
    }

    const payments = await StudentFeePayment.find({
      student_fee_assignment_id: id,
    }).sort({ payment_date: -1 });

    res.json({
      success: true,
      data: {
        assignment,
        payments,
      },
    });
  } catch (error) {
    console.error("GET STUDENT FEE ASSIGNMENT ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch fee assignment",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/student-fee-assignments/ensure
 * Ensure a student has a fee assignment for the active class structure
 */
router.post("/student-fee-assignments/ensure", async (req: Request, res: Response) => {
  try {
    const { schoolId, student_id, class_id, class_name, academic_year } = req.body || {};
    const schoolIdStr = getSingleString(schoolId);
    const studentIdStr = getSingleString(student_id);
    const classIdStr = getOptionalString(class_id);
    const classNameStr = getOptionalString(class_name);
    const academicYearStr = getOptionalString(academic_year);

    if (!schoolIdStr || !studentIdStr) {
      return res.status(400).json({
        error: "Missing required fields: schoolId, student_id",
      });
    }

    const student = await Student.findById(studentIdStr).select("class_id class");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentRecord = toObjectRecord(student) as LooseRecord;
    let effectiveClassId = classIdStr || toIdString(studentRecord.class_id);

    if (!effectiveClassId) {
      const classLabel = classNameStr || getOptionalString(studentRecord.class);
      if (classLabel) {
        const normalizedLabel = classLabel.replace(/\s+/g, " ").trim();
        const parts = normalizedLabel.split("-").map((part) => part.trim()).filter(Boolean);
        const namePart = parts[0] || normalizedLabel;
        const sectionPart = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : undefined;

        let classDoc = await Class.findOne({
          schoolId: new mongoose.Types.ObjectId(schoolIdStr),
          name: namePart,
          ...(sectionPart ? { section: sectionPart } : {}),
        });

        if (!classDoc) {
          classDoc = await Class.findOne({
            schoolId: new mongoose.Types.ObjectId(schoolIdStr),
            name: normalizedLabel,
          });
        }

        if (classDoc) {
          effectiveClassId = toIdString(classDoc._id);
        }
      }
    }

    if (!effectiveClassId) {
      return res.status(400).json({ error: "Unable to resolve student class" });
    }

    const structureQuery: LooseRecord = {
      school_id: new mongoose.Types.ObjectId(schoolIdStr),
      class_id: effectiveClassId,
      is_active: true,
    };
    if (academicYearStr) {
      structureQuery.academic_year = academicYearStr;
    }

    const structure = await ClassFeeStructure.findOne(asMongoFilter(structureQuery)).sort({ updated_at: -1, created_at: -1 });
    if (!structure) {
      return res.status(404).json({ error: "No active fee structure found for this class" });
    }

    const structureRecord = toObjectRecord(structure);
    const ensured = await financeService.createOrUpdateStudentFeeAssignment(
      schoolIdStr,
      studentIdStr,
      toIdString(structureRecord._id),
      toStringValue(structureRecord.academic_year),
      undefined,
      toObjectRecord(student)
    );

    const assignment = await StudentFeeAssignment.findById(toIdString((ensured as LooseRecord)._id))
      .populate("student_id", "name class class_id roll_no registration_no section_id transport_status needsTransport")
      .populate("class_fee_structure_id");

    res.json({
      success: true,
      data: {
        assignment,
      },
    });
  } catch (error) {
    console.error("ENSURE STUDENT FEE ASSIGNMENT ERROR:", error);
    res.status(500).json({
      error: "Failed to ensure student fee assignment",
      message: error instanceof Error ? error.message : "",
    });
  }
});

// ============================
// STUDENT FEE PAYMENT ENDPOINTS
// ============================

/**
 * POST /api/finance/student-fee-payments
 * Record a student payment
 */
router.post("/student-fee-payments", async (req: Request, res: Response) => {
  try {
    const {
      schoolId,
      student_fee_assignment_id,
      payment_date,
      payment_amount,
      payment_mode,
      reference_no,
      remarks,
      created_by,
      include_past_dues,
    } = req.body;

    // Validation
    if (!schoolId || !student_fee_assignment_id || !payment_date || !payment_amount) {
      return res.status(400).json({
        error: "Missing required fields: schoolId, student_fee_assignment_id, payment_date, payment_amount",
      });
    }

    const result = await financeService.recordPayment(schoolId, student_fee_assignment_id, {
      payment_date,
      payment_amount: Number(payment_amount),
      payment_mode: payment_mode || "cash",
      reference_no: reference_no || "",
      remarks: remarks || "",
      created_by,
      include_past_dues: Boolean(include_past_dues),
    });

    await createLog({
      action: "RECORD_STUDENT_PAYMENT",
      message: `Payment recorded: ${result.receipt_no} - Amount: ${payment_amount}`,
      schoolId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("RECORD PAYMENT ERROR:", error);
    res.status(500).json({
      error: "Failed to record payment",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/student-fee-payments/:studentId
 * Get payment history for a student
 */
router.get("/student-fee-payments/:studentId", async (req: Request, res: Response) => {
  try {
    const studentId = getSingleString(req.params.studentId);
    const { schoolId } = req.query;

    const schoolIdStr = getSingleString(schoolId);

    if (!schoolIdStr) {
      return res.status(400).json({ error: "schoolId query parameter is required" });
    }

    const payments = await financeService.getStudentPaymentHistory(schoolIdStr, studentId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("GET STUDENT PAYMENT HISTORY ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch payment history",
      message: error instanceof Error ? error.message : "",
    });
  }
});

// ============================
// STUDENT TRANSPORT STATUS ENDPOINT
// ============================

/**
 * PATCH /api/finance/students/:studentId/transport-status
 * Update student transport status and recalculate fees
 */
router.patch("/students/:studentId/transport-status", async (req: Request, res: Response) => {
  try {
    const studentId = getSingleString(req.params.studentId);
    const { schoolId, transport_status } = req.body;
    const schoolIdStr = getSingleString(schoolId);
    const transportStatusStr = getSingleString(transport_status);

    if (!schoolIdStr || !transportStatusStr) {
      return res.status(400).json({
        error: "Missing required fields: schoolId, transport_status",
      });
    }

    const result = await financeService.updateStudentTransportStatus(schoolIdStr, studentId, transportStatusStr);

    await createLog({
      action: "UPDATE_STUDENT_TRANSPORT_STATUS",
      message: `Transport status updated: ${transportStatusStr} - ${result.updatedAssignments} assignments recalculated`,
      schoolId: schoolIdStr,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("UPDATE TRANSPORT STATUS ERROR:", error);
    res.status(500).json({
      error: "Failed to update transport status",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/student-fee-assignments/:assignmentId/apply-late-fee
 * Apply late fee charge to an overdue student fee assignment
 */
router.post("/student-fee-assignments/:assignmentId/apply-late-fee", async (req: Request, res: Response) => {
  try {
    const assignmentId = getSingleString(req.params.assignmentId);
    const { schoolId, lateFeeAmount, reason } = req.body;

    const schoolIdStr = getSingleString(schoolId);
    const lateFeeValue = toNumberValue(lateFeeAmount);
    const reasonStr = toOptionalString(reason) || "Late payment penalty";

    if (!schoolIdStr || !assignmentId) {
      return res.status(400).json({
        error: "Missing required fields: schoolId and assignmentId",
      });
    }

    if (lateFeeValue <= 0) {
      return res.status(400).json({
        error: "Late fee amount must be greater than 0",
      });
    }

    // Fetch the assignment
    const assignment = await StudentFeeAssignment.findById(assignmentId)
      .populate("student_id", "name rollNumber class")
      .populate("class_fee_structure_id");

    if (!assignment) {
      return res.status(404).json({
        error: "Fee assignment not found",
      });
    }

    // Verify school ownership
    if (toIdString(assignment.school_id) !== schoolIdStr) {
      return res.status(403).json({
        error: "Unauthorized: Assignment does not belong to this school",
      });
    }

    // Check if already has late fee
    if (toNumberValue((assignment as any).late_fee_amount) > 0) {
      return res.status(400).json({
        error: "Late fee already applied to this assignment",
        currentLateFee: (assignment as any).late_fee_amount,
      });
    }

    // Check if fee is actually overdue
    const dueDate = toOptionalString(assignment.due_date);
    if (dueDate) {
      const dueTime = new Date(dueDate).getTime();
      if (dueTime > Date.now()) {
        return res.status(400).json({
          error: "Cannot apply late fee to a fee that is not yet due",
          dueDate,
        });
      }
    }

    // Apply late fee
    (assignment as any).late_fee_amount = lateFeeValue;
    (assignment as any).late_fee_applied_date = new Date().toISOString().split("T")[0];
    (assignment as any).late_fee_reason = reasonStr;

    // Update total fee to include late fee
    const originalTotalFee = toNumberValue(assignment.total_fee);
    (assignment as any).total_fee = originalTotalFee + lateFeeValue;

    // Recalculate due amount
    const paidAmount = toNumberValue(assignment.paid_amount);
    const newTotalFee = originalTotalFee + lateFeeValue;
    (assignment as any).due_amount = Math.max(newTotalFee - paidAmount, 0);

    // Update fee status if needed
    if ((assignment as any).fee_status === "UNPAID" || (assignment as any).fee_status === "PARTIAL") {
      (assignment as any).fee_status = "OVERDUE";
    }

    await assignment.save();

    // Log the action
    const student = toObjectRecord(assignment.student_id);
    await createLog({
      action: "APPLY_LATE_FEE",
      message: `Late fee applied to student ${toStringValue(student.name)}: ₹${lateFeeValue} - Reason: ${reasonStr}`,
      schoolId: schoolIdStr,
    });

    res.json({
      success: true,
      message: "Late fee applied successfully",
      data: {
        assignmentId,
        lateFeeAmount: lateFeeValue,
        lateFeeAppliedDate: (assignment as any).late_fee_applied_date,
        newTotalFee: assignment.total_fee,
        newDueAmount: assignment.due_amount,
      },
    });
  } catch (error) {
    console.error("APPLY LATE FEE ERROR:", error);
    res.status(500).json({
      error: "Failed to apply late fee",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/student-fee-assignments/:assignmentId/late-fee-status
 * Get late fee status for a student fee assignment
 */
router.get("/student-fee-assignments/:assignmentId/late-fee-status", async (req: Request, res: Response) => {
  try {
    const assignmentId = getSingleString(req.params.assignmentId);
    const { schoolId } = req.query;
    const schoolIdStr = getSingleString(schoolId);

    if (!assignmentId || !schoolIdStr) {
      return res.status(400).json({
        error: "Missing required parameters: assignmentId, schoolId",
      });
    }

    const assignment = await StudentFeeAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        error: "Fee assignment not found",
      });
    }

    if (toIdString(assignment.school_id) !== schoolIdStr) {
      return res.status(403).json({
        error: "Unauthorized: Assignment does not belong to this school",
      });
    }

    const dueDate = toOptionalString(assignment.due_date);
    const isOverdue = dueDate ? new Date(dueDate).getTime() < Date.now() : false;
    const lateFeeAmount = toNumberValue((assignment as any).late_fee_amount);

    res.json({
      success: true,
      data: {
        assignmentId,
        dueDate,
        isOverdue,
        hasLateFee: lateFeeAmount > 0,
        lateFeeAmount,
        lateFeeAppliedDate: (assignment as any).late_fee_applied_date,
        lateFeeReason: (assignment as any).late_fee_reason,
        totalFee: assignment.total_fee,
        paidAmount: assignment.paid_amount,
        dueAmount: assignment.due_amount,
        feeStatus: assignment.fee_status,
      },
    });
  } catch (error) {
    console.error("GET LATE FEE STATUS ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch late fee status",
      message: error instanceof Error ? error.message : "",
    });
  }
});

// ============================
// SUMMARY/DASHBOARD ENDPOINTS
// ============================

/**
 * GET /api/finance/class/:classId/summary
 * Get fee summary for all students in a class
 */
router.get("/class/:classId/summary", async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { schoolId, academic_year } = req.query;

    // Convert to strings (handle array case)
    const schoolIdStr = getSingleString(schoolId);
    const academicYearStr = getSingleString(academic_year);

    if (!schoolIdStr || !academicYearStr) {
      return res.status(400).json({
        error: "schoolId and academic_year query parameters are required",
      });
    }

    const assignments = await StudentFeeAssignment.find(asMongoFilter({
      school_id: new mongoose.Types.ObjectId(schoolIdStr),
      academic_year: academicYearStr,
    }))
      .populate("student_id", "name roll_no registration_no class_id section_id")
      .populate("class_fee_structure_id");

    // Filter by class ID
    const filteredAssignments = assignments.filter((value) => {
      const assignment = toObjectRecord(value) as AssignmentRecord;
      const student = toObjectRecord(assignment.student_id);
      return toIdString(student.class_id) === classId;
    });

    // Calculate summary stats
    const totalStudents = filteredAssignments.length;
    const paidCount = filteredAssignments.filter((value) => toStringValue((toObjectRecord(value) as AssignmentRecord).fee_status) === "PAID").length;
    const pendingCount = filteredAssignments.filter((value) => {
      const feeStatus = toStringValue((toObjectRecord(value) as AssignmentRecord).fee_status);
      return feeStatus === "UNPAID" || feeStatus === "PARTIAL";
    }).length;
    const totalFeeCollectable = filteredAssignments.reduce((sum: number, value) => sum + toNumberValue((toObjectRecord(value) as AssignmentRecord).total_fee), 0);
    const totalFeeCollected = filteredAssignments.reduce((sum: number, value) => sum + toNumberValue((toObjectRecord(value) as AssignmentRecord).paid_amount), 0);
    const totalPending = filteredAssignments.reduce((sum: number, value) => sum + toNumberValue((toObjectRecord(value) as AssignmentRecord).due_amount), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          paidCount,
          pendingCount,
          totalFeeCollectable,
          totalFeeCollected,
          totalPending,
          collectionPercentage: totalFeeCollectable > 0 ? ((totalFeeCollected / totalFeeCollectable) * 100).toFixed(2) : 0,
        },
        assignments: filteredAssignments,
      },
    });
  } catch (error) {
    console.error("GET CLASS FEE SUMMARY ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch class fee summary",
      message: error instanceof Error ? error.message : "",
    });
  }
});

// ============================
// LEGACY ENDPOINTS (Backwards Compatibility)
// ============================

/**
 * GET /api/finance/:schoolId/students/summary
 * Legacy endpoint - redirects to new API
 */
router.get("/:schoolId/students/summary", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    // Use service layer so overdue late fee is auto-applied consistently.
    const assignments = await financeService.getStudentFeeAssignments(schoolId, {});

    // Transform snake_case to camelCase
    const transformed = assignments.map(mapLegacyStudentAssignment);

    res.json(transformed);
  } catch (error) {
    console.error("GET STUDENTS SUMMARY ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch student summaries",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance
 * Create a new Finance record (staff_salary or other type)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { type, staffId, amount, paidAmount, paymentDate, status, description, academicYear, schoolId, recordPaymentEntry } = req.body as {
      type: "student_fee" | "staff_salary" | "other";
      staffId?: string;
      amount?: number;
      paidAmount?: number;
      paymentDate?: string;
      status?: "pending" | "partial" | "paid" | "overdue";
      description?: string;
      academicYear?: string;
      schoolId: string;
      recordPaymentEntry?: boolean;
    };

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid or missing schoolId" });
    }
    if (!type) {
      return res.status(400).json({ message: "type is required" });
    }

    const doc = await Finance.create({
      type,
      staffId: staffId ? new mongoose.Types.ObjectId(staffId) : undefined,
      amount: Number(amount) || 0,
      paidAmount: Number(paidAmount) || 0,
      paymentDate: paymentDate ?? null,
      status: status ?? "pending",
      description: description ?? "",
      academicYear: academicYear ?? "",
      schoolId: new mongoose.Types.ObjectId(schoolId),
    });

    if (type === "staff_salary" && recordPaymentEntry && Number(paidAmount) > 0) {
      await Finance.findByIdAndUpdate(doc._id, {
        $push: {
          paymentHistory: {
            receiptNumber: `SAL-${Date.now()}`,
            transactionId: `SALTXN-${Date.now()}`,
            paymentDate: paymentDate || new Date().toISOString().split("T")[0],
            amountPaid: Number(paidAmount),
            paymentType: "cash",
            sentToEmail: false,
            createdAt: new Date().toISOString(),
          },
        },
      } as any);
    }

    res.status(201).json(doc);
  } catch (error) {
    console.error("POST FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to create finance record", error: error instanceof Error ? error.message : "" });
  }
});

/**
 * PUT /api/finance/:id
 * Update an existing Finance record (salary set/pay)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = getSingleString(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid finance record id" });
    }

    const { amount, paidAmount, paymentDate, status, description, academicYear, recordPaymentEntry } = req.body as Record<string, unknown>;

    const existing = await Finance.findById(id).select("type");
    if (!existing) return res.status(404).json({ message: "Finance record not found" });

    const updates: Record<string, unknown> = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (paidAmount !== undefined) updates.paidAmount = Number(paidAmount);
    if (paymentDate !== undefined) updates.paymentDate = String(paymentDate || "");
    if (status !== undefined) updates.status = String(status || "pending");
    if (description !== undefined) updates.description = String(description || "");
    if (academicYear !== undefined) updates.academicYear = String(academicYear || "");

    const updateOps: any = { $set: updates };
    if (existing.type === "staff_salary" && Boolean(recordPaymentEntry) && Number(paidAmount) > 0) {
      updateOps.$push = {
        paymentHistory: {
          receiptNumber: `SAL-${Date.now()}`,
          transactionId: `SALTXN-${Date.now()}`,
          paymentDate: String(paymentDate || new Date().toISOString().split("T")[0]),
          amountPaid: Number(paidAmount),
          paymentType: "cash",
          sentToEmail: false,
          createdAt: new Date().toISOString(),
        },
      };
    }

    const doc = await Finance.findByIdAndUpdate(id, updateOps, { new: true });
    if (!doc) return res.status(404).json({ message: "Finance record not found" });

    res.json(doc);
  } catch (error) {
    console.error("PUT FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to update finance record", error: error instanceof Error ? error.message : "" });
  }
});

/**
 * GET /api/finance/:schoolId/staff/summary
 * Returns all staff for a school joined with their salary Finance records.
 */
router.get("/:schoolId/staff/summary", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ error: "Invalid schoolId" });
    }

    const [staffList, salaryRecords] = await Promise.all([
      Staff.find({ schoolId }).select("_id name email phone position department avatar image photo bankName accountNumber ifscCode accountHolderName").lean(),
      Finance.find({ schoolId, type: "staff_salary" }).sort({ createdAt: -1 }).lean(),
    ]);

    // Map staffId -> latest salary record
    const salaryByStaff = new Map<string, typeof salaryRecords[number]>();
    for (const rec of salaryRecords) {
      const sid = rec.staffId?.toString();
      if (sid && !salaryByStaff.has(sid)) {
        salaryByStaff.set(sid, rec);
      }
    }

    const currentYear = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

    const summaries = staffList.map((staff) => {
      const sid = (staff._id as mongoose.Types.ObjectId).toString();
      const rec = salaryByStaff.get(sid);
      return {
        financeId: rec?._id?.toString() ?? null,
        staffId: {
          _id: sid,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          position: staff.position,
          department: staff.department,
          avatar: (staff as Record<string, unknown>).avatar,
          image: (staff as Record<string, unknown>).image,
          photo: (staff as Record<string, unknown>).photo,
          bankName: (staff as Record<string, unknown>).bankName,
          accountNumber: (staff as Record<string, unknown>).accountNumber,
          ifscCode: (staff as Record<string, unknown>).ifscCode,
          accountHolderName: (staff as Record<string, unknown>).accountHolderName,
        },
        salary: rec?.amount ?? 0,
        paidAmount: rec?.paidAmount ?? 0,
        status: rec?.status ?? "pending",
        paymentDate: rec?.paymentDate ?? null,
        academicYear: rec?.academicYear ?? currentYear,
      };
    });

    res.json(summaries);
  } catch (error) {
    console.error("GET STAFF SUMMARY ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch staff summaries",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/:schoolId/staff/:staffId/salary-report
 * Detailed salary report with bank details and dated transaction history.
 */
router.get("/:schoolId/staff/:staffId/salary-report", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const staffId = getSingleString(req.params.staffId);

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }
    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staffId" });
    }

    const staff = await Staff.findOne({ _id: staffId, schoolId })
      .select("_id name email phone position department bankName accountNumber ifscCode accountHolderName")
      .lean();

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const records = await Finance.find({ schoolId, staffId, type: "staff_salary" })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const reportRecords = records.map((rec) => ({
      financeId: rec._id?.toString(),
      amount: Number(rec.amount || 0),
      paidAmount: Number(rec.paidAmount || 0),
      dueAmount: Math.max(Number(rec.amount || 0) - Number(rec.paidAmount || 0), 0),
      status: rec.status || "pending",
      paymentDate: rec.paymentDate || null,
      academicYear: rec.academicYear || null,
      description: rec.description || "",
      createdAt: rec.createdAt || null,
      updatedAt: rec.updatedAt || null,
      paymentHistory: Array.isArray(rec.paymentHistory)
        ? rec.paymentHistory
            .map((entry) => ({
              receiptNumber: entry.receiptNumber,
              transactionId: entry.transactionId,
              paymentDate: entry.paymentDate,
              amountPaid: Number(entry.amountPaid || 0),
              paymentType: entry.paymentType || "cash",
              sentToEmail: Boolean(entry.sentToEmail),
              createdAt: entry.createdAt || null,
            }))
            .sort((a, b) => new Date(b.paymentDate || "").getTime() - new Date(a.paymentDate || "").getTime())
        : [],
    }));

    const totals = reportRecords.reduce(
      (acc, rec) => {
        acc.salary += rec.amount;
        acc.paid += rec.paidAmount;
        acc.due += rec.dueAmount;
        return acc;
      },
      { salary: 0, paid: 0, due: 0 }
    );

    res.json({
      staff: {
        _id: (staff._id as mongoose.Types.ObjectId).toString(),
        name: (staff as Record<string, unknown>).name,
        email: (staff as Record<string, unknown>).email,
        phone: (staff as Record<string, unknown>).phone,
        position: (staff as Record<string, unknown>).position,
        department: (staff as Record<string, unknown>).department,
        bankName: (staff as Record<string, unknown>).bankName,
        accountNumber: (staff as Record<string, unknown>).accountNumber,
        ifscCode: (staff as Record<string, unknown>).ifscCode,
        accountHolderName: (staff as Record<string, unknown>).accountHolderName,
      },
      totals,
      records: reportRecords,
    });
  } catch (error) {
    console.error("GET STAFF SALARY REPORT ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch staff salary report",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/:schoolId/salary-roles
 * List salary roles for the school.
 */
router.get("/:schoolId/salary-roles", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }

    const roles = await SalaryRole.find({ schoolId }).sort({ createdAt: -1 }).lean();
    res.json(roles);
  } catch (error) {
    console.error("GET SALARY ROLES ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch salary roles",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/:schoolId/salary-roles
 * Create a salary role such as investor/trustee/other.
 */
router.post("/:schoolId/salary-roles", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }

    const { roleName, roleType, description, status } = req.body as {
      roleName?: string;
      roleType?: "investor" | "trustee" | "other";
      description?: string;
      status?: "Active" | "Inactive";
    };

    const normalizedRoleName = String(roleName || "").trim();
    if (!normalizedRoleName) {
      return res.status(400).json({ message: "roleName is required" });
    }

    if (!roleType || !["investor", "trustee", "other"].includes(roleType)) {
      return res.status(400).json({ message: "roleType must be investor, trustee, or other" });
    }

    const existing = await SalaryRole.findOne({
      schoolId,
      roleName: { $regex: `^${normalizedRoleName}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({ message: "Role already exists" });
    }

    const created = await SalaryRole.create({
      schoolId,
      roleName: normalizedRoleName,
      roleType,
      description: String(description || ""),
      status: status || "Active",
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("CREATE SALARY ROLE ERROR:", error);
    res.status(500).json({
      message: "Failed to create salary role",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/:schoolId/investors
 * Investor ledger summary for invested and repaid balances.
 */
router.get("/:schoolId/investors", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }

    const investors = await InvestorLedger.find({ schoolId }).sort({ createdAt: -1 }).lean();

    const payload = investors.map((investor) => {
      const transactions = Array.isArray(investor.transactions) ? investor.transactions : [];
      const totals = transactions.reduce(
        (acc, tx) => {
          const amount = Number(tx.amount || 0);
          if (tx.type === "investment") acc.invested += amount;
          if (tx.type === "repayment") acc.repaid += amount;
          return acc;
        },
        { invested: 0, repaid: 0 }
      );

      return {
        _id: investor._id?.toString(),
        investorName: investor.investorName,
        investorType: investor.investorType,
        contact: investor.contact,
        description: investor.description,
        status: investor.status,
        totalInvested: totals.invested,
        totalRepaid: totals.repaid,
        balanceToRepay: Math.max(totals.invested - totals.repaid, 0),
        transactions: transactions
          .map((tx) => ({
            _id: tx._id?.toString(),
            type: tx.type,
            amount: Number(tx.amount || 0),
            date: tx.date,
            note: tx.note || "",
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        createdAt: investor.createdAt,
      };
    });

    res.json(payload);
  } catch (error) {
    console.error("GET INVESTOR LEDGER ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch investor ledger",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/:schoolId/investors
 * Create investor ledger account with optional initial investment.
 */
router.post("/:schoolId/investors", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }

    const { investorName, investorType, contact, description, status, initialInvestment, date, note } = req.body as {
      investorName?: string;
      investorType?: "investor" | "trustee" | "other";
      contact?: string;
      description?: string;
      status?: "Active" | "Inactive";
      initialInvestment?: number;
      date?: string;
      note?: string;
    };

    const name = String(investorName || "").trim();
    if (!name) {
      return res.status(400).json({ message: "investorName is required" });
    }
    if (!investorType || !["investor", "trustee", "other"].includes(investorType)) {
      return res.status(400).json({ message: "investorType must be investor, trustee, or other" });
    }

    const txAmount = Number(initialInvestment || 0);
    const transactions = txAmount > 0
      ? [{ type: "investment", amount: txAmount, date: String(date || new Date().toISOString().split("T")[0]), note: String(note || "Initial investment") }]
      : [];

    const created = await InvestorLedger.create({
      investorName: name,
      investorType,
      contact: String(contact || ""),
      description: String(description || ""),
      status: status || "Active",
      schoolId,
      transactions,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("CREATE INVESTOR LEDGER ERROR:", error);
    res.status(500).json({
      message: "Failed to create investor ledger",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/:schoolId/investors/:investorId/transactions
 * Add investment or repayment transaction and keep payback constraints.
 */
router.post("/:schoolId/investors/:investorId/transactions", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const investorId = getSingleString(req.params.investorId);
    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }
    if (!investorId || !mongoose.Types.ObjectId.isValid(investorId)) {
      return res.status(400).json({ message: "Invalid investorId" });
    }

    const { type, amount, date, note } = req.body as {
      type?: "investment" | "repayment";
      amount?: number;
      date?: string;
      note?: string;
    };

    if (!type || !["investment", "repayment"].includes(type)) {
      return res.status(400).json({ message: "type must be investment or repayment" });
    }

    const txAmount = Number(amount || 0);
    if (txAmount <= 0) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }

    const investor = await InvestorLedger.findOne({ _id: investorId, schoolId });
    if (!investor) {
      return res.status(404).json({ message: "Investor account not found" });
    }

    const totals = (investor.transactions || []).reduce(
      (acc, tx) => {
        const value = Number(tx.amount || 0);
        if (tx.type === "investment") acc.invested += value;
        if (tx.type === "repayment") acc.repaid += value;
        return acc;
      },
      { invested: 0, repaid: 0 }
    );

    const pendingBalance = Math.max(totals.invested - totals.repaid, 0);
    if (type === "repayment" && txAmount > pendingBalance) {
      return res.status(400).json({ message: `Repayment exceeds pending balance (${pendingBalance})` });
    }

    investor.transactions.push({
      type,
      amount: txAmount,
      date: String(date || new Date().toISOString().split("T")[0]),
      note: String(note || ""),
    });

    await investor.save();
    res.json({ message: "Transaction added successfully" });
  } catch (error) {
    console.error("ADD INVESTOR TRANSACTION ERROR:", error);
    res.status(500).json({
      message: "Failed to add investor transaction",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * DELETE /api/finance/:schoolId/investors/:investorId
 * Remove investor ledger account.
 */
router.delete("/:schoolId/investors/:investorId", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const investorId = getSingleString(req.params.investorId);

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }
    if (!investorId || !mongoose.Types.ObjectId.isValid(investorId)) {
      return res.status(400).json({ message: "Invalid investorId" });
    }

    const deleted = await InvestorLedger.findOneAndDelete({ _id: investorId, schoolId });
    if (!deleted) {
      return res.status(404).json({ message: "Investor account not found" });
    }

    res.json({ message: "Investor account removed successfully" });
  } catch (error) {
    console.error("DELETE INVESTOR LEDGER ERROR:", error);
    res.status(500).json({
      message: "Failed to remove investor account",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/:schoolId/available-years
 * Get list of available academic years for this school
 */
router.get("/:schoolId/available-years", async (req: Request, res: Response) => {
  try {
    const schoolIdRaw = getSingleString(req.params.schoolId);
    if (!schoolIdRaw || !mongoose.Types.ObjectId.isValid(schoolIdRaw)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }
    const schoolOid = new mongoose.Types.ObjectId(schoolIdRaw);

    // Get unique academic years from StudentFeeAssignment
    const feeYearsAgg = await (StudentFeeAssignment as any).aggregate([
      { $match: { school_id: schoolOid } },
      { $group: { _id: "$academic_year" } },
      { $sort: { _id: -1 } },
    ]);
    
    const feeYears = feeYearsAgg
      .map((doc: LooseRecord) => String(doc._id || ""))
      .filter((year: string) => year.length > 0);
    
    // Get unique academic years from Finance (salary)
    const salaryYearsAgg = await Finance.aggregate([
      { $match: { schoolId: schoolOid, type: "staff_salary", academicYear: { $exists: true, $ne: null } } },
      { $group: { _id: "$academicYear" } },
      { $sort: { _id: -1 } },
    ]);
    
    const salaryYears = salaryYearsAgg
      .map((doc: LooseRecord) => String(doc._id || ""))
      .filter((year: string) => year.length > 0);
    
    // Combine and deduplicate
    const allYears = Array.from(new Set([...feeYears, ...salaryYears]));

    return res.json({
      years: allYears,
    });
  } catch (error) {
    console.error("AVAILABLE YEARS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch available years",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/:schoolId/dashboard-summary
 * Aggregated financial overview for the dashboard
 */
router.get("/:schoolId/dashboard-summary", async (req: Request, res: Response) => {
  try {
    const schoolIdRaw = getSingleString(req.params.schoolId);
    if (!schoolIdRaw || !mongoose.Types.ObjectId.isValid(schoolIdRaw)) {
      return res.status(400).json({ message: "Invalid schoolId" });
    }
    const schoolOid = new mongoose.Types.ObjectId(schoolIdRaw);
    
    // Get optional academicYear filter from query params
    const academicYear = getSingleString(req.query.academicYear);
    
    // Build match conditions for fee data
    const feeMatch: LooseRecord = { school_id: schoolOid };
    if (academicYear) {
      feeMatch.academic_year = academicYear;
    }

    // --- Fee summary from StudentFeeAssignment ---
    const feeAgg = await StudentFeeAssignment.aggregate([
      { $match: feeMatch },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          totalFeeAmount: { $sum: "$total_fee" },
          collectedAmount: { $sum: "$paid_amount" },
          // Derive pending from total - paid to keep dashboard cards mathematically consistent.
          pendingAmount: {
            $sum: {
              $max: [{ $subtract: ["$total_fee", "$paid_amount"] }, 0],
            },
          },
          overdueCount: { $sum: { $cond: [{ $eq: ["$fee_status", "OVERDUE"] }, 1, 0] } },
          paidCount: { $sum: { $cond: [{ $eq: ["$fee_status", "PAID"] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ["$fee_status", "PARTIAL"] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ["$fee_status", "UNPAID"] }, 1, 0] } },
        },
      },
    ]);
    const fee = feeAgg[0] ?? {
      totalStudents: 0, totalFeeAmount: 0, collectedAmount: 0, pendingAmount: 0,
      overdueCount: 0, paidCount: 0, partialCount: 0, unpaidCount: 0,
    };

    // Build match conditions for salary data
    const salaryMatch: LooseRecord = { schoolId: schoolOid, type: "staff_salary" };
    if (academicYear) {
      salaryMatch.academicYear = academicYear;
    }

    // --- Salary summary from Finance model (staff_salary) ---
    const salaryAgg = await Finance.aggregate([
      { $match: salaryMatch },
      {
        $group: {
          _id: null,
          totalStaff: { $sum: 1 },
          totalSalaryAmount: { $sum: "$amount" },
          paidSalaryAmount: { $sum: "$paidAmount" },
          pendingSalaryAmount: { $sum: { $subtract: ["$amount", "$paidAmount"] } },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $in: ["$status", ["pending", "partial", "overdue"]] }, 1, 0] } },
        },
      },
    ]);
    const salary = salaryAgg[0] ?? {
      totalStaff: 0, totalSalaryAmount: 0, paidSalaryAmount: 0,
      pendingSalaryAmount: 0, paidCount: 0, pendingCount: 0,
    };

    // --- Investor summary from InvestorLedger ---
    const investors = await InvestorLedger.find({ schoolId: schoolOid }).lean();
    const now = new Date();
    let totalInvested = 0;
    let totalRepaid = 0;
    let overdueInvestors = 0;
    for (const inv of investors) {
      const txs = (inv.transactions as Array<{ type: string; amount: number; date: string }>) || [];
      const invested = txs.filter((t) => t.type === "investment").reduce((s, t) => s + t.amount, 0);
      const repaid = txs.filter((t) => t.type === "repayment").reduce((s, t) => s + t.amount, 0);
      totalInvested += invested;
      totalRepaid += repaid;
      if (invested - repaid > 0) {
        const lastRepayment = txs.filter((t) => t.type === "repayment").sort((a, b) => b.date.localeCompare(a.date))[0];
        const lastInvestment = txs.filter((t) => t.type === "investment").sort((a, b) => b.date.localeCompare(a.date))[0];
        const refDate = lastRepayment?.date || lastInvestment?.date || null;
        if (refDate) {
          const daysSince = Math.floor((now.getTime() - new Date(refDate).getTime()) / 86400000);
          if (daysSince > 45) overdueInvestors++;
        }
      }
    }
    const investorSummary = {
      total: investors.length,
      totalInvested,
      totalRepaid,
      balanceDue: Math.max(totalInvested - totalRepaid, 0),
      overdueCount: overdueInvestors,
    };

    // --- Recent fee payments (last 6) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentFeePayments: any[] = await (StudentFeePayment as any)
      .find({ school_id: schoolOid })
      .sort({ created_at: -1 })
      .limit(6)
      .populate({ path: "student_id", select: "name rollNumber class" })
      .lean();

    const recentPayments = recentFeePayments.map((p: LooseRecord) => {
      const studentDoc = asRecord(p.student_id);
      return {
        _id: toIdString(p._id),
        studentName: studentDoc ? toStringValue(studentDoc.name) : "—",
        amount: toNumberValue(p.payment_amount),
        date: toStringValue(p.payment_date),
        paymentMode: toStringValue(p.payment_mode || "cash"),
        receiptNo: toStringValue(p.receipt_no),
      };
    });

    // --- Recent salary payments (last 5) ---
    const recentSalaryDocs = await Finance.find({ schoolId: schoolOid, type: "staff_salary", status: "paid" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: "staffId", select: "name position department" })
      .lean();

    const recentSalary = recentSalaryDocs.map((s) => {
      const staffDoc = asRecord(s.staffId);
      return {
        _id: toIdString(s._id),
        staffName: staffDoc ? toStringValue(staffDoc.name) : "—",
        position: staffDoc ? toStringValue(staffDoc.position) : "",
        amount: toNumberValue(s.amount),
        date: toStringValue(s.paymentDate ?? ""),
      };
    });

    res.json({
      fee: { ...fee, _id: undefined },
      salary: { ...salary, _id: undefined },
      investors: investorSummary,
      recentPayments,
      recentSalary,
    });
  } catch (error) {
    console.error("DASHBOARD SUMMARY ERROR:", error);
    res.status(500).json({ message: "Failed to load dashboard summary", error: error instanceof Error ? error.message : "" });
  }
});

/**
 * GET /api/finance/:schoolId/students/:studentId/summary
 * Legacy endpoint for student fee summary
 */
router.get("/:schoolId/students/:studentId/summary", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const studentId = getSingleString(req.params.studentId);

    const student = await Student.findById(studentId).select("class_id");
    const classId = student?.class_id?.toString?.() || "";
    const classDocs = classId ? await Class.find({ _id: classId, schoolId }) : [];
    const classMap = new Map(
      classDocs.map((doc) => {
        const classDoc = toClassLookup(doc);
        return [toIdString(classDoc._id), classDoc] as const;
      })
    );

    const result = await buildAssignmentSummary(schoolId, studentId, classMap);

    if (!result) {
      return res.status(404).json({ message: "Student fee summary not found" });
    }

    res.json(result.summary);
  } catch (error) {
    console.error("GET STUDENT SUMMARY ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch student fee summary",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * GET /api/finance/:schoolId/students/:studentId/receipt-summary
 * Legacy endpoint for finance modal + print flow
 */
router.get("/:schoolId/students/:studentId/receipt-summary", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const studentId = getSingleString(req.params.studentId);

    const student = await Student.findById(studentId).select("class_id");
    const classId = student?.class_id?.toString?.() || "";
    const classDocs = classId ? await Class.find({ _id: classId, schoolId }) : [];
    const classMap = new Map(
      classDocs.map((doc) => {
        const classDoc = toClassLookup(doc);
        return [toIdString(classDoc._id), classDoc] as const;
      })
    );

    const result = await buildAssignmentSummary(schoolId, studentId, classMap);

    if (!result) {
      return res.status(404).json({ message: "Student fee summary not found" });
    }

    res.json(result.summary);
  } catch (error) {
    console.error("GET STUDENT RECEIPT SUMMARY ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch student receipt summary",
      error: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * POST /api/finance/:assignmentId/send-receipt
 * Legacy endpoint for emailing latest receipt
 */
router.post("/:assignmentId/send-receipt", async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { receiptNumber } = req.body || {};

    const assignment = await StudentFeeAssignment.findById(assignmentId)
      .populate("student_id", "name email class class_id section_id")
      .populate("school_id", "name schoolInfo");

    if (!assignment) {
      return res.status(404).json({ message: "Fee assignment not found" });
    }

    const schoolRef = toObjectRecord(assignment.school_id);
    const schoolId = toIdString(schoolRef?._id) || toIdString(assignment.school_id);
    const studentId = toIdString(toObjectRecord(assignment.student_id)._id) || toIdString(assignment.student_id);
    const result = await buildAssignmentSummary(schoolId, studentId);

    if (!result) {
      return res.status(404).json({ message: "Student fee summary not found" });
    }

    const paymentHistory = result.summary.paymentHistory || [];
    const selectedReceipt = receiptNumber
      ? paymentHistory.find((item) => toObjectRecord(item).receiptNumber === receiptNumber)
      : paymentHistory[paymentHistory.length - 1];

    if (!selectedReceipt) {
      return res.status(404).json({ message: "Receipt not found for this fee assignment" });
    }

    const student = toObjectRecord(result.summary.student);
    if (!student.email) {
      return res.status(400).json({ message: "Registered student email is not available" });
    }

    const schoolDoc = toObjectRecord(assignment.school_id);
    const schoolInfo = toObjectRecord(schoolDoc.schoolInfo);
    const schoolName =
      toStringValue(schoolInfo.name) ||
      toStringValue(schoolDoc.name) ||
      "School ERP";

    await sendStudentFeeReceiptEmail({
      studentName: toStringValue(student.name) || "Student",
      studentEmail: toStringValue(student.email),
      className: toStringValue(student.class) || "-",
      schoolName,
      paymentDate: selectedReceipt.paymentDate || "",
      paymentType: selectedReceipt.paymentType || "cash",
      transactionId: selectedReceipt.transactionId || "",
      amountPaid: Number(selectedReceipt.amountPaid || 0),
      receiptNumber: selectedReceipt.receiptNumber || "",
      totalFee: Number(result.summary.totalFee || 0),
      paidAmount: Number(result.summary.paidAmount || 0),
      pendingBalance: Number(result.summary.pendingBalance || 0),
      dueDate: result.summary.dueDate || null,
      paymentStatus: String(result.summary.paymentStatus || result.summary.status || "pending"),
      feeComponents: Array.isArray(result.summary.feeComponents) ? result.summary.feeComponents : [],
    });

    res.json({
      success: true,
      message: `Receipt sent to ${student.email}`,
    });
  } catch (error) {
    console.error("SEND FEE RECEIPT ERROR:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send fee receipt",
    });
  }
});

/**
 * GET /api/finance/:schoolId/class-fee-structures
 * Legacy endpoint - returns class fee structures for a school
 */
router.get("/:schoolId/class-fee-structures", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    const structures = await financeService.getClassFeeStructuresWithStats(schoolId);
    const classIds = Array.from(
      new Set(
        (structures as ClassFeeStructureRecord[])
          .map((structure) => structure.class_id)
          .filter(Boolean)
          .map((value) => toIdString(value))
      )
    );

    const classDocs = classIds.length
      ? await Class.find({ _id: { $in: classIds }, schoolId })
      : [];
    const classMap = new Map(
      classDocs.map((classDoc) => {
        const normalized = toClassLookup(classDoc);
        return [toIdString(normalized._id), normalized] as const;
      })
    );

    const transformed = (structures as ClassFeeStructureRecord[]).map((structure) =>
      mapLegacyClassFeeStructure(structure, classMap)
    );

    res.json(transformed);
  } catch (error) {
    console.error("GET CLASS FEE STRUCTURES ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch class fee structures",
      message: error instanceof Error ? error.message : "",
    });
  }
});

/**
 * PUT /api/finance/:schoolId/class-fee-structures
 * Legacy endpoint used by frontend to create/update class fee structures
 */
router.put("/:schoolId/class-fee-structures", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const { className, amount, transportFee, dueDate, academicYear, section, createdBy } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: "schoolId is required" });
    }

    if (!className) {
      return res.status(400).json({ error: "className is required" });
    }

    const normalizedClassName = String(className).trim();
    const [namePart, sectionPart] = normalizedClassName.split("-").map((part: string) => part.trim());
    const normalizedSection = String(section || sectionPart || "").trim().toUpperCase();

    const classQuery: ClassQuery = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      name: namePart,
    };
    if (normalizedSection) {
      classQuery.section = normalizedSection;
    }

    let classDoc = await Class.findOne(classQuery);
    if (!classDoc) {
      classDoc = await Class.findOne({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        name: normalizedClassName,
      });
    }

    if (!classDoc) {
      return res.status(404).json({ error: `Class not found: ${normalizedClassName}` });
    }

    await financeService.saveClassFeeStructure(schoolId, {
      class_id: classDoc._id.toString(),
      section_id: null,
      academic_year: String(academicYear || "").trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      academic_fee: Number(amount || 0),
      default_transport_fee: Number(transportFee || 0),
      other_fee: 0,
      due_date: dueDate || new Date().toISOString().split("T")[0],
      created_by: createdBy,
    });

    const structures = await financeService.getClassFeeStructuresWithStats(schoolId);
    const classIds = Array.from(
      new Set(
        (structures as ClassFeeStructureRecord[])
          .map((structure) => structure.class_id)
          .filter(Boolean)
          .map((value) => toIdString(value))
      )
    );
    const classDocs = classIds.length
      ? await Class.find({ _id: { $in: classIds }, schoolId })
      : [];
    const classMap = new Map(
      classDocs.map((doc) => {
        const normalized = toClassLookup(doc);
        return [toIdString(normalized._id), normalized] as const;
      })
    );

    const transformed = (structures as ClassFeeStructureRecord[]).map((structure) =>
      mapLegacyClassFeeStructure(structure, classMap)
    );

    res.json(transformed);
  } catch (error) {
    console.error("UPSERT LEGACY CLASS FEE STRUCTURE ERROR:", error);
    res.status(500).json({
      error: "Failed to save class fee structure",
      message: error instanceof Error ? error.message : "",
    });
  }
});

export default router;
