import express from "express";
import mongoose from "mongoose";
import Class from "../models/Class";
import ClassFeeStructure from "../models/ClassFeeStructure";
import DataImportBatch from "../models/DataImportBatch";
import School from "../models/School";
import Student from "../models/Student";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import Transport from "../models/Transport";
import { createLog } from "../utils/createLog";

type ModuleType =
  | "student-master"
  | "class-fee"
  | "student-fee-record"
  | "transport"
  | "ledger"
  | "summary-fee";

type ImportBatchSummary = {
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
  duplicate_rows?: number;
  imported_students?: number;
  imported_fee_accounts?: number;
  imported_fee_structures?: number;
  imported_transports?: number;
  updated_students?: number;
  updated_fee_accounts?: number;
  failed_rows?: number;
};

type InsertedRefs = {
  students?: mongoose.Types.ObjectId[];
  fee_assignments?: mongoose.Types.ObjectId[];
  fee_structures?: mongoose.Types.ObjectId[];
  transports?: mongoose.Types.ObjectId[];
};

type DataImportBatchDocument = {
  _id: mongoose.Types.ObjectId;
  school_id: mongoose.Types.ObjectId | string;
  module_type: ModuleType;
  source_file_name: string;
  sheet_name: string;
  academic_year: string;
  status: "VALIDATED" | "IMPORTED" | "ROLLED_BACK" | "IMPORT_FAILED";
  mapping: Record<string, unknown>;
  summary: ImportBatchSummary;
  normalized_rows: unknown[];
  inserted_refs?: InsertedRefs;
  rolled_back_at?: Date | null;
  save: () => Promise<unknown>;
};

type FeeStructureDocument = mongoose.Document & { _id: mongoose.Types.ObjectId };
type FeeAssignmentDocument = mongoose.Document & { _id: mongoose.Types.ObjectId };

const DataImportBatchModel = DataImportBatch as unknown as mongoose.Model<Record<string, unknown>>;
const ClassFeeStructureModel = ClassFeeStructure as unknown as mongoose.Model<FeeStructureDocument>;
const StudentFeeAssignmentModel = StudentFeeAssignment as unknown as mongoose.Model<FeeAssignmentDocument>;

type ImportField =
  // Student Master
  | "registration_no"
  | "student_name"
  | "father_name"
  | "mother_name"
  | "mobile_number"
  | "email"
  | "class"
  | "section"
  | "address"
  | "date_of_birth"
  | "gender"
  | "blood_group"
  | "admission_date"
  | "roll_number"
  // Class Fee
  | "fee_type"
  | "fee_amount"
  | "installment_1"
  | "installment_2"
  | "installment_3"
  | "currency"
  // Student Fee Record
  | "fee_total"
  | "paid_amount"
  | "due_amount"
  | "discount_amount"
  | "paid_date"
  | "payment_mode"
  | "receipt_no"
  // Transport
  | "transport_route"
  | "vehicle"
  | "transport_status"
  | "transport_fee"
  | "stop_name"
  | "boarding_point"
  // Ledger
  | "ledger_id"
  | "ledger_names"
  | "designation"
  | "total_assigned"
  | "amount_paid"
  | "balance_remaining"
  // Summary Fee
  | "total_students"
  | "total_fee"
  | "total_collected"
  | "total_outstanding"
  | "financial_year"
  | "average_fee_per_student";

type GenericRow = Record<string, unknown>;

type Mapping = Partial<Record<ImportField, string>>;
type MappingConfidence = Partial<Record<ImportField, number>>;

type ValidationError = {
  rowNumber: number;
  messages: string[];
};

type DuplicateHit = {
  rowNumber: number;
  reason: string;
};

type NormalizedRow = {
  rowNumber: number;
  registrationNo: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  mobileNumber: string;
  className: string;
  section: string;
  feeTotal: number;
  paidAmount: number;
  dueAmount: number;
  transportFee: number;
  discountAmount: number;
  transportRoute: string;
  vehicle: string;
  transportStatus: "ACTIVE" | "INACTIVE" | "NO_TRANSPORT";
  address: string;
  rollNumber: string;
  email: string;
  paidDate: string;
  [key: string]: unknown;
};

type ValidationSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  mismatchRows: number;
};

type ValidationOutput = {
  cleanRows: NormalizedRow[];
  errors: ValidationError[];
  duplicates: DuplicateHit[];
  summary: ValidationSummary;
};

type ImportResultSummary = {
  importedStudents: number;
  importedFeeAccounts: number;
  importedFeeStructures: number;
  importedTransports: number;
  updatedStudents: number;
  updatedFeeAccounts: number;
  failedRows: number;
};

const router = express.Router();

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

const allImportFields: ImportField[] = [
  // Student Master
  "registration_no",
  "student_name",
  "father_name",
  "mother_name",
  "mobile_number",
  "email",
  "class",
  "section",
  "address",
  "date_of_birth",
  "gender",
  "blood_group",
  "admission_date",
  "roll_number",
  // Class Fee
  "fee_type",
  "fee_amount",
  "installment_1",
  "installment_2",
  "installment_3",
  "currency",
  // Student Fee Record
  "fee_total",
  "paid_amount",
  "due_amount",
  "discount_amount",
  "paid_date",
  "payment_mode",
  "receipt_no",
  // Transport
  "transport_route",
  "vehicle",
  "transport_status",
  "transport_fee",
  "stop_name",
  "boarding_point",
  // Ledger
  "ledger_id",
  "ledger_names",
  "designation",
  "total_assigned",
  "amount_paid",
  "balance_remaining",
  // Summary Fee
  "total_students",
  "total_fee",
  "total_collected",
  "total_outstanding",
  "financial_year",
  "average_fee_per_student",
];

