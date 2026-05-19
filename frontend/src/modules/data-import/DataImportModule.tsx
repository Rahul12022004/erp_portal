import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Table,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

type ImportModuleType =
  | "student-master"
  | "class-fee"
  | "student-fee-record"
  | "transport"
  | "ledger"
  | "summary-fee";

// Student Master Fields
type StudentMasterFieldKey =
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
  | "admission_date";

// Class Fee Fields
type ClassFeeFieldKey =
  | "class"
  | "admission_fee"
  | "prospectus_fee"
  | "annual_charges"
  | "fee_per_month"
  | "no_of_month"
  | "total_fee"
  | "other_charges";

// Student Fee Record Fields
type StudentFeeRecordFieldKey =
  | "registration_no"
  | "student_name"
  | "class"
  | "section"
  | "fee_total"
  | "paid_amount"
  | "due_amount"
  | "discount_amount"
  | "paid_date"
  | "payment_mode"
  | "receipt_no";

// Transport Fields
type TransportFieldKey =
  | "registration_no"
  | "student_name"
  | "class"
  | "transport_route"
  | "vehicle"
  | "transport_status"
  | "transport_fee"
  | "stop_name"
  | "boarding_point";

// Ledger Fields
type LedgerFieldKey =
  | "ledger_id"
  | "ledger_names"
  | "designation"
  | "total_assigned"
  | "amount_paid"
  | "balance_remaining";

// Summary Fee Fields
type SummaryFeeFieldKey =
  | "class"
  | "section"
  | "total_students"
  | "total_fee"
  | "total_collected"
  | "total_outstanding"
  | "financial_year"
  | "average_fee_per_student";

type FieldKey = StudentMasterFieldKey | ClassFeeFieldKey | StudentFeeRecordFieldKey | TransportFieldKey | LedgerFieldKey | SummaryFeeFieldKey;

type Mapping = Partial<Record<FieldKey, string>>;

type ValidationSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  mismatchRows: number;
};

type ValidationError = {
  rowNumber: number;
  messages: string[];
};

type DuplicateError = {
  rowNumber: number;
  reason: string;
};

type PreviewResponse = {
  moduleType: ImportModuleType;
  aiUsed?: boolean;
  mappingConfidence?: number;
  mappingConfidenceByField?: Partial<Record<FieldKey, number>>;
  suggestedMapping: Mapping;
  appliedMapping: Mapping;
  summary: ValidationSummary;
  errors: ValidationError[];
  duplicates: DuplicateError[];
  sampleCleanRows: Array<Record<string, unknown>>;
};

type ValidateResponse = {
  batchId: string;
  summary: ValidationSummary;
  errors: ValidationError[];
  duplicates: DuplicateError[];
  cleanRows: Array<Record<string, unknown>>;
};

type HistoryBatch = {
  _id: string;
  module_type: ImportModuleType;
  source_file_name: string;
  sheet_name: string;
  academic_year: string;
  status: "VALIDATED" | "IMPORTED" | "ROLLED_BACK" | "IMPORT_FAILED";
  summary?: {
    total_rows?: number;
    imported_students?: number;
  };
};

const allFieldLabels: Record<FieldKey, string> = {
  // Student Master
  registration_no: "Registration No",
  student_name: "Student Name",
  father_name: "Father Name",
  mother_name: "Mother Name",
  mobile_number: "Mobile Number",
  email: "Email",
  class: "Class",
  section: "Section",
  address: "Address",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  blood_group: "Blood Group",
  admission_date: "Admission Date",
  // Class Fee
  admission_fee: "Admission Fee",
  prospectus_fee: "Prospectus Fee",
  annual_charges: "Annual Charges",
  fee_per_month: "Fee/Month",
  no_of_month: "No of Month",
  other_charges: "Other Charges",
  // Student Fee Record
  fee_total: "Fee Total",
  paid_amount: "Paid Amount",
  due_amount: "Due Amount",
  discount_amount: "Discount",
  paid_date: "Paid Date",
  payment_mode: "Payment Mode",
  receipt_no: "Receipt No",
  // Transport
  transport_route: "Transport Route",
  vehicle: "Vehicle",
  transport_status: "Transport Status",
  transport_fee: "Transport Fee",
  stop_name: "Stop Name",
  boarding_point: "Boarding Point",
  // Ledger
  ledger_id: "Ledger ID",
  ledger_names: "Names",
  designation: "Designation",
  total_assigned: "Total Amount Assigned",
  amount_paid: "Amount Paid",
  balance_remaining: "Balance Remaining",
  // Summary Fee
  total_students: "Total Students",
  total_fee: "Total Fee",
  total_collected: "Total Collected",
  total_outstanding: "Total Outstanding",
  financial_year: "Financial Year",
  average_fee_per_student: "Average Fee Per Student",
};