const fieldAliases: Record<ImportField, string[]> = {
  // Student Master
  registration_no: [
    "registration",
    "registration no",
    "reg no",
    "reg. no",
    "admission",
    "admission no",
    "admission number",
    "student id",
    "student code",
  ],
  student_name: ["student", "name", "student name", "student full name"],
  father_name: ["father", "father name", "f name"],
  mother_name: ["mother", "mother name", "m name"],
  mobile_number: ["mobile", "phone", "contact", "mobile number", "phone number"],
  email: ["email", "mail"],
  class: ["class", "standard", "grade"],
  section: ["section", "sec"],
  address: ["address", "residence"],
  date_of_birth: ["date of birth", "dob", "birth date", "born on"],
  gender: ["gender", "sex"],
  blood_group: ["blood group", "blood type"],
  admission_date: ["admission date", "joined on", "admission on"],
  roll_number: ["roll no", "roll number", "roll", "sr no", "sr. no", "serial no"],
  // Class Fee
  fee_type: ["fee type", "fee category", "fee name"],
  fee_amount: ["fee amount", "amount", "fee"],
  installment_1: ["installment 1", "inst 1", "1st installment", "first installment"],
  installment_2: ["installment 2", "inst 2", "2nd installment", "second installment"],
  installment_3: ["installment 3", "inst 3", "3rd installment", "third installment"],
  currency: ["currency", "curr", "symbol"],
  // Student Fee Record
  fee_total: ["total fee", "fee total", "tot fee", "grand total", "net fee", "total amount"],
  paid_amount: [
    "paid",
    "paid amount",
    "t_paid",
    "amount paid",
    "payment amount",
    "received amount",
    "amount received",
    "collected amount",
  ],
  due_amount: [
    "due",
    "due amount",
    "g_due",
    "pending",
    "balance",
    "balance amount",
    "outstanding",
    "outstanding amount",
    "pending amount",
  ],
  discount_amount: ["discount", "cl", "concession", "waiver", "scholarship"],
  paid_date: ["paid date", "payment date", "date paid", "transaction date", "receipt date", "paid on"],
  payment_mode: ["payment mode", "mode", "method", "payment method"],
  receipt_no: ["receipt no", "receipt number", "voucher no", "voucher number"],
  // Transport
  transport_route: ["transport route", "route", "bus route"],
  vehicle: ["vehicle", "bus", "bus number", "van"],
  transport_status: ["transport status", "needs transport", "transport"],
  transport_fee: ["transport fee", "bus fee", "conf", "conveyance", "conveyance fee"],
  stop_name: ["stop", "stop name", "bus stop"],
  boarding_point: ["boarding point", "pickup point", "drop point"],
  // Ledger
  ledger_id: ["ledger id", "id", "sl no", "sr no", "serial"],
  ledger_names: ["names", "name", "person name", "account holder"],
  designation: ["designation", "post", "position", "role"],
  total_assigned: ["total amount assigned", "total assigned", "assigned amount", "sanctioned amount"],
  amount_paid: ["amount paid", "paid", "payment made", "paid amount"],
  balance_remaining: ["balance remaining", "balance", "remaining balance", "outstanding balance"],
  // Summary Fee
  total_students: ["total students", "no of students", "count", "num students"],
  total_fee: ["total fee", "aggregate fee", "total amount"],
  total_collected: ["total collected", "collected", "received"],
  total_outstanding: ["total outstanding", "outstanding", "pending"],
  financial_year: ["financial year", "year", "fy", "academic year"],
  average_fee_per_student: ["average fee", "average", "avg fee"],
};

// Get module-specific required fields
function getRequiredFieldsForModule(moduleType: ModuleType): ImportField[] {
  switch (moduleType) {
    case "student-master":
      return ["registration_no", "student_name", "class"];
    case "class-fee":
      return ["class", "fee_type", "fee_amount"];
    case "student-fee-record":
      return ["registration_no", "student_name", "fee_total"];
    case "transport":
      return ["registration_no", "student_name", "transport_route"];
    case "ledger":
      return ["ledger_names", "total_assigned"];
    case "summary-fee":
      return ["class", "financial_year"];
    default:
      return ["registration_no", "student_name", "class"];
  }
}