// Module-specific field definitions
const moduleFieldDefinitions: Record<
  ImportModuleType,
  {
    availableFields: FieldKey[];
    requiredFields: FieldKey[];
    hints: Array<{ label: string; suggestedField: FieldKey }>;
    description: string;
  }
> = {
  "student-master": {
    availableFields: [
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
    ] as FieldKey[],
    requiredFields: ["registration_no", "student_name", "class"] as FieldKey[],
    hints: [
      { label: "Admission/Registration No", suggestedField: "registration_no" },
      { label: "Student Name", suggestedField: "student_name" },
      { label: "Father's Name", suggestedField: "father_name" },
      { label: "Mother's Name", suggestedField: "mother_name" },
      { label: "Mobile/Contact Number", suggestedField: "mobile_number" },
      { label: "Class", suggestedField: "class" },
      { label: "Section", suggestedField: "section" },
    ],
    description: "Import student profile and admission master data",
  },
  "class-fee": {
    availableFields: [
      "class",
      "admission_fee",
      "prospectus_fee",
      "annual_charges",
      "fee_per_month",
      "no_of_month",
      "total_fee",
      "other_charges",
    ] as FieldKey[],
    requiredFields: ["class", "fee_per_month", "no_of_month", "total_fee"] as FieldKey[],
    hints: [
      { label: "Class", suggestedField: "class" },
      { label: "Admission Fee", suggestedField: "admission_fee" },
      { label: "Prospectus Fee", suggestedField: "prospectus_fee" },
      { label: "Annual Charges", suggestedField: "annual_charges" },
      { label: "Fee/Month", suggestedField: "fee_per_month" },
      { label: "No of Month", suggestedField: "no_of_month" },
      { label: "Total Fee", suggestedField: "total_fee" },
      { label: "Other Charges", suggestedField: "other_charges" },
    ],
    description: "Setup class-wise fee structure and allocations",
  },
  "student-fee-record": {
    availableFields: [
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
    ] as FieldKey[],
    requiredFields: ["registration_no", "student_name", "fee_total"] as FieldKey[],
    hints: [
      { label: "Admission/Registration No", suggestedField: "registration_no" },
      { label: "Student Name", suggestedField: "student_name" },
      { label: "Class", suggestedField: "class" },
      { label: "Total Fee", suggestedField: "fee_total" },
      { label: "Amount Paid/Received", suggestedField: "paid_amount" },
      { label: "Balance/Outstanding", suggestedField: "due_amount" },
      { label: "Discount/Concession", suggestedField: "discount_amount" },
      { label: "Paid Date", suggestedField: "paid_date" },
    ],
    description: "Import student fee payments and outstanding records",
  },
  transport: {
    availableFields: [
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
    ] as FieldKey[],
    requiredFields: ["registration_no", "student_name", "transport_route"] as FieldKey[],
    hints: [
      { label: "Admission/Registration No", suggestedField: "registration_no" },
      { label: "Student Name", suggestedField: "student_name" },
      { label: "Class", suggestedField: "class" },
      { label: "Transport Route", suggestedField: "transport_route" },
      { label: "Vehicle/Bus No", suggestedField: "vehicle" },
      { label: "Transport Status (Active/Inactive)", suggestedField: "transport_status" },
      { label: "Transport Fee", suggestedField: "transport_fee" },
    ],
    description: "Setup transport routes and student allocations",
  },
  ledger: {
    availableFields: [
      "ledger_id",
      "ledger_names",
      "designation",
      "total_assigned",
      "amount_paid",
      "balance_remaining",
    ] as FieldKey[],
    requiredFields: ["ledger_names", "total_assigned"] as FieldKey[],
    hints: [
      { label: "Ledger ID", suggestedField: "ledger_id" },
      { label: "Names", suggestedField: "ledger_names" },
      { label: "Designation", suggestedField: "designation" },
      { label: "Total Amount Assigned", suggestedField: "total_assigned" },
      { label: "Amount Paid", suggestedField: "amount_paid" },
      { label: "Balance Remaining", suggestedField: "balance_remaining" },
    ],
    description: "Import accounting ledger entries and balances",
  },
  "summary-fee": {
    availableFields: [
      "class",
      "section",
      "total_students",
      "total_fee",
      "total_collected",
      "total_outstanding",
      "financial_year",
      "average_fee_per_student",
    ] as FieldKey[],
    requiredFields: ["class", "financial_year"] as FieldKey[],
    hints: [
      { label: "Class", suggestedField: "class" },
      { label: "Section", suggestedField: "section" },
      { label: "Total Students", suggestedField: "total_students" },
      { label: "Total Fee Amount", suggestedField: "total_fee" },
      { label: "Total Collected", suggestedField: "total_collected" },
      { label: "Outstanding Amount", suggestedField: "total_outstanding" },
      { label: "Financial Year", suggestedField: "financial_year" },
    ],
    description: "Import summarized historical fee data",
  },
};

function getFieldLabelsForModule(moduleType: ImportModuleType): Record<string, string> {
  const availableFields = moduleFieldDefinitions[moduleType].availableFields;
  const result: Record<string, string> = {};
  availableFields.forEach((field) => {
    result[field] = allFieldLabels[field];
  });
  return result;
}

const importModules: Array<{ value: ImportModuleType; label: string; help: string }> = [
  {
    value: "student-master",
    label: "Student Master",
    help: "Use this for student profile and admission master data.",
  },
  {
    value: "class-fee",
    label: "Class Fee",
    help: "Use this for class-wise fee setup and student fee allocation.",
  },
  {
    value: "student-fee-record",
    label: "Student Fee Record",
    help: "Use this for student-wise fee payment and outstanding record imports.",
  },
  {
    value: "transport",
    label: "Transport",
    help: "Use this for transport route, vehicle, and transport status migration.",
  },
  {
    value: "ledger",
    label: "Ledger",
    help: "Use this for ledger and opening balance-style records.",
  },
  {
    value: "summary-fee",
    label: "Summary Fee",
    help: "Use this for summarized historical fee data imports.",
  },
];

// Helper functions
function getSchoolId(): string {
  try {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    return school?._id || "";
  } catch {
    return "";
  }
}

function toCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((cells) => cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadTextFile(fileName: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isImportedMessage(message: string): boolean {
  return message.toLowerCase().includes("imported successfully");
}

function toPercent(confidence: number | undefined): string {
  if (typeof confidence !== "number") {
    return "--";
  }
  return `${Math.round(confidence * 100)}%`;
}

// Field value normalization map
const normalizedFieldKeyMap: Record<FieldKey, string> = {
  // Student Master
  registration_no: "registrationNo",
  student_name: "studentName",
  father_name: "fatherName",
  mother_name: "motherName",
  mobile_number: "mobileNumber",
  email: "email",
  class: "className",
  section: "section",
  address: "address",
  date_of_birth: "dateOfBirth",
  gender: "gender",
  blood_group: "bloodGroup",
  admission_date: "admissionDate",
  // Class Fee
  admission_fee: "admissionFee",
  prospectus_fee: "prospectusFee",
  annual_charges: "annualCharges",
  fee_per_month: "feePerMonth",
  no_of_month: "noOfMonth",
  other_charges: "otherCharges",
  // Student Fee Record
  fee_total: "feeTotal",
  paid_amount: "paidAmount",
  due_amount: "dueAmount",
  discount_amount: "discountAmount",
  paid_date: "paidDate",
  payment_mode: "paymentMode",
  receipt_no: "receiptNo",
  // Transport
  transport_route: "transportRoute",
  vehicle: "vehicle",
  transport_status: "transportStatus",
  transport_fee: "transportFee",
  stop_name: "stopName",
  boarding_point: "boardingPoint",
  // Ledger
  ledger_id: "ledgerId",
  ledger_names: "ledgerNames",
  designation: "designation",
  total_assigned: "totalAssigned",
  amount_paid: "amountPaid",
  balance_remaining: "balanceRemaining",
  // Summary Fee
  total_students: "totalStudents",
  total_fee: "totalFee",
  total_collected: "totalCollected",
  total_outstanding: "totalOutstanding",
  financial_year: "financialYear",
  average_fee_per_student: "averageFeePerStudent",
};

function getSampleFieldValue(row: Record<string, unknown>, field: FieldKey, mappedHeader?: string): string {
  const normalizedKey = normalizedFieldKeyMap[field];
  const normalizedValue = row[normalizedKey];
  if (normalizedValue !== undefined && normalizedValue !== null && String(normalizedValue).trim() !== "") {
    return String(normalizedValue);
  }

  if (mappedHeader) {
    const rawValue = row[mappedHeader];
    if (rawValue !== undefined && rawValue !== null) {
      return String(rawValue);
    }
  }

  return "";
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  try {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ignore localStorage errors
  }
  
  return headers;
}

async function fetchDataImport(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Server error (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData?.message || errorMsg;
      } catch {
        // Failed to parse error response
        errorMsg = `Server error (${response.status}): ${errorText.slice(0, 100)}`;
      }
      
      console.error("DataImport API Error:", { status: response.status, message: errorMsg, url });
      throw new Error(errorMsg);
    }
    
    return response;
  } catch (error) {
    console.error("DataImport Fetch Error:", { error, url });
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error) || "Network request failed");
  }
}