// Get module-specific available fields
function getAvailableFieldsForModule(moduleType: ModuleType): ImportField[] {
  switch (moduleType) {
    case "student-master":
      return [
        "registration_no",
        "student_name",
        "father_name",
        "mother_name",
        "mobile_number",
        "email",
        "class",
        "section",
        "address",
        "date_of_birth",
        "gender",
        "blood_group",
        "admission_date",
      ];
    case "class-fee":
      return ["class", "section", "fee_type", "fee_amount", "installment_1", "installment_2", "installment_3", "currency"];
    case "student-fee-record":
      return [
        "registration_no",
        "student_name",
        "class",
        "section",
        "fee_total",
        "paid_amount",
        "due_amount",
        "discount_amount",
        "paid_date",
        "payment_mode",
        "receipt_no",
      ];
    case "transport":
      return [
        "registration_no",
        "student_name",
        "class",
        "section",
        "transport_route",
        "vehicle",
        "transport_status",
        "transport_fee",
        "stop_name",
        "boarding_point",
      ];
    case "ledger":
      return [
        "ledger_id",
        "ledger_names",
        "designation",
        "total_assigned",
        "amount_paid",
        "balance_remaining",
      ];
    case "summary-fee":
      return [
        "class",
        "section",
        "total_students",
        "total_fee",
        "total_collected",
        "total_outstanding",
        "financial_year",
        "average_fee_per_student",
      ];
    default:
      return allImportFields;
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableHeader(header: string): boolean {
  const normalized = normalizeText(header);
  if (!normalized) {
    return false;
  }

  return !/^__empty/i.test(normalized);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const numeric = Number(String(value ?? "").replace(/[, ]+/g, "").trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function isValidMobile(value: string): boolean {
  return /^\d{10}$/.test(value);
}

function isValidClassName(value: string): boolean {
  return /^[A-Za-z0-9\s-]{1,40}$/.test(value);
}

function inferTransportStatus(value: string): "ACTIVE" | "INACTIVE" | "NO_TRANSPORT" {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return "NO_TRANSPORT";
  }

  if (["yes", "y", "active", "1", "true"].includes(normalized)) {
    return "ACTIVE";
  }

  if (["no", "n", "inactive", "0", "false"].includes(normalized)) {
    return "INACTIVE";
  }

  return "NO_TRANSPORT";
}

function normalizeDueDate(value: string): string {
  const trimmed = normalizeText(value);
  if (trimmed) {
    return trimmed;
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  return fallback.toISOString().slice(0, 10);
}

function suggestMapping(headers: string[], moduleType?: ModuleType): Mapping {
  const mapping: Mapping = {};
  const usableHeaders = headers.filter(isUsableHeader);
  const fieldsToCheck = moduleType ? getAvailableFieldsForModule(moduleType) : allImportFields;

  for (const field of fieldsToCheck) {
    const aliases = fieldAliases[field];
    const matchedHeader = usableHeaders.find((header) => {
      const normalizedHeader = normalizeKey(header);
      return aliases.some((alias) => normalizedHeader.includes(normalizeKey(alias)));
    });

    if (matchedHeader) {
      mapping[field] = matchedHeader;
    }
  }

  return mapping;
}

function buildMappingConfidence(params: {
  mapping: Mapping;
  aiMapping: Mapping | null;
  headers: string[];
  moduleType?: ModuleType;
}): MappingConfidence {
  const { mapping, aiMapping, moduleType } = params;
  const confidence: MappingConfidence = {};
  const fieldsToCheck = moduleType ? getAvailableFieldsForModule(moduleType) : allImportFields;

  for (const field of fieldsToCheck) {
    const header = mapping[field];
    if (!header) {
      continue;
    }

    if (aiMapping?.[field] && aiMapping[field] === header) {
      confidence[field] = 0.9;
      continue;
    }

    const normalizedHeader = normalizeKey(header);
    const aliases = fieldAliases[field];

    const exactAliasHit = aliases.some((alias) => normalizeKey(alias) === normalizedHeader);
    if (exactAliasHit) {
      confidence[field] = 0.85;
      continue;
    }

    const partialAliasHit = aliases.some((alias) => normalizedHeader.includes(normalizeKey(alias)));
    confidence[field] = partialAliasHit ? 0.7 : 0.55;
  }

  return confidence;
}

function cleanJson(value: string): string {
  return value.replace(/```json|```/gi, "").trim();
}

function sanitizeAiMapping(candidate: unknown, headers: string[], moduleType?: ModuleType): Mapping {
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  const headerSet = new Set(headers.filter(isUsableHeader));
  const result: Mapping = {};
  const fieldsToCheck = moduleType ? getAvailableFieldsForModule(moduleType) : allImportFields;

  for (const field of fieldsToCheck) {
    const rawValue = (candidate as Record<string, unknown>)[field];
    const header = normalizeText(rawValue);
    if (header && headerSet.has(header)) {
      result[field] = header;
    }
  }

  return result;
}

async function suggestMappingWithAi(headers: string[], moduleType: ModuleType): Promise<Mapping | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || typeof fetch !== "function" || headers.length === 0) {
    return null;
  }

  const availableFields = getAvailableFieldsForModule(moduleType);
  const userPrompt = [
    "Map spreadsheet headers to ERP import fields.",
    `Module type: ${moduleType}`,
    `Available headers: ${JSON.stringify(headers)}`,
    `Allowed fields for ${moduleType}: ${JSON.stringify(availableFields)}`,
    "Return JSON object only.",
    "Keys must be allowed field names.",
    "Values must be one of the exact available headers or null.",
    "Do not invent headers.",
  ].join("\n");

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
        temperature: 0.1,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content:
              "You are a strict data mapping assistant. Return only valid JSON object with ERP field keys and exact header values.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(cleanJson(raw));
    const aiMapping = sanitizeAiMapping(parsed, headers, moduleType);

    return Object.keys(aiMapping).length > 0 ? aiMapping : null;
  } catch {
    return null;
  }
}

function getRowValue(row: GenericRow, mapping: Mapping, field: ImportField): string {
  const key = mapping[field];
  if (!key) {
    return "";
  }

  return normalizeText(row[key]);
}

async function findStudentDuplicate(
  schoolId: string,
  registrationNo: string,
  studentName: string,
  className: string,
  section: string
): Promise<boolean> {
  const byRegistration = registrationNo
    ? await Student.findOne({
        schoolId,
        registration_no: { $regex: new RegExp(`^${registrationNo}$`, "i") },
      }).select("_id")
    : null;

  if (byRegistration) {
    return true;
  }

  const classLabel = section ? `${className} - ${section}` : className;
  const byNameAndClass = await Student.findOne({
    schoolId,
    name: { $regex: new RegExp(`^${studentName}$`, "i") },
    class: classLabel,
  }).select("_id");

  return Boolean(byNameAndClass);
}

async function validateRows(
  schoolId: string,
  rows: GenericRow[],
  mapping: Mapping,
  moduleType?: ModuleType
): Promise<ValidationOutput> {
  const cleanRows: NormalizedRow[] = [];
  const errors: ValidationError[] = [];
  const duplicates: DuplicateHit[] = [];
  const seenRegistration = new Set<string>();
  let mismatchRows = 0;

  const requiredFields = moduleType ? getRequiredFieldsForModule(moduleType) : (["registration_no", "student_name", "class"] as ImportField[]);
  const isStudentCentric = !moduleType || moduleType === "student-master" || moduleType === "student-fee-record" || moduleType === "transport";

  for (let i = 0; i < rows.length; i += 1) {
    const rowNumber = i + 2;
    const row = rows[i];
    const rowErrors: string[] = [];

    // --- Required field presence check (module-aware) ---
    for (const field of requiredFields) {
      const value = getRowValue(row, mapping, field);
      if (!value) {
        const label = field.replace(/_/g, " ");
        rowErrors.push(`Missing ${label}`);
      }
    }

    if (isStudentCentric) {
      // --- Student-specific extra checks ---
      const registrationNo = getRowValue(row, mapping, "registration_no");
      const studentName    = getRowValue(row, mapping, "student_name");
      const className      = getRowValue(row, mapping, "class");
      const mobileRaw      = getRowValue(row, mapping, "mobile_number");

      if (className && moduleType === "student-master" && !isValidClassName(className)) {
        rowErrors.push("Invalid class name format");
      }

      const normalizedMobile = normalizeMobile(mobileRaw);
      if (mobileRaw && !isValidMobile(normalizedMobile)) {
        rowErrors.push("Invalid mobile number (expected 10 digits)");
      }

      // Fee mismatch check for student-fee-record
      if (moduleType === "student-fee-record") {
        const feeTotal       = toNumber(getRowValue(row, mapping, "fee_total"));
        const paidAmount     = toNumber(getRowValue(row, mapping, "paid_amount"));
        const dueAmount      = toNumber(getRowValue(row, mapping, "due_amount"));
        const discountAmount = toNumber(getRowValue(row, mapping, "discount_amount"));
        const matchesWithoutDiscount = Math.abs(feeTotal - (paidAmount + dueAmount)) <= 1;
        const matchesWithDiscount    = Math.abs(feeTotal - (paidAmount + dueAmount + discountAmount)) <= 1;
        if (!matchesWithoutDiscount && !matchesWithDiscount) {
          mismatchRows += 1;
        }
      }

      // In-file duplicate check keyed on registration number
      const registrationKey = registrationNo.toLowerCase();
      if (registrationKey) {
        if (seenRegistration.has(registrationKey)) {
          duplicates.push({ rowNumber, reason: "Duplicate registration number in file" });
        }
        seenRegistration.add(registrationKey);
      }

      if (rowErrors.length > 0) {
        errors.push({ rowNumber, messages: rowErrors });
        continue;
      }

      // DB duplicate check only for student-master
      if (moduleType === "student-master" || !moduleType) {
        const section = getRowValue(row, mapping, "section").toUpperCase();
        const isDbDuplicate = await findStudentDuplicate(schoolId, registrationNo, studentName, className, section);
        if (isDbDuplicate) {
          duplicates.push({ rowNumber, reason: "Duplicate student exists in ERP database" });
          continue;
        }
      }
    } else {
      // Non-student module: no extra checks beyond required fields above
      if (rowErrors.length > 0) {
        errors.push({ rowNumber, messages: rowErrors });
        continue;
      }
    }

    // Build the normalized row (student fields default to empty/zero for non-student modules)
    const registrationNo  = getRowValue(row, mapping, "registration_no");
    const mobileRaw       = getRowValue(row, mapping, "mobile_number");
    const normalizedMobile = normalizeMobile(mobileRaw);

    // Embed raw mapped values by their Excel column header so the sample display
    // table can show data for any module type (ledger, class-fee, etc.)
    const rawMappedValues: Record<string, unknown> = {};
    for (const [, header] of Object.entries(mapping)) {
      if (header && row[header] !== undefined) {
        rawMappedValues[header] = row[header];
      }
    }

    cleanRows.push({
      ...rawMappedValues,
      rowNumber,
      registrationNo,
      studentName:    getRowValue(row, mapping, "student_name"),
      fatherName:     getRowValue(row, mapping, "father_name"),
      motherName:     getRowValue(row, mapping, "mother_name"),
      mobileNumber:   normalizedMobile,
      className:      getRowValue(row, mapping, "class"),
      section:        getRowValue(row, mapping, "section").toUpperCase(),
      feeTotal:       toNumber(getRowValue(row, mapping, "fee_total")),
      paidAmount:     toNumber(getRowValue(row, mapping, "paid_amount")),
      dueAmount:      toNumber(getRowValue(row, mapping, "due_amount")),
      transportFee:   toNumber(getRowValue(row, mapping, "transport_fee")),
      discountAmount: toNumber(getRowValue(row, mapping, "discount_amount")),
      transportRoute: getRowValue(row, mapping, "transport_route"),
      vehicle:        getRowValue(row, mapping, "vehicle"),
      transportStatus: inferTransportStatus(getRowValue(row, mapping, "transport_status")),
      address:        getRowValue(row, mapping, "address"),
      rollNumber:     getRowValue(row, mapping, "roll_number") || registrationNo.slice(-4) || `${rowNumber}`,
      email:          getRowValue(row, mapping, "email") || `${registrationNo || `row-${rowNumber}`}@import.local`,
      paidDate:       normalizeDueDate(getRowValue(row, mapping, "paid_date")),
    });
  }

  return {
    cleanRows,
    errors,
    duplicates,
    summary: {
      totalRows: rows.length,
      validRows: cleanRows.length,
      invalidRows: errors.length,
      duplicateRows: duplicates.length,
      mismatchRows,
    },
  };
}

async function ensureClass(
  schoolId: string,
  className: string,
  section: string,
  academicYear: string,
  createdClassIds: mongoose.Types.ObjectId[]
) {
  const existing = await Class.findOne({
    schoolId,
    name: className,
    section: section || "",
  });

  if (existing) {
    return existing;
  }

  const created = await Class.create({
    schoolId,
    name: className,
    section: section || "",
    academicYear,
    studentCount: 0,
  });

  createdClassIds.push(created._id as mongoose.Types.ObjectId);
  return created;
}

function buildFeeStatus(total: number, paid: number, due: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (total <= 0 || paid <= 0) {
    return "UNPAID";
  }

  if (due <= 0) {
    return "PAID";
  }

  return "PARTIAL";
}

async function ensureTransport(
  schoolId: string,
  routeName: string,
  busNumber: string,
  createdTransportIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId | null> {
  if (!routeName && !busNumber) {
    return null;
  }

  const normalizedRouteName = routeName || "Imported Route";
  const normalizedBusNumber = busNumber || "Imported Vehicle";

  const existing = await Transport.findOne({
    schoolId,
    routeName: normalizedRouteName,
    busNumber: normalizedBusNumber,
  }).select("_id");

  if (existing?._id) {
    return existing._id as mongoose.Types.ObjectId;
  }

  const created = await Transport.create({
    schoolId,
    routeName: normalizedRouteName,
    busNumber: normalizedBusNumber,
    driverName: "Imported Driver",
    driverPhone: "9999999999",
    driverLicenseNumber: "PENDING_IMPORT",
    conductorName: "Imported Conductor",
    routeStops: [],
  });

  createdTransportIds.push(created._id as mongoose.Types.ObjectId);
  return created._id as mongoose.Types.ObjectId;
}

async function importCleanRows(params: {
  schoolId: string;
  academicYear: string;
  rows: NormalizedRow[];
  duplicateMode: "skip" | "update";
  batch: DataImportBatchDocument;
}): Promise<ImportResultSummary> {
  const { schoolId, academicYear, rows, duplicateMode, batch } = params;

  const createdClassIds: mongoose.Types.ObjectId[] = [];
  const createdTransportIds: mongoose.Types.ObjectId[] = [];
  const createdStudentIds: mongoose.Types.ObjectId[] = [];
  const createdFeeStructureIds: mongoose.Types.ObjectId[] = [];
  const touchedFeeAssignmentIds: mongoose.Types.ObjectId[] = [];

  let importedStudents = 0;
  let importedFeeAccounts = 0;
  let importedFeeStructures = 0;
  let importedTransports = 0;
  let updatedStudents = 0;
  let updatedFeeAccounts = 0;
  let failedRows = 0;

  for (const row of rows) {
    try {
      const classDoc = await ensureClass(
        schoolId,
        row.className,
        row.section,
        academicYear,
        createdClassIds
      );

      const routeId =
        row.transportStatus === "ACTIVE"
          ? await ensureTransport(schoolId, row.transportRoute, row.vehicle, createdTransportIds)
          : null;

      const classLabel = row.section ? `${row.className} - ${row.section}` : row.className;

      const existingStudent = await Student.findOne({
        schoolId,
        registration_no: { $regex: new RegExp(`^${row.registrationNo}$`, "i") },
      });

      let studentId: mongoose.Types.ObjectId;

      if (existingStudent) {
        if (duplicateMode === "skip") {
          continue;
        }

        existingStudent.name = row.studentName;
        existingStudent.class = classLabel;
        existingStudent.classSection = row.section;
        existingStudent.class_id = classDoc._id;
        existingStudent.academicYear = academicYear;
        existingStudent.academic_year = academicYear;
        existingStudent.rollNumber = row.rollNumber;
        existingStudent.roll_no = row.rollNumber;
        existingStudent.phone = row.mobileNumber;
        existingStudent.email = row.email;
        existingStudent.address = row.address;
        existingStudent.transport_status = row.transportStatus;
        existingStudent.transport_route_id = routeId;
        existingStudent.needsTransport = row.transportStatus === "ACTIVE";
        existingStudent.father_name = row.fatherName;
        existingStudent.mother_name = row.motherName;
        existingStudent.mobile_number = row.mobileNumber;
        await existingStudent.save();
        studentId = existingStudent._id as mongoose.Types.ObjectId;
        updatedStudents += 1;
      } else {
        const createdStudent = await Student.create({
          schoolId,
          registration_no: row.registrationNo,
          admissionNumber: row.registrationNo,
          name: row.studentName,
          email: row.email,
          class: classLabel,
          classSection: row.section,
          class_id: classDoc._id,
          academicYear,
          academic_year: academicYear,
          rollNumber: row.rollNumber,
          roll_no: row.rollNumber,
          phone: row.mobileNumber,
          address: row.address,
          father_name: row.fatherName,
          mother_name: row.motherName,
          mobile_number: row.mobileNumber,
          transport_status: row.transportStatus,
          transport_route_id: routeId,
          needsTransport: row.transportStatus === "ACTIVE",
          status: "Active",
        });

        studentId = createdStudent._id as mongoose.Types.ObjectId;
        createdStudentIds.push(studentId);
        importedStudents += 1;
      }

      const feeStructureDoc = await ClassFeeStructureModel.findOneAndUpdate(
        {
          school_id: schoolId,
          class_id: String(classDoc._id),
          section_id: row.section || null,
          academic_year: academicYear,
        },
        {
          $setOnInsert: {
            due_date: row.paidDate,
            is_active: true,
          },
          $set: {
            academic_fee: Math.max(0, row.feeTotal - Math.max(0, row.transportFee)),
            default_transport_fee: Math.max(0, row.transportFee),
            other_fee: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const wasFeeStructureCreated = createdFeeStructureIds.every(
        (id) => String(id) !== String(feeStructureDoc._id)
      );

      if (wasFeeStructureCreated) {
        createdFeeStructureIds.push(feeStructureDoc._id as mongoose.Types.ObjectId);
        importedFeeStructures += 1;
      }

      const feeStatus = buildFeeStatus(row.feeTotal, row.paidAmount, row.dueAmount);
      const feeAssignment = await StudentFeeAssignmentModel.findOneAndUpdate(
        {
          school_id: schoolId,
          student_id: studentId,
          class_fee_structure_id: feeStructureDoc._id,
          academic_year: academicYear,
        },
        {
          $set: {
            academic_fee: Math.max(0, row.feeTotal - Math.max(0, row.transportFee)),
            transport_fee: Math.max(0, row.transportFee),
            other_fee: 0,
            discount_amount: Math.max(0, row.discountAmount),
            total_fee: Math.max(0, row.feeTotal),
            paid_amount: Math.max(0, row.paidAmount),
            due_amount: Math.max(0, row.dueAmount),
            fee_status: feeStatus,
            due_date: row.paidDate,
            last_payment_date: row.paidAmount > 0 ? new Date().toISOString().slice(0, 10) : null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const hasFeeAssignment = touchedFeeAssignmentIds.some(
        (id) => String(id) === String(feeAssignment._id)
      );

      if (hasFeeAssignment) {
        updatedFeeAccounts += 1;
      } else {
        touchedFeeAssignmentIds.push(feeAssignment._id as mongoose.Types.ObjectId);
        importedFeeAccounts += 1;
      }

      if (routeId) {
        importedTransports = createdTransportIds.length;
      }
    } catch (error) {
      failedRows += 1;
      console.error(`Import row failed at row ${row.rowNumber}:`, error);
    }
  }

  const classIdSet = new Set(createdClassIds.map((id) => String(id)));
  const transportIdSet = new Set(createdTransportIds.map((id) => String(id)));
  const studentIdSet = new Set(createdStudentIds.map((id) => String(id)));
  const feeStructureIdSet = new Set(createdFeeStructureIds.map((id) => String(id)));

  const currentRefs = batch.inserted_refs || {};

  batch.inserted_refs = {
    students: [
      ...(currentRefs.students || []),
      ...Array.from(studentIdSet).map((id) => new mongoose.Types.ObjectId(id)),
    ],
    fee_assignments: [
      ...(currentRefs.fee_assignments || []),
      ...touchedFeeAssignmentIds,
    ],
    fee_structures: [
      ...(currentRefs.fee_structures || []),
      ...Array.from(feeStructureIdSet).map((id) => new mongoose.Types.ObjectId(id)),
    ],
    transports: [
      ...(currentRefs.transports || []),
      ...Array.from(transportIdSet).map((id) => new mongoose.Types.ObjectId(id)),
    ],
  };

  await batch.save();

  return {
    importedStudents,
    importedFeeAccounts,
    importedFeeStructures,
    importedTransports,
    updatedStudents,
    updatedFeeAccounts,
    failedRows,
  };
}

router.post("/preview", async (req, res) => {
  try {
    const schoolId = normalizeText(req.body.schoolId);
    const moduleType = normalizeText(req.body.moduleType) as ModuleType;
    const rows = Array.isArray(req.body.rows) ? (req.body.rows as GenericRow[]) : [];
    const headers = Array.isArray(req.body.headers)
      ? (req.body.headers as unknown[]).map((header) => normalizeText(header)).filter(Boolean)
      : [];
    const useAiMapping = Boolean(req.body.useAiMapping);

    if (!schoolId) {
      return res.status(400).json({ message: "schoolId is required" });
    }

    if (!moduleType) {
      return res.status(400).json({ message: "moduleType is required" });
    }

    const school = await School.findById(schoolId).select("_id");
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const heuristicMapping = suggestMapping(headers, moduleType);
    const aiMapping = useAiMapping ? await suggestMappingWithAi(headers, moduleType) : null;
    const suggested = aiMapping ? { ...heuristicMapping, ...aiMapping } : heuristicMapping;
    const incomingMapping = req.body.mapping as Mapping | undefined;
    const appliedMapping = incomingMapping && Object.keys(incomingMapping).length > 0 ? incomingMapping : suggested;
    const mappingConfidenceByField = buildMappingConfidence({
      mapping: appliedMapping,
      aiMapping,
      headers,
      moduleType,
    });
    const mappedConfidenceValues = Object.values(mappingConfidenceByField);
    const mappingConfidence = mappedConfidenceValues.length
      ? mappedConfidenceValues.reduce((sum, value) => sum + value, 0) / mappedConfidenceValues.length
      : 0;
    const validation = await validateRows(schoolId, rows, appliedMapping, moduleType);

    return res.json({
      success: true,
      data: {
        moduleType,
        aiUsed: Boolean(aiMapping),
        mappingConfidence,
        mappingConfidenceByField,
        suggestedMapping: suggested,
        appliedMapping,
        summary: validation.summary,
        errors: validation.errors,
        duplicates: validation.duplicates,
        sampleCleanRows: validation.cleanRows.slice(0, 20),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("PREVIEW IMPORT ERROR:", error);
    return res.status(500).json({ message: `Failed to preview import: ${errorMsg}` });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const schoolId = normalizeText(req.body.schoolId);
    const moduleType = normalizeText(req.body.moduleType) as ModuleType;
    const rows = Array.isArray(req.body.rows) ? (req.body.rows as GenericRow[]) : [];
    const mapping = (req.body.mapping || {}) as Mapping;
    const fileName = normalizeText(req.body.fileName || "uploaded-file.xlsx");
    const sheetName = normalizeText(req.body.sheetName || "Sheet1");
    const academicYear = normalizeText(req.body.academicYear);

    if (!schoolId || !moduleType || !academicYear) {
      return res.status(400).json({ message: "schoolId, moduleType and academicYear are required" });
    }

    const school = await School.findById(schoolId).select("_id");
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const validation = await validateRows(schoolId, rows, mapping, moduleType);

    const batch = (await DataImportBatchModel.create({
      school_id: schoolId,
      module_type: moduleType,
      source_file_name: fileName,
      sheet_name: sheetName,
      academic_year: academicYear,
      status: "VALIDATED",
      mapping,
      summary: {
        total_rows: validation.summary.totalRows,
        valid_rows: validation.summary.validRows,
        invalid_rows: validation.summary.invalidRows,
        duplicate_rows: validation.summary.duplicateRows,
      },
      errors: validation.errors.map((entry) => ({
        row_number: entry.rowNumber,
        messages: entry.messages,
      })),
      duplicate_rows: validation.duplicates.map((entry) => ({
        row_number: entry.rowNumber,
        reason: entry.reason,
      })),
      normalized_rows: validation.cleanRows,
      inserted_refs: {
        students: [],
        fee_assignments: [],
        fee_structures: [],
        transports: [],
      },
    })) as unknown as DataImportBatchDocument;

    await createLog({
      action: "VALIDATE_DATA_IMPORT",
      message: `Validated ${moduleType} import file ${fileName} (${validation.summary.validRows}/${validation.summary.totalRows} clean rows)`,
      schoolId,
    });

    return res.json({
      success: true,
      data: {
        batchId: batch._id,
        summary: validation.summary,
        errors: validation.errors,
        duplicates: validation.duplicates,
        cleanRows: validation.cleanRows,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("VALIDATE IMPORT ERROR:", error);
    return res.status(500).json({ message: `Failed to validate import: ${errorMsg}` });
  }
});

router.post("/import", async (req, res) => {
  try {
    const schoolId = normalizeText(req.body.schoolId);
    const batchId = normalizeText(req.body.batchId);
    const duplicateMode = normalizeText(req.body.duplicateMode || "skip").toLowerCase() as "skip" | "update";

    if (!schoolId || !batchId) {
      return res.status(400).json({ message: "schoolId and batchId are required" });
    }

    if (!["skip", "update"].includes(duplicateMode)) {
      return res.status(400).json({ message: "duplicateMode must be skip or update" });
    }

    const batch = (await DataImportBatchModel.findOne({ _id: batchId, school_id: schoolId })) as
      | DataImportBatchDocument
      | null;
    if (!batch) {
      return res.status(404).json({ message: "Import batch not found" });
    }

    const rows = Array.isArray(batch.normalized_rows) ? (batch.normalized_rows as NormalizedRow[]) : [];

    if (rows.length === 0) {
      return res.status(400).json({ message: "No clean rows available in this batch" });
    }

    const result = await importCleanRows({
      schoolId,
      academicYear: batch.academic_year,
      rows,
      duplicateMode,
      batch,
    });

    batch.status = result.failedRows > 0 ? "IMPORT_FAILED" : "IMPORTED";
    batch.summary = {
      ...batch.summary,
      imported_students: result.importedStudents,
      imported_fee_accounts: result.importedFeeAccounts,
      imported_fee_structures: result.importedFeeStructures,
      imported_transports: result.importedTransports,
      updated_students: result.updatedStudents,
      updated_fee_accounts: result.updatedFeeAccounts,
      failed_rows: result.failedRows,
    };
    await batch.save();

    await createLog({
      action: "RUN_DATA_IMPORT",
      message: `Imported batch ${batch._id} (${result.importedStudents} students, ${result.importedFeeAccounts} fee accounts)`,
      schoolId,
    });

    return res.json({ success: true, data: { batchId: batch._id, result } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("RUN IMPORT ERROR:", error);
    return res.status(500).json({ message: `Failed to import batch: ${errorMsg}` });
  }
});

router.get("/history/:schoolId", async (req, res) => {
  try {
    const schoolId = normalizeText(req.params.schoolId);
    if (!schoolId) {
      return res.status(400).json({ message: "schoolId is required" });
    }

    const history = await DataImportBatchModel.find({ school_id: schoolId })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, data: history });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("IMPORT HISTORY ERROR:", error);
    return res.status(500).json({ message: `Failed to fetch import history: ${errorMsg}` });
  }
});

router.post("/rollback/:batchId", async (req, res) => {
  try {
    const batchId = normalizeText(req.params.batchId);
    const schoolId = normalizeText(req.body.schoolId);

    if (!batchId || !schoolId) {
      return res.status(400).json({ message: "batchId and schoolId are required" });
    }

    const batch = (await DataImportBatchModel.findOne({ _id: batchId, school_id: schoolId })) as
      | DataImportBatchDocument
      | null;
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    if (batch.status === "ROLLED_BACK") {
      return res.status(400).json({ message: "Batch already rolled back" });
    }

    const refs = batch.inserted_refs || {};

    if (Array.isArray(refs.fee_assignments) && refs.fee_assignments.length > 0) {
      await StudentFeeAssignmentModel.deleteMany({ _id: { $in: refs.fee_assignments } });
    }

    if (Array.isArray(refs.students) && refs.students.length > 0) {
      await Student.deleteMany({ _id: { $in: refs.students } });
    }

    if (Array.isArray(refs.fee_structures) && refs.fee_structures.length > 0) {
      await ClassFeeStructureModel.deleteMany({ _id: { $in: refs.fee_structures } });
    }

    if (Array.isArray(refs.transports) && refs.transports.length > 0) {
      await Transport.deleteMany({ _id: { $in: refs.transports } });
    }

    batch.status = "ROLLED_BACK";
    batch.rolled_back_at = new Date();
    await batch.save();

    await createLog({
      action: "ROLLBACK_DATA_IMPORT",
      message: `Rolled back import batch ${batch._id}`,
      schoolId,
    });

    return res.json({ success: true, data: { batchId: batch._id, status: batch.status } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("ROLLBACK IMPORT ERROR:", error);
    return res.status(500).json({ message: `Failed to rollback import batch: ${errorMsg}` });
  }
});

router.post("/reimport/:batchId", async (req, res) => {
  try {
    const batchId = normalizeText(req.params.batchId);
    const schoolId = normalizeText(req.body.schoolId);

    if (!batchId || !schoolId) {
      return res.status(400).json({ message: "batchId and schoolId are required" });
    }

    const originalBatch = (await DataImportBatchModel.findOne({ _id: batchId, school_id: schoolId })) as
      | DataImportBatchDocument
      | null;
    if (!originalBatch) {
      return res.status(404).json({ message: "Original batch not found" });
    }

    const rows = Array.isArray(originalBatch.normalized_rows)
      ? (originalBatch.normalized_rows as NormalizedRow[])
      : [];

    if (rows.length === 0) {
      return res.status(400).json({ message: "No normalized rows available for re-import" });
    }

    const newBatch = (await DataImportBatchModel.create({
      school_id: originalBatch.school_id,
      module_type: originalBatch.module_type,
      source_file_name: originalBatch.source_file_name,
      sheet_name: originalBatch.sheet_name,
      academic_year: originalBatch.academic_year,
      status: "VALIDATED",
      mapping: originalBatch.mapping,
      summary: {
        total_rows: rows.length,
        valid_rows: rows.length,
        invalid_rows: 0,
        duplicate_rows: 0,
      },
      errors: [],
      duplicate_rows: [],
      normalized_rows: rows,
      inserted_refs: {
        students: [],
        fee_assignments: [],
        fee_structures: [],
        transports: [],
      },
    })) as unknown as DataImportBatchDocument;

    const result = await importCleanRows({
      schoolId,
      academicYear: newBatch.academic_year,
      rows,
      duplicateMode: "update",
      batch: newBatch,
    });

    newBatch.status = result.failedRows > 0 ? "IMPORT_FAILED" : "IMPORTED";
    newBatch.summary = {
      ...newBatch.summary,
      imported_students: result.importedStudents,
      imported_fee_accounts: result.importedFeeAccounts,
      imported_fee_structures: result.importedFeeStructures,
      imported_transports: result.importedTransports,
      updated_students: result.updatedStudents,
      updated_fee_accounts: result.updatedFeeAccounts,
      failed_rows: result.failedRows,
    };
    await newBatch.save();

    await createLog({
      action: "REIMPORT_DATA_BATCH",
      message: `Re-imported batch ${batchId} into new batch ${newBatch._id}`,
      schoolId,
    });

    return res.json({ success: true, data: { originalBatchId: batchId, newBatchId: newBatch._id, result } });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("REIMPORT ERROR:", error);
    return res.status(500).json({ message: `Failed to re-import batch: ${errorMsg}` });
  }
});

export default router;