export default function DataImportModule() {
  const [moduleType, setModuleType] = useState<ImportModuleType>("student-master");
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [customFinancialYearInput, setCustomFinancialYearInput] = useState("");
  const [usingCustomFinancialYear, setUsingCustomFinancialYear] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [rowsBySheet, setRowsBySheet] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [headersBySheet, setHeadersBySheet] = useState<Record<string, string[]>>({});
  const [mapping, setMapping] = useState<Mapping>({});
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [batchId, setBatchId] = useState<string>("");
  const [history, setHistory] = useState<HistoryBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [pendingMappingConfirmation, setPendingMappingConfirmation] = useState(false);
  const [showMappingEditor, setShowMappingEditor] = useState(true);
  const [showDataView, setShowDataView] = useState(false);

  const schoolId = getSchoolId();
  const currentRows = sheetName ? rowsBySheet[sheetName] || [] : [];
  const currentHeaders = sheetName ? headersBySheet[sheetName] || [] : [];
  
  // Get module-specific field definitions
  const moduleDefinition = moduleFieldDefinitions[moduleType];
  const fieldLabels = getFieldLabelsForModule(moduleType);
  const requiredFields = moduleDefinition.requiredFields;
  const availableFieldKeys = moduleDefinition.availableFields;
  const moduleMappingHints = moduleDefinition.hints;
  
  const missingRequiredMappings = requiredFields.filter((field) => !mapping[field]);

  const mappedFields = useMemo(
    () => (availableFieldKeys as FieldKey[]).filter((field) => Boolean(mapping[field])),
    [mapping, availableFieldKeys]
  );

  const financialYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;

    return Array.from({ length: 7 }, (_, index) => {
      const fromYear = startYear + index;
      return `${fromYear}-${fromYear + 1}`;
    });
  }, []);

  const isCustomYearActive = usingCustomFinancialYear || !financialYearOptions.includes(academicYear);

  const handleFinancialYearSelect = (value: string) => {
    if (value === "__custom__") {
      setUsingCustomFinancialYear(true);
      setCustomFinancialYearInput(academicYear);
      return;
    }

    setUsingCustomFinancialYear(false);
    setAcademicYear(value);
  };

  const applyCustomFinancialYear = () => {
    const trimmed = customFinancialYearInput.trim();
    if (!trimmed) {
      return;
    }

    setAcademicYear(trimmed);
    setUsingCustomFinancialYear(true);
  };

  const progressPercent = useMemo(() => {
    let done = 0;
    if (fileName) {
      done += 25;
    }
    if (preview) {
      done += 25;
    }
    if (validation?.batchId) {
      done += 25;
    }
    if (validation?.batchId && isImportedMessage(message)) {
      done += 25;
    }
    return done;
  }, [fileName, preview, validation, message]);

  const parseWorkbook = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const nextRowsBySheet: Record<string, Array<Record<string, unknown>>> = {};
    const nextHeadersBySheet: Record<string, string[]> = {};

    workbook.SheetNames.forEach((name) => {
      const worksheet = workbook.Sheets[name];
      const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });
      nextRowsBySheet[name] = sheetRows;
      nextHeadersBySheet[name] = sheetRows.length > 0 ? Object.keys(sheetRows[0]) : [];
    });

    setRowsBySheet(nextRowsBySheet);
    setHeadersBySheet(nextHeadersBySheet);
    setSheetNames(workbook.SheetNames);
    setSheetName(workbook.SheetNames[0] || "");
  };

  const onUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setPreview(null);
    setValidation(null);
    setBatchId("");
    setShowImportPreview(false);
    setPendingMappingConfirmation(false);
    setShowMappingEditor(true);
    setFileName(file.name);

    try {
      await parseWorkbook(file);
      setMessage("Workbook loaded. Select sheet and run preview.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to parse workbook");
    }
  };

  const runPreview = async (useAiMapping = false) => {
    if (!schoolId) {
      setError("School session missing. Please login again.");
      return;
    }

    if (!sheetName || currentRows.length === 0) {
      setError("Choose a sheet with rows before preview.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetchDataImport(`/api/data-import/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          moduleType,
          useAiMapping,
          headers: currentHeaders,
          rows: currentRows,
          mapping,
        }),
      });

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || "Preview failed");
      }

      const data = payload.data as PreviewResponse;
      setPreview(data);
      setMapping(data.appliedMapping || {});
      const needsConfirmation = useAiMapping && Boolean(data.aiUsed);
      setPendingMappingConfirmation(needsConfirmation);
      setShowMappingEditor(!needsConfirmation);
      setMessage(
        needsConfirmation
          ? "AI mapping generated. Confirm mapping or open edit mode."
          : "Preview generated. Verify mapping and run validation."
      );
    } catch (previewError) {
      const errorMsg = previewError instanceof Error ? previewError.message : String(previewError);
      setError(errorMsg || "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    if (!schoolId) {
      setError("School session missing. Please login again.");
      return;
    }

    if (!sheetName || currentRows.length === 0) {
      setError("Choose a sheet with rows before validation.");
      return;
    }

    if (!academicYear.trim()) {
      setError("Academic year is required.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetchDataImport(`/api/data-import/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          moduleType,
          fileName,
          sheetName,
          academicYear,
          rows: currentRows,
          mapping,
        }),
      });

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || "Validation failed");
      }

      const data = payload.data as ValidateResponse;
      setValidation(data);
      setBatchId(data.batchId);
      setShowImportPreview(data.summary.validRows > 0);
      setMessage(`Validation complete. ${data.summary.validRows} clean rows are ready for import.`);
    } catch (validationError) {
      const errorMsg = validationError instanceof Error ? validationError.message : String(validationError);
      setError(errorMsg || "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    if (!schoolId || !batchId) {
      setError("Validate file before import.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetchDataImport(`/api/data-import/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          batchId,
          duplicateMode: moduleType === "student-fee-record" ? "update" : "skip",
        }),
      });

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || "Import failed");
      }

      const result = payload.data?.result;
      setMessage(
        `Imported successfully: students ${result?.importedStudents || 0}, fee accounts ${result?.importedFeeAccounts || 0}, failures ${result?.failedRows || 0}.`
      );
      await loadHistory();
    } catch (importError) {
      const errorMsg = importError instanceof Error ? importError.message : String(importError);
      setError(errorMsg || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    try {
      const response = await fetchDataImport(`/api/data-import/history/${schoolId}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.success) {
          setHistory((payload.data || []) as HistoryBatch[]);
        }
      }
    } catch {
      // ignore history load errors (non-critical)
    }
  }, [schoolId]);

  const rollbackBatch = async (selectedBatchId: string) => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchDataImport(`/api/data-import/rollback/${selectedBatchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || "Rollback failed");
      }

      setMessage(`Batch ${selectedBatchId} rolled back successfully.`);
      await loadHistory();
    } catch (rollbackError) {
      const errorMsg = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      setError(errorMsg || "Rollback failed");
    } finally {
      setLoading(false);
    }
  };

  const reimportBatch = async (selectedBatchId: string) => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchDataImport(`/api/data-import/reimport/${selectedBatchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Re-import failed";
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData?.message || errorMsg;
        } catch {
          errorMsg = `Server error (${response.status}): ${errorText.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || "Re-import failed");
      }

      setMessage(`Re-import complete. New batch: ${payload.data?.newBatchId}`);
      await loadHistory();
    } catch (reimportError) {
      const errorMsg = reimportError instanceof Error ? reimportError.message : String(reimportError);
      setError(errorMsg || "Re-import failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!validation) {
      return;
    }

    const rows: Array<Array<string | number>> = [["Type", "Row Number", "Details"]];

    validation.errors.forEach((entry) => {
      rows.push(["Validation", entry.rowNumber, entry.messages.join(" | ")]);
    });

    validation.duplicates.forEach((entry) => {
      rows.push(["Duplicate", entry.rowNumber, entry.reason]);
    });

    downloadTextFile(`import-errors-${Date.now()}.csv`, toCsv(rows));
  };

  useEffect(() => {
    void loadHistory();
  }, [schoolId, loadHistory]);

  // Clear mapping, preview, and validation when module type changes
  useEffect(() => {
    setMapping({});
    setPreview(null);
    setValidation(null);
    setBatchId("");
    setMessage("");
    setError("");
  }, [moduleType]);

  const processSteps = [
    { num: 1, label: "Choose Type", status: moduleType ? "done" : "pending" },
    { num: 2, label: "Upload File", status: fileName ? "done" : "pending" },
    { num: 3, label: "Map Columns", status: currentHeaders.length > 0 ? "done" : "pending" },
    { num: 4, label: "Validate", status: validation ? "done" : preview ? "active" : "pending" },
    {
      num: 5,
      label: "Import",
      status: validation && !isImportedMessage(message) ? "active" : batchId && isImportedMessage(message) ? "done" : "pending",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">ERP Data Import and Migration</h3>
            <p className="mt-1 text-sm text-slate-600">
              Upload legacy Excel files, map columns, validate data quality, and import clean historical records safely.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Financial Year: {academicYear}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={isCustomYearActive ? "__custom__" : academicYear}
              onChange={(event) => handleFinancialYearSelect(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500"
            >
              {financialYearOptions.map((yearOption) => (
                <option key={`fy-${yearOption}`} value={yearOption}>
                  {yearOption}
                </option>
              ))}
              <option value="__custom__">Custom Year...</option>
            </select>

            {isCustomYearActive && (
              <div className="flex items-center gap-2">
                <input
                  value={customFinancialYearInput}
                  onChange={(event) => setCustomFinancialYearInput(event.target.value)}
                  placeholder="e.g. 2021-2022"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={applyCustomFinancialYear}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Apply
                </button>
              </div>
            )}

            <button
              onClick={() => void loadHistory()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <History className="h-4 w-4" />
              Refresh History
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-full bg-white/70 p-1">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-600">Progress {progressPercent}%</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h4 className="mb-4 text-lg font-semibold text-slate-900">Process Steps</h4>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {processSteps.map((step) => {
            const statusColor =
              step.status === "done"
                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                : step.status === "active"
                  ? "bg-blue-100 text-blue-700 border-blue-300"
                  : "bg-slate-100 text-slate-600 border-slate-300";

            return (
              <div key={step.num} className={`rounded-lg border-2 ${statusColor} p-3 text-center`}>
                <p className="text-sm font-bold">{step.num}</p>
                <p className="mt-1 text-xs font-semibold">{step.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {showDataView && currentRows.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-8">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Table className="h-5 w-5 text-blue-600" />
                  Data View
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fileName}
                  {sheetNames.length > 1 && (
                    <span className="ml-2 text-slate-400">— Sheet:</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {sheetNames.length > 1 && (
                  <select
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                  >
                    {sheetNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {currentRows.length} rows · {currentHeaders.length} columns
                </span>
                <button
                  onClick={() => setShowDataView(false)}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Column legend */}
            <div className="border-b border-slate-200 bg-blue-50/60 px-6 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Column Mapping Status</p>
              <div className="flex flex-wrap gap-2">
                {currentHeaders.map((header) => {
                  const mappedField = (Object.entries(mapping) as [string, string][]).find(
                    ([, v]) => v === header
                  )?.[0] as FieldKey | undefined;
                  const isRequired = mappedField ? requiredFields.includes(mappedField) : false;
                  const isMapped = Boolean(mappedField);

                  return (
                    <span
                      key={header}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        isRequired
                          ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                          : isMapped
                            ? "border-blue-300 bg-blue-100 text-blue-800"
                            : "border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      {header}
                      {isMapped && (
                        <span className="ml-1 rounded-full bg-white/70 px-1.5 text-[10px] font-bold">
                          → {fieldLabels[mappedField!] ?? mappedField}
                        </span>
                      )}
                      {isRequired && <span className="text-emerald-600">✓</span>}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-200 border border-emerald-400" /> Required & mapped</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-200 border border-blue-300" /> Mapped (optional)</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-white border border-slate-300" /> Not mapped</span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="border-b-2 border-r border-slate-300 bg-slate-200 px-3 py-2.5 text-center font-semibold text-slate-600 text-[11px] w-10">#</th>
                    {currentHeaders.map((header) => {
                      const mappedField = (Object.entries(mapping) as [string, string][]).find(
                        ([, v]) => v === header
                      )?.[0] as FieldKey | undefined;
                      const isRequired = mappedField ? requiredFields.includes(mappedField) : false;
                      const isMapped = Boolean(mappedField);

                      return (
                        <th
                          key={header}
                          className={`border-b-2 border-r px-3 py-2.5 text-left font-bold text-[11px] whitespace-nowrap ${
                            isRequired
                              ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                              : isMapped
                                ? "border-blue-300 bg-blue-100 text-blue-900"
                                : "border-slate-300 bg-slate-100 text-slate-600"
                          }`}
                        >
                          <div>{header}</div>
                          {isMapped && (
                            <div className={`mt-0.5 text-[9px] font-semibold ${isRequired ? "text-emerald-600" : "text-blue-500"}`}>
                              ↳ {fieldLabels[mappedField!] ?? mappedField}
                              {isRequired && " ★"}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.slice(0, 200).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={rowIdx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-100"}
                    >
                      <td className="border-b border-r border-slate-200 px-3 py-1.5 text-center text-slate-400 font-mono text-[10px]">
                        {rowIdx + 2}
                      </td>
                      {currentHeaders.map((header) => {
                        const mappedField = (Object.entries(mapping) as [string, string][]).find(
                          ([, v]) => v === header
                        )?.[0] as FieldKey | undefined;
                        const isRequired = mappedField ? requiredFields.includes(mappedField) : false;
                        const isMapped = Boolean(mappedField);
                        const cellValue = String(row[header] ?? "");
                        const isEmpty = cellValue.trim() === "";

                        return (
                          <td
                            key={header}
                            className={`border-b border-r px-3 py-1.5 max-w-[200px] truncate ${
                              isRequired
                                ? isEmpty
                                  ? "border-red-200 bg-red-50 text-red-500 italic"
                                  : "border-emerald-100 bg-emerald-50/40 text-emerald-900"
                                : isMapped
                                  ? "border-blue-100 bg-blue-50/30 text-blue-900"
                                  : "border-slate-100 text-slate-600"
                            }`}
                            title={cellValue}
                          >
                            {isEmpty
                              ? <span className="text-[10px] text-slate-300 italic">—</span>
                              : cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentRows.length > 200 && (
                <p className="p-3 text-center text-xs text-slate-400">
                  Showing first 200 of {currentRows.length} rows
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 rounded-b-2xl">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-emerald-700">{Object.keys(mapping).filter(k => mapping[k as FieldKey]).length}</span> columns mapped ·{" "}
                <span className="font-semibold text-slate-700">{currentHeaders.length}</span> total columns
              </p>
              <button
                onClick={() => setShowDataView(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportPreview && validation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900">Review Import</h3>
            <p className="mt-1 text-sm text-slate-600">Confirm destination and preview the data before import.</p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-semibold text-blue-900">Import Destination</h4>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-blue-700">Module Type</p>
                    <p className="mt-1 text-sm font-semibold text-blue-900">
                      {importModules.find((mod) => mod.value === moduleType)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700">Academic Year</p>
                    <p className="mt-1 text-sm font-semibold text-blue-900">{academicYear}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700">School</p>
                    <p className="mt-1 text-sm font-semibold text-blue-900">{schoolId ? `${schoolId.slice(0, 8)}...` : "Unknown"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="text-sm font-semibold text-emerald-900">Import Summary</h4>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-emerald-700">Rows to Import</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900">{validation.summary.validRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-700">Skipped Invalid</p>
                    <p className="mt-1 text-2xl font-bold text-amber-900">{validation.summary.invalidRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-700">Skipped Duplicates</p>
                    <p className="mt-1 text-2xl font-bold text-rose-900">{validation.summary.duplicateRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Total Rows</p>
                    <p className="mt-1 text-2xl font-bold text-blue-900">{validation.summary.totalRows}</p>
                  </div>
                </div>
              </div>

              {validation.cleanRows.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Sample Data (First 5 Rows)</h4>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          {mappedFields.map((field) => (
                            <th key={field} className="border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                              {fieldLabels[field]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {validation.cleanRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50">
                            {mappedFields.map((field) => {
                              const mappedCol = mapping[field];
                              const value = getSampleFieldValue(row, field, mappedCol);
                              return (
                                <td key={`${idx}-${field}`} className="border-r border-slate-200 px-3 py-2 text-slate-700">
                                  {String(value ?? "").slice(0, 50)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={loading}
                onClick={async () => {
                  await runImport();
                  setShowImportPreview(false);
                }}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
                Confirm Import
              </button>
              <button
                disabled={loading}
                onClick={() => setShowImportPreview(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <div className="flex items-start gap-2">
            {error ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
            <span>{error || message}</span>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Import Type</p>
            <div className="flex flex-wrap gap-2">
              {importModules.map((item) => {
                const isSelected = moduleType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setModuleType(item.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? "border-amber-600 bg-amber-100 text-amber-900"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            Financial Year
            <select
              value={isCustomYearActive ? "__custom__" : academicYear}
              onChange={(event) => handleFinancialYearSelect(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
            >
              {financialYearOptions.map((yearOption) => (
                <option key={`form-fy-${yearOption}`} value={yearOption}>
                  {yearOption}
                </option>
              ))}
              <option value="__custom__">Custom Year...</option>
            </select>

            {isCustomYearActive && (
              <div className="flex items-center gap-2">
                <input
                  value={customFinancialYearInput}
                  onChange={(event) => setCustomFinancialYearInput(event.target.value)}
                  placeholder="e.g. 2020-2021"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={applyCustomFinancialYear}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Apply
                </button>
              </div>
            )}
          </label>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {importModules.find((item) => item.value === moduleType)?.help}
          </p>

          <div className="rounded-xl border border-dashed border-slate-300 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                <Upload className="h-4 w-4" />
                Upload Excel Workbook
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onUploadFile} />
              </label>
              {currentRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDataView(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Table className="h-4 w-4" />
                  View Data
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Supported: .xlsx, .xls</p>
            {fileName && <p className="mt-2 text-sm font-medium text-slate-700">File: {fileName}</p>}
          </div>


          <div className="flex flex-wrap gap-2">
            <button
              disabled={loading || currentRows.length === 0}
              onClick={() => void runPreview()}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Preview
            </button>

            <button
              disabled={loading || currentRows.length === 0}
              onClick={() => void runPreview(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              AI Auto-Match
            </button>

            <button
              disabled={loading || currentRows.length === 0 || pendingMappingConfirmation}
              onClick={() => void runValidation()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Validate
            </button>

            <button
              disabled={loading || !batchId}
              onClick={() => setShowImportPreview(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Import Clean Data
            </button>

            <button
              disabled={!validation}
              onClick={downloadErrorReport}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Download Error Report
            </button>
          </div>

          {pendingMappingConfirmation && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm font-semibold text-indigo-900">AI mapping is ready. Please confirm before validation.</p>
              {preview?.mappingConfidenceByField && mappedFields.length > 0 && (
                <div className="mt-3 rounded-lg border border-indigo-200 bg-white p-3">
                  <p className="text-xs font-semibold text-indigo-900">
                    Field Confidence (overall {toPercent(preview.mappingConfidence)})
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {mappedFields.map((field) => (
                      <p key={`confirm-${field}`} className="text-xs text-indigo-800">
                        {fieldLabels[field]}: {toPercent(preview.mappingConfidenceByField?.[field])}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingMappingConfirmation(false);
                    setShowMappingEditor(false);
                    setMessage("AI mapping confirmed. You can run validation now.");
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Confirm Mapping
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingMappingConfirmation(false);
                    setShowMappingEditor(true);
                    setMessage("Edit mappings if needed, then run validation.");
                  }}
                  className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Edit Mapping
                </button>
              </div>
            </div>
          )}

          {currentHeaders.length > 0 && showMappingEditor && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Column Mapping</h4>
              <p className="mt-1 text-xs text-slate-500">Map Excel columns to ERP fields. Unmapped fields will be left blank.</p>

              {moduleMappingHints[moduleType]?.length ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-900">Suggested Columns For Student Fee Record</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {moduleMappingHints[moduleType]?.map((hint) => (
                      <p key={`${hint.label}-${hint.suggestedField}`} className="text-xs text-blue-800">
                        {`${hint.label} -> ${fieldLabels[hint.suggestedField]}`}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {availableFieldKeys.map((field) => (
                  <label key={field} className="space-y-1 text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <span>{fieldLabels[field]}</span>
                      {requiredFields.includes(field) && <span className="text-red-600">*</span>}
                      {mapping[field] && preview?.mappingConfidenceByField?.[field] !== undefined && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {toPercent(preview.mappingConfidenceByField[field])}
                        </span>
                      )}
                    </span>
                    <select
                      value={mapping[field] || ""}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field]: event.target.value || undefined,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                    >
                      <option value="">Not mapped</option>
                      {currentHeaders.map((header) => (
                        <option key={`${field}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {preview && (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Validation Preview</h4>
              <div className="text-sm text-slate-600">
                Rows loaded: <span className="font-semibold text-slate-800">{currentRows.length}</span>
              </div>
              {preview.summary.validRows === 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <p className="font-semibold">No clean rows found.</p>
                  <p className="mt-1">Most common reasons are missing required mappings or invalid values in required columns.</p>
                  {missingRequiredMappings.length > 0 && (
                    <p className="mt-1">
                      Required fields not mapped: {missingRequiredMappings.map((field) => fieldLabels[field]).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {preview.errors.length > 0 && (
                <div className="max-h-56 overflow-auto rounded-lg border border-rose-200">
                  <table className="w-full text-xs">
                    <thead className="bg-rose-50 text-rose-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Row</th>
                        <th className="px-3 py-2 text-left">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.errors.slice(0, 12).map((entry) => (
                        <tr key={`pe-${entry.rowNumber}`} className="border-t border-rose-100">
                          <td className="px-3 py-2 font-medium">{entry.rowNumber}</td>
                          <td className="px-3 py-2">{entry.messages.join(" | ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.duplicates.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-lg border border-amber-200">
                  <table className="w-full text-xs">
                    <thead className="bg-amber-50 text-amber-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Row</th>
                        <th className="px-3 py-2 text-left">Duplicate Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.duplicates.slice(0, 12).map((entry) => (
                        <tr key={`pd-${entry.rowNumber}`} className="border-t border-amber-100">
                          <td className="px-3 py-2 font-medium">{entry.rowNumber}</td>
                          <td className="px-3 py-2">{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="text-base font-semibold text-slate-900">Batch History</h4>
          <p className="text-xs text-slate-500">View import logs, rollback imported batches, or trigger re-import.</p>

          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500">
              No batches yet. Validate/import a file to create history.
            </div>
          ) : (
            <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
              {history.map((batch) => (
                <div key={batch._id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{batch.module_type}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{batch.source_file_name}</p>
                  <p className="text-xs text-slate-500">{batch.sheet_name} | {batch.academic_year}</p>
                  <p className="mt-1 text-xs text-slate-600">Status: <span className="font-semibold">{batch.status}</span></p>
                  <p className="text-xs text-slate-500">Rows: {batch.summary?.total_rows || 0} | Imported students: {batch.summary?.imported_students || 0}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      disabled={loading || batch.status === "ROLLED_BACK"}
                      onClick={() => void rollbackBatch(batch._id)}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Rollback
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => void reimportBatch(batch._id)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> Re-import
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
