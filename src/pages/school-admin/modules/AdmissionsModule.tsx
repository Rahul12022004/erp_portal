import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ChevronDown, ChevronRight, Download, IdCard, Printer, UserPlus, X } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { API_URL } from "@/lib/api";
import { readStoredSchoolSession } from "@/lib/auth";

type Student = {
  _id: string;
  formNumber?: string;
  admissionNumber?: string;
  name: string;
  email: string;
  class: string;
  classSection?: string;
  academicYear?: string;
  rollNumber: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  photo?: string;
  aadharCardDocument?: string;
  bodCertificate?: string;
  rteDocument?: string;
  hasParentConsent?: boolean;
  createdAt?: string;
};

const getMissingDocs = (s: Student): string[] => {
  const missing: string[] = [];
  if (!s.rteDocument) missing.push("Right to Education Document");
  if (!s.bodCertificate) missing.push("DOB Certificate");
  if (!s.aadharCardDocument) missing.push("Aadhaar Card");
  return missing;
};

const isAdmissionComplete = (s: Student) => getMissingDocs(s).length === 0;

type AdmissionForm = {
  formNumber: string;
  formDate: string;
  admissionNumber: string;
  name: string;
  email: string;
  class: string;
  classSection: string;
  academicYear: string;
  rollNumber: string;
  phone: string;
  aadharNumber: string;
  placeOfBirth: string;
  state: string;
  nationality: string;
  religion: string;
  address: string;
  pinCode: string;
  dateOfBirth: string;
  gender: string;
  caste: string;
  motherTongue: string;
  bloodGroup: string;
  identificationMarks: string;
  previousAcademicRecord: string;
  achievements: string;
  generalBehaviour: string;
  medicalHistory: string;
  languagePreferences: string;
  hasParentConsent: boolean;
  needsTransport: boolean;
  busConsent: boolean;
  photo: string;
  rteDocument: string;
  bodCertificate: string;
};

type ParsedAdmissionRow = {
  name: string;
  email: string;
  class: string;
  rollNumber: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
};

type SchoolClassSummary = {
  _id: string;
  name: string;
  section?: string;
};

type SchoolImportClassPreview = {
  name: string;
  section: string;
  label: string;
};

type SchoolNameSession = {
  name?: string;
  schoolInfo?: {
    name?: string;
    logo?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
};

type SchoolDataImportRow = {
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
  address: string;
  dateOfBirth: string;
  gender: string;
  aadharNumber: string;
  religion: string;
  caste: string;
  needsTransport: boolean;
  busConsent: boolean;
};

type InvalidSchoolDataImportRow = {
  rowNumber: number;
  reason: string;
};

type SchoolDataImportResult = {
  totalRows: number;
  validRows: number;
  invalidRows: InvalidSchoolDataImportRow[];
  classesCreated: string[];
  importedCount: number;
  duplicateCount: number;
  duplicates: InvalidSchoolDataImportRow[];
  failureCount: number;
  failures: InvalidSchoolDataImportRow[];
};

const emptyForm: AdmissionForm = {
  formNumber: "",
  formDate: "",
  admissionNumber: "",
  name: "",
  email: "",
  class: "",
  classSection: "",
  academicYear: "",
  rollNumber: "",
  phone: "",
  aadharNumber: "",
  placeOfBirth: "",
  state: "",
  nationality: "Indian",
  religion: "",
  address: "",
  pinCode: "",
  dateOfBirth: "",
  gender: "",
  caste: "",
  motherTongue: "",
  bloodGroup: "",
  identificationMarks: "",
  previousAcademicRecord: "",
  achievements: "",
  generalBehaviour: "",
  medicalHistory: "",
  languagePreferences: "",
  hasParentConsent: false,
  needsTransport: false,
  busConsent: false,
  photo: "",
  rteDocument: "",
  bodCertificate: "",
};

const getRowValue = (row: Record<string, unknown>, keys: string[]): string => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.trim().toLowerCase();
    if (keys.includes(normalized)) {
      return String(value ?? "").trim();
    }
  }
  return "";
};

const normalizeDate = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = XLSX.SSF.parse_date_code(Number(trimmed));
    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }
  return date.toISOString().slice(0, 10);
};

const parseAdmissionRows = (rows: Record<string, unknown>[]): ParsedAdmissionRow[] => {
  return rows
    .map((row) => ({
      name: getRowValue(row, ["name", "full name", "student name"]),
      email: getRowValue(row, ["email", "email address"]),
      class: getRowValue(row, ["class", "classname", "class name"]),
      rollNumber: getRowValue(row, ["roll number", "rollnumber", "roll no", "rollno"]),
      phone: getRowValue(row, ["phone", "mobile", "phone number", "contact"]),
      address: getRowValue(row, ["address", "student address"]),
      dateOfBirth: normalizeDate(getRowValue(row, ["date of birth", "dob", "birth date"])),
      gender: getRowValue(row, ["gender", "sex"]),
    }))
    .filter((row) => row.name && row.email && row.class && row.rollNumber);
};

const normalizeTextValue = (value: unknown): string => String(value ?? "").trim();

const normalizeUpperText = (value: unknown): string => normalizeTextValue(value).toUpperCase();

const buildClassLabel = (className: string, classSection?: string) =>
  classSection ? `${className} - ${classSection}` : className;

const buildClassKey = (className: string, classSection?: string) =>
  `${className.trim().toLowerCase()}::${(classSection || "").trim().toUpperCase()}`;

const normalizeGenderValue = (value: unknown): string => {
  const normalized = normalizeTextValue(value).toLowerCase();

  if (!normalized) return "";
  if (normalized.startsWith("m")) return "Male";
  if (normalized.startsWith("f")) return "Female";
  return "Other";
};

const buildCombinedAddress = (street: string, city: string) =>
  [street.trim(), city.trim()].filter(Boolean).join(", ");

const isTransportEnabled = (value: unknown) => {
  const normalized = normalizeTextValue(value).toLowerCase();
  return ["allot", "allotted", "yes", "true", "assigned"].includes(normalized);
};

const getFirstNonEmptySheet = (workbook: XLSX.WorkBook) => {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    if (rows.length > 0) {
      return { sheetName, rows };
    }
  }

  return null;
};

const parseSchoolDataImportRows = (rows: Record<string, unknown>[]) => {
  const validRows: SchoolDataImportRow[] = [];
  const invalidRows: InvalidSchoolDataImportRow[] = [];
  const uniqueClasses = new Map<string, SchoolImportClassPreview>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const className = normalizeTextValue(
      getRowValue(row, ["cname", "class", "classname", "class name"])
    );
    const classSection = normalizeUpperText(
      getRowValue(row, ["stusection", "section", "class section", "classsection"])
    );
    const mappedRow: SchoolDataImportRow = {
      rowNumber,
      formNumber: normalizeTextValue(getRowValue(row, ["srno", "form number", "form no", "form_no"])),
      formDate: normalizeDate(
        getRowValue(row, ["admsn_date", "admission date", "form date", "formdate"])
      ),
      admissionNumber: normalizeTextValue(
        getRowValue(row, ["reg_no", "reg no", "regno", "admission number", "admission no"])
      ),
      name: normalizeTextValue(getRowValue(row, ["s_name", "name", "full name", "student name"])),
      email: normalizeTextValue(getRowValue(row, ["email", "email address"])),
      className,
      classSection,
      classLabel: buildClassLabel(className, classSection),
      academicYear: normalizeTextValue(
        getRowValue(row, ["stsession", "academic year", "academicyear", "session"])
      ),
      rollNumber: normalizeTextValue(
        getRowValue(row, ["roll_no", "roll number", "rollnumber", "roll no", "rollno"])
      ),
      phone:
        normalizeTextValue(
          getRowValue(row, ["mobile_no", "phone", "mobile", "phone number", "contact"])
        ) ||
        normalizeTextValue(getRowValue(row, ["mobile_no2", "alternate mobile", "phone 2"])),
      address:
        normalizeTextValue(getRowValue(row, ["address", "student address"])) ||
        buildCombinedAddress(
          normalizeTextValue(getRowValue(row, ["streetorvillage", "street", "village"])),
          normalizeTextValue(getRowValue(row, ["city", "town"]))
        ),
      dateOfBirth: normalizeDate(getRowValue(row, ["d_birth", "date of birth", "dob", "birth date"])),
      gender: normalizeGenderValue(getRowValue(row, ["sex", "gender"])),
      aadharNumber: normalizeTextValue(getRowValue(row, ["adhar", "adhaar", "aadhar", "aadhaar"])),
      religion: normalizeTextValue(getRowValue(row, ["stu_caste", "religion"])),
      caste: normalizeTextValue(getRowValue(row, ["stu_category", "caste", "category"])),
      needsTransport: isTransportEnabled(getRowValue(row, ["transport", "transport status"])),
      busConsent: isTransportEnabled(getRowValue(row, ["transport", "transport status"])),
    };

    const missingFields: string[] = [];
    if (!mappedRow.name) missingFields.push("name");
    if (!mappedRow.className) missingFields.push("className");
    if (!mappedRow.classSection) missingFields.push("classSection");
    if (!mappedRow.rollNumber) missingFields.push("rollNumber");

    if (missingFields.length > 0) {
      invalidRows.push({
        rowNumber,
        reason: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    validRows.push(mappedRow);
    uniqueClasses.set(buildClassKey(mappedRow.className, mappedRow.classSection), {
      name: mappedRow.className,
      section: mappedRow.classSection,
      label: mappedRow.classLabel,
    });
  });

  return {
    validRows,
    invalidRows,
    uniqueClasses: Array.from(uniqueClasses.values()),
  };
};

const buildGeneratedImportEmail = (
  schoolId: string,
  row: Pick<SchoolDataImportRow, "admissionNumber" | "rollNumber">,
  rowIndex: number
) => {
  const seed = normalizeTextValue(row.admissionNumber) || normalizeTextValue(row.rollNumber) || String(rowIndex + 1);
  const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() || `row-${rowIndex + 1}`;
  return `student-${schoolId}-${safeSeed}@import.local`;
};

const buildImportDuplicateReason = (row: SchoolDataImportRow) =>
  row.admissionNumber
    ? `Student with admission number ${row.admissionNumber} already exists`
    : `Student ${row.name} already exists in ${row.classLabel} with roll number ${row.rollNumber}`;

const resizeImage = (file: File, maxPx: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unsupported")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const generateFormNumber = (count: number) => {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, "0");
  return `F-${year}-${seq}`;
};

const generateAdmissionNumber = (count: number) => {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, "0");
  return `ADM-${year}-${seq}`;
};

export default function AdmissionsModule() {
  const today = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState<AdmissionForm>({ ...emptyForm, formDate: today });
  const [recentAdmissions, setRecentAdmissions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [excelSaving, setExcelSaving] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelAdmissions, setExcelAdmissions] = useState<ParsedAdmissionRow[]>([]);
  const [excelTotalRows, setExcelTotalRows] = useState(0);
  const [schoolDataImportLoading, setSchoolDataImportLoading] = useState(false);
  const [schoolDataImportFileName, setSchoolDataImportFileName] = useState("");
  const [schoolDataImportSheetName, setSchoolDataImportSheetName] = useState("");
  const [schoolDataImportRows, setSchoolDataImportRows] = useState<SchoolDataImportRow[]>([]);
  const [schoolDataImportTotalRows, setSchoolDataImportTotalRows] = useState(0);
  const [schoolDataImportInvalidRows, setSchoolDataImportInvalidRows] = useState<InvalidSchoolDataImportRow[]>([]);
  const [schoolDataImportClassesToCreate, setSchoolDataImportClassesToCreate] = useState<string[]>([]);
  const [schoolDataImportResult, setSchoolDataImportResult] = useState<SchoolDataImportResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [rteDocumentName, setRteDocumentName] = useState("");
  const [bodCertificateName, setBodyCertificateName] = useState("");
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [docModalStudent, setDocModalStudent] = useState<Student | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docModalError, setDocModalError] = useState("");
  const [docModalSuccess, setDocModalSuccess] = useState("");
  const [docPatch, setDocPatch] = useState<Record<string, string>>({});
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "pending">("all");
  const [showTransportTerms, setShowTransportTerms] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const schoolSession = readStoredSchoolSession() as SchoolNameSession | null;
  const schoolDisplayName = schoolSession?.schoolInfo?.name ?? schoolSession?.name ?? "School";
  const schoolLogo = schoolSession?.schoolInfo?.logo ?? "";
  const schoolPhone = schoolSession?.schoolInfo?.phone ?? "";
  const schoolEmail = schoolSession?.schoolInfo?.email ?? "";
  const schoolAddress = schoolSession?.schoolInfo?.address ?? "";
  const schoolWebsite = schoolSession?.schoolInfo?.website ?? "";
  // ref kept for potential future use
  const _idCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchAdmissions();
  }, []);

  // Auto-generate form and admission numbers when admissions list loads
  useEffect(() => {
    const formNum = generateFormNumber(recentAdmissions.length);
    const admNum = generateAdmissionNumber(recentAdmissions.length);
    setFormData((prev) => ({ ...prev, formNumber: formNum, admissionNumber: admNum }));
  }, [recentAdmissions.length]);

  const clearSchoolDataImportPreview = () => {
    setSchoolDataImportFileName("");
    setSchoolDataImportSheetName("");
    setSchoolDataImportRows([]);
    setSchoolDataImportTotalRows(0);
    setSchoolDataImportInvalidRows([]);
    setSchoolDataImportClassesToCreate([]);
    setSchoolDataImportResult(null);
  };

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      setError("");

      const school = readStoredSchoolSession();
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setRecentAdmissions([]);
        return;
      }

      const res = await fetch(`${API_URL}/api/students/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load admissions (${res.status})`);
      }

      const data = await res.json();
      setRecentAdmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch admissions error:", err);
      setRecentAdmissions([]);
      setError(err instanceof Error ? err.message : "Failed to fetch admissions");
    } finally {
      setLoading(false);
    }
  };

  // Only show admissions created through the new admission form (F- prefix)
  const newAdmissions = useMemo(
    () => recentAdmissions.filter((s) => s.formNumber?.startsWith("F-")),
    [recentAdmissions]
  );

  const classFilterOptions = useMemo(() => {
    const unique = Array.from(new Set(newAdmissions.map((s) => s.class).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [newAdmissions]);

  const filteredAdmissions = useMemo(() => {
    let list = selectedClassFilter === "all"
      ? newAdmissions
      : newAdmissions.filter((s) => s.class === selectedClassFilter);
    if (statusFilter === "complete") list = list.filter(isAdmissionComplete);
    if (statusFilter === "pending") list = list.filter((s) => !isAdmissionComplete(s));
    return list;
  }, [newAdmissions, selectedClassFilter, statusFilter]);

  const printableAdmissionCount = useMemo(
    () => filteredAdmissions.filter(isAdmissionComplete).length,
    [filteredAdmissions]
  );

  const openDocModal = (student: Student) => {
    setDocModalStudent(student);
    setDocPatch({});
    setDocModalError("");
    setDocModalSuccess("");
  };

  const handleDocFileSelect = async (field: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setDocPatch((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const saveDocModal = async () => {
    if (!docModalStudent) return;
    if (Object.keys(docPatch).length === 0) {
      setDocModalError("No files selected.");
      return;
    }
    try {
      setDocUploading(true);
      setDocModalError("");
      const res = await fetch(`${API_URL}/api/students/${docModalStudent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docPatch),
      });
      if (!res.ok) throw new Error("Failed to save documents");
      setDocModalSuccess("Documents saved successfully.");
      setDocPatch({});
      await fetchAdmissions();
      // refresh local student reference
      setDocModalStudent((prev) =>
        prev ? { ...prev, ...Object.fromEntries(Object.entries(docPatch).map(([k]) => [k, "uploaded"])) } : prev
      );
    } catch (err) {
      setDocModalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setDocUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.hasParentConsent) {
      setError("Parent consent form is required.");
      return;
    }
    if (!formData.needsTransport && !formData.busConsent) {
      setError("Parent consent for not taking school bus is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const school = readStoredSchoolSession();
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const payload = {
        formNumber: formData.formNumber,
        formDate: formData.formDate,
        admissionNumber: formData.admissionNumber,
        name: formData.name,
        email: formData.email,
        class: formData.class,
        classSection: formData.classSection,
        academicYear: formData.academicYear,
        rollNumber: formData.rollNumber,
        phone: formData.phone,
        aadharNumber: formData.aadharNumber,
        placeOfBirth: formData.placeOfBirth,
        state: formData.state,
        nationality: formData.nationality,
        religion: formData.religion,
        address: formData.address,
        pinCode: formData.pinCode,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        caste: formData.caste,
        motherTongue: formData.motherTongue,
        bloodGroup: formData.bloodGroup,
        identificationMarks: formData.identificationMarks,
        previousAcademicRecord: formData.previousAcademicRecord,
        achievements: formData.achievements,
        generalBehaviour: formData.generalBehaviour,
        medicalHistory: formData.medicalHistory,
        languagePreferences: formData.languagePreferences
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        hasParentConsent: formData.hasParentConsent,
        needsTransport: formData.needsTransport,
        busConsent: formData.busConsent,
        photo: formData.photo || undefined,
        rteDocument: formData.rteDocument || undefined,
        bodCertificate: formData.bodCertificate || undefined,
        schoolId: school._id,
      };

      const res = await fetch(`${API_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to admit student");
      }

      setSuccess("Student admitted successfully.");
      setPhotoPreview("");
      setBodyCertificateName("");
      setRteDocumentName("");
      setFormData({ ...emptyForm, formDate: new Date().toISOString().slice(0, 10) });
      await fetchAdmissions();
    } catch (err) {
      console.error("Admission save error:", err);
      setError(err instanceof Error ? err.message : "Failed to admit student");
    } finally {
      setSaving(false);
    }
  };

  const handleExcelFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setExcelSaving(true);
      setError("");
      setSuccess("");
      setExcelFileName(file.name);
      setExcelAdmissions([]);
      setExcelTotalRows(0);

      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setError("Excel file is empty.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });

      if (rows.length === 0) {
        setError("No rows found in the uploaded file.");
        return;
      }

      const admissions = parseAdmissionRows(rows);
      setExcelTotalRows(rows.length);

      if (admissions.length === 0) {
        setError("No valid rows found. Required columns: name, email, class, rollNumber.");
        return;
      }

      setExcelAdmissions(admissions);
      setSuccess(`Excel preview ready. ${admissions.length} valid student row(s) found.`);
    } catch (err) {
      console.error("Excel preview error:", err);
      setError(err instanceof Error ? err.message : "Failed to read Excel file");
    } finally {
      e.target.value = "";
      setExcelSaving(false);
    }
  };

  const handleExcelEnroll = async () => {
    if (excelAdmissions.length === 0) {
      setError("Please upload an Excel file and preview student rows first.");
      return;
    }

    try {
      setExcelSaving(true);
      setError("");
      setSuccess("");

      const school = readStoredSchoolSession();
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const requests = excelAdmissions.map((student) =>
        fetch(`${API_URL}/api/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...student, schoolId: school._id }),
        })
      );

      const results = await Promise.allSettled(requests);
      const failedMessages: string[] = [];
      let successCount = 0;

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.ok) {
            successCount += 1;
          } else {
            const responseData = await result.value.json().catch(() => null);
            failedMessages.push(responseData?.message || "Failed to create one student");
          }
        } else {
          failedMessages.push("Network error while creating one student");
        }
      }

      const failedCount = excelAdmissions.length - successCount;
      if (failedCount === 0) {
        setSuccess(`Excel admission completed. ${successCount} students enrolled.`);
        setExcelAdmissions([]);
        setExcelFileName("");
        setExcelTotalRows(0);
      } else {
        const details = failedMessages.slice(0, 3).join(" | ");
        setError(
          `Excel admission finished with issues. Success: ${successCount}, Failed: ${failedCount}. ${details}`
        );
      }

      await fetchAdmissions();
    } catch (err) {
      console.error("Excel admission error:", err);
      setError(err instanceof Error ? err.message : "Failed to process Excel admissions");
    } finally {
      setExcelSaving(false);
    }
  };

  const handleSchoolDataFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSchoolDataImportLoading(true);
      setError("");
      setSuccess("");
      setSchoolDataImportResult(null);
      clearSchoolDataImportPreview();

      const school = readStoredSchoolSession();
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
      const selectedSheet = getFirstNonEmptySheet(workbook);

      if (!selectedSheet) {
        setError("Excel file is empty.");
        return;
      }

      const { validRows, invalidRows, uniqueClasses } = parseSchoolDataImportRows(selectedSheet.rows);
      setSchoolDataImportFileName(file.name);
      setSchoolDataImportSheetName(selectedSheet.sheetName);
      setSchoolDataImportRows(validRows);
      setSchoolDataImportTotalRows(selectedSheet.rows.length);
      setSchoolDataImportInvalidRows(invalidRows);

      if (validRows.length === 0) {
        setError("No valid rows found for school data import.");
        return;
      }

      let classesToCreate = uniqueClasses.map((schoolClass) => schoolClass.label);

      try {
        const classRes = await fetch(`${API_URL}/api/classes/${school._id}`);
        if (classRes.ok) {
          const classData = (await classRes.json()) as SchoolClassSummary[];
          const existingClassKeys = new Set(
            (Array.isArray(classData) ? classData : []).map((schoolClass) =>
              buildClassKey(schoolClass.name || "", schoolClass.section || "")
            )
          );

          classesToCreate = uniqueClasses
            .filter((schoolClass) => !existingClassKeys.has(buildClassKey(schoolClass.name, schoolClass.section)))
            .map((schoolClass) => schoolClass.label);
        }
      } catch (classError) {
        console.warn("Failed to fetch existing classes for preview:", classError);
      }

      setSchoolDataImportClassesToCreate(classesToCreate);
      setSuccess(
        `School data preview ready. ${validRows.length} valid student row(s) found in ${selectedSheet.sheetName}.`
      );
    } catch (err) {
      console.error("School data import preview error:", err);
      setError(err instanceof Error ? err.message : "Failed to read school data file");
    } finally {
      e.target.value = "";
      setSchoolDataImportLoading(false);
    }
  };

  const handleSchoolDataImport = async () => {
    if (schoolDataImportRows.length === 0) {
      setError("Please upload a school data file and preview rows first.");
      return;
    }

    try {
      setSchoolDataImportLoading(true);
      setError("");
      setSuccess("");
      setSchoolDataImportResult(null);

      const school = readStoredSchoolSession();
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      let result: SchoolDataImportResult | null = null;
      let shouldTryLegacyFallback = false;

      try {
        const res = await fetch(`${API_URL}/api/students/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: school._id,
            rows: schoolDataImportRows,
            duplicateMode: "skip",
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.data) {
          result = data.data as SchoolDataImportResult;
        } else if (res.status === 404) {
          shouldTryLegacyFallback = true;
        } else {
          throw new Error(data?.message || "Failed to import school data");
        }
      } catch (bulkImportError) {
        if (
          bulkImportError instanceof Error &&
          /Cannot POST|404|Failed to fetch|NetworkError/i.test(bulkImportError.message)
        ) {
          shouldTryLegacyFallback = true;
        } else {
          throw bulkImportError;
        }
      }

      if (!result && shouldTryLegacyFallback) {
        const [classRes, studentRes] = await Promise.all([
          fetch(`${API_URL}/api/classes/${school._id}`),
          fetch(`${API_URL}/api/students/${school._id}`),
        ]);

        if (!classRes.ok) {
          throw new Error(`Failed to load classes (${classRes.status})`);
        }

        if (!studentRes.ok) {
          throw new Error(`Failed to load students (${studentRes.status})`);
        }

        const existingClasses = (await classRes.json()) as SchoolClassSummary[];
        const existingStudents = (await studentRes.json()) as Student[];
        const existingClassKeys = new Set(
          (Array.isArray(existingClasses) ? existingClasses : []).map((schoolClass) =>
            buildClassKey(schoolClass.name || "", schoolClass.section || "")
          )
        );

        const existingStudentsByAdmission = new Set(
          (Array.isArray(existingStudents) ? existingStudents : [])
            .map((student) => normalizeTextValue(student.admissionNumber))
            .filter(Boolean)
        );

        const existingStudentsByComposite = new Set(
          (Array.isArray(existingStudents) ? existingStudents : []).map((student) =>
            [
              normalizeTextValue(student.class),
              normalizeTextValue(student.rollNumber),
              normalizeTextValue(student.name).toLowerCase(),
            ].join("::")
          )
        );

        const classesCreated: string[] = [];
        const duplicates: InvalidSchoolDataImportRow[] = [];
        const failures: InvalidSchoolDataImportRow[] = [];
        let importedCount = 0;

        for (const row of schoolDataImportRows) {
          const classKey = buildClassKey(row.className, row.classSection);
          if (!existingClassKeys.has(classKey)) {
            const createClassRes = await fetch(`${API_URL}/api/classes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: row.className,
                section: row.classSection,
                academicYear: row.academicYear,
                schoolId: school._id,
              }),
            });

            const createClassData = await createClassRes.json().catch(() => null);
            if (!createClassRes.ok && createClassData?.message !== "This class and section already exist") {
              failures.push({
                rowNumber: row.rowNumber,
                reason: createClassData?.message || `Failed to create class ${row.classLabel}`,
              });
              continue;
            }

            existingClassKeys.add(classKey);
            if (!classesCreated.includes(row.classLabel)) {
              classesCreated.push(row.classLabel);
            }
          }

          const normalizedAdmissionNumber = normalizeTextValue(row.admissionNumber);
          const compositeKey = [
            normalizeTextValue(row.classLabel),
            normalizeTextValue(row.rollNumber),
            normalizeTextValue(row.name).toLowerCase(),
          ].join("::");

          if (
            (normalizedAdmissionNumber && existingStudentsByAdmission.has(normalizedAdmissionNumber)) ||
            existingStudentsByComposite.has(compositeKey)
          ) {
            duplicates.push({
              rowNumber: row.rowNumber,
              reason: buildImportDuplicateReason(row),
            });
            continue;
          }

          const createStudentRes = await fetch(`${API_URL}/api/students`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              formNumber: row.formNumber,
              formDate: row.formDate,
              admissionNumber: row.admissionNumber,
              name: row.name,
              email: row.email || buildGeneratedImportEmail(school._id, row, row.rowNumber - 2),
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
              schoolId: school._id,
            }),
          });

          const createStudentData = await createStudentRes.json().catch(() => null);
          if (!createStudentRes.ok) {
            failures.push({
              rowNumber: row.rowNumber,
              reason: createStudentData?.message || "Failed to import student",
            });
            continue;
          }

          importedCount += 1;
          if (normalizedAdmissionNumber) {
            existingStudentsByAdmission.add(normalizedAdmissionNumber);
          }
          existingStudentsByComposite.add(compositeKey);
        }

        result = {
          totalRows: schoolDataImportRows.length,
          validRows: schoolDataImportRows.length,
          invalidRows: schoolDataImportInvalidRows,
          classesCreated,
          importedCount,
          duplicateCount: duplicates.length,
          duplicates,
          failureCount: failures.length,
          failures,
        };
      }

      if (!result) {
        throw new Error("Failed to import school data");
      }

      setSchoolDataImportResult(result);

      const summaryParts = [
        `${result.importedCount} student(s) imported`,
        `${result.classesCreated.length} class(es) created`,
        `${result.duplicateCount} duplicate(s) skipped`,
      ];

      if (result.failureCount > 0) {
        summaryParts.push(`${result.failureCount} failed`);
      }

      if (result.invalidRows.length > 0) {
        summaryParts.push(`${result.invalidRows.length} invalid row(s)`);
      }

      setSuccess(`School data import finished: ${summaryParts.join(", ")}.`);
      await fetchAdmissions();
    } catch (err) {
      console.error("School data import error:", err);
      setError(err instanceof Error ? err.message : "Failed to import school data");
    } finally {
      setSchoolDataImportLoading(false);
    }
  };

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 250);
      setPhotoPreview(dataUrl);
      setFormData((prev) => ({ ...prev, photo: dataUrl }));
    } catch {
      setError("Failed to process photo. Please try a different image.");
    }
    e.target.value = "";
  };

  const handleRteDocumentSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      setRteDocumentName(file.name);
      setFormData((prev) => ({ ...prev, rteDocument: dataUrl }));
    } catch {
      setError("Failed to process RTE document. Please try again.");
    }
    e.target.value = "";
  };

  const handleBodCertificateSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      setBodyCertificateName(file.name);
      setFormData((prev) => ({ ...prev, bodCertificate: dataUrl }));
    } catch {
      setError("Failed to process BOD Certificate. Please try again.");
    }
    e.target.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const downloadTransportConsentForm = () => {
    const school = readStoredSchoolSession();
    const schoolName =
      school?.schoolInfo?.name ||
      school?.name ||
      "School";

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    let currentY = 56;

    const addWrappedText = (text: string, fontSize = 11, spacing = 18) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, 500);
      pdf.text(lines, marginX, currentY);
      currentY += lines.length * spacing;
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("School Transport Undertaking Form", marginX, currentY);
    currentY += 24;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`School: ${schoolName}`, marginX, currentY);
    currentY += 18;
    pdf.text(`Student Name: ${formData.name || "____________________"}`, marginX, currentY);
    currentY += 18;
    pdf.text(`Admission No: ${formData.admissionNumber || "____________________"}`, marginX, currentY);
    currentY += 18;
    pdf.text(`Class / Section: ${formData.class || "____________________"} ${formData.classSection || ""}`.trim(), marginX, currentY);
    currentY += 28;

    pdf.setFont("helvetica", "bold");
    pdf.text("Transport Terms & Conditions", marginX, currentY);
    currentY += 20;

    pdf.setFont("helvetica", "normal");
    addWrappedText(
      "1. The school provides bus transportation only for students who opt for the school bus service and follow all transport rules."
    );
    addWrappedText(
      "2. If the student does not use the school bus service, the parent or guardian is fully responsible for safe transportation to and from school."
    );
    addWrappedText(
      "3. The school is not responsible for accidents, delays, injuries, or third-party transportation risks outside official school transport."
    );
    addWrappedText(
      "4. Parents or guardians must ensure timely drop-off and pick-up of the student on all school working days."
    );
    addWrappedText(
      "5. By signing this form, the parent or guardian acknowledges these terms and accepts full responsibility for the child's transportation arrangements."
    );

    currentY += 18;
    pdf.setFont("helvetica", "bold");
    pdf.text("Parent / Guardian Declaration", marginX, currentY);
    currentY += 20;
    pdf.setFont("helvetica", "normal");
    addWrappedText(
      "I hereby confirm that my child will not be using the school bus service. I accept full responsibility for my child's transportation and undertake to inform the school immediately of any change in transport mode."
    );

    currentY += 36;
    pdf.text("Parent / Guardian Name: ________________________________", marginX, currentY);
    currentY += 32;
    pdf.text("Signature: ____________________    Date: ____________________", marginX, currentY);
    currentY += 32;
    pdf.text("Mobile Number: ____________________________________________", marginX, currentY);

    pdf.save(`transport-undertaking-${(formData.name || "student").replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  const acceptTransportTerms = () => {
    setFormData((prev) => ({ ...prev, busConsent: true }));
    setShowTransportTerms(false);
  };

  const printIdCard = () => {
    if (!idCardStudent) return;
    if (!isAdmissionComplete(idCardStudent)) {
      setError("ID card is available only after admission is completed.");
      return;
    }
    const sch = readStoredSchoolSession() as SchoolNameSession | null;
    const schoolName = sch?.schoolInfo?.name ?? sch?.name ?? "School";
    const schoolLogoUrl = sch?.schoolInfo?.logo ?? "";
    const schoolAddressText = sch?.schoolInfo?.address ?? "";
    const schoolPhoneText = sch?.schoolInfo?.phone ?? "";
    const schoolEmailText = sch?.schoolInfo?.email ?? "";
    const schoolWebsiteText = sch?.schoolInfo?.website ?? "";
    const photoHtml = idCardStudent.photo
      ? `<img src="${idCardStudent.photo}" style="width:80px;height:100px;object-fit:cover;border-radius:6px;" />`
      : `<div style="width:80px;height:100px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:36px;">&#128100;</div>`;
    const logoHtml = schoolLogoUrl
      ? `<img src="${schoolLogoUrl}" style="width:34px;height:34px;object-fit:cover;border-radius:50%;border:1px solid rgba(255,255,255,.45);" />`
      : `<div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);font-size:16px;">&#127979;</div>`;
    const win = window.open("", "_blank", "width=540,height=440");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${idCardStudent.name}</title>
<style>
  body{margin:20px;font-family:Arial,sans-serif;}
  .sheet{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:760px;}
  .card{width:340px;border:2px solid #1d4ed8;border-radius:12px;overflow:hidden;background:#fff;}
  .hd{background:#1d4ed8;color:white;padding:8px 12px;display:flex;align-items:center;gap:8px;}
  .hdcopy h2{margin:0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;line-height:1.1;}
  .hdcopy p{margin:2px 0 0;font-size:11px;opacity:.92;line-height:1.2;}
  .bd{display:flex;padding:12px;gap:12px;align-items:flex-start;}
  .info .name{font-size:14px;font-weight:700;margin:0 0 5px;}
  .info p{margin:2px 0;font-size:11px;color:#374151;}
  .ft{background:#eff6ff;border-top:1px solid #bfdbfe;text-align:center;padding:5px;}
  .ft p{margin:0;font-size:10px;color:#6b7280;}
  .back{padding:12px;min-height:154px;}
  .back h3{margin:0 0 8px;font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;}
  .back p{margin:0 0 6px;font-size:11px;color:#374151;line-height:1.3;}
  .back .label{font-weight:700;color:#0f172a;}
</style></head><body>
<div class="sheet">
  <div class="card">
    <div class="hd">${logoHtml}<div class="hdcopy"><h2>Student Identity Card</h2><p>${schoolName}</p></div></div>
    <div class="bd">
      <div>${photoHtml}</div>
      <div class="info">
        <p class="name">${idCardStudent.name}</p>
        <p>Class: ${idCardStudent.class}${idCardStudent.classSection ? " " + idCardStudent.classSection : ""}</p>
        <p>Roll No: ${idCardStudent.rollNumber}</p>
        <p>Admission No: ${idCardStudent.admissionNumber ?? "-"}</p>
        <p>Date of Birth: ${idCardStudent.dateOfBirth ?? "-"}</p>
        <p>Blood Group: ${idCardStudent.bloodGroup ?? "-"}</p>
      </div>
    </div>
    <div class="ft"><p>If found, please return to the school office</p></div>
  </div>
  <div class="card">
    <div class="hd">${logoHtml}<div class="hdcopy"><h2>School Information</h2><p>${schoolName}</p></div></div>
    <div class="back">
      <h3>Back Side</h3>
      <p><span class="label">Address:</span> ${escapeHtml(schoolAddressText || "-")}</p>
      <p><span class="label">Phone:</span> ${escapeHtml(schoolPhoneText || "-")}</p>
      <p><span class="label">Email:</span> ${escapeHtml(schoolEmailText || "-")}</p>
      <p><span class="label">Website:</span> ${escapeHtml(schoolWebsiteText || "-")}</p>
      <p><span class="label">Student:</span> ${escapeHtml(idCardStudent.name)} (${escapeHtml(idCardStudent.admissionNumber ?? "-")})</p>
    </div>
    <div class="ft"><p>This card belongs to ${escapeHtml(idCardStudent.name)}</p></div>
  </div>
</div>
<script>window.onload=function(){window.print();};</script>
</body></html>`);
    win.document.close();
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const renderCardHtml = (
    student: Student,
    schoolName: string,
    schoolLogoUrl: string,
    schoolInfo: { address: string; phone: string; email: string; website: string }
  ) => {
    const photoHtml = student.photo
      ? `<img src="${student.photo}" style="width:64px;height:80px;object-fit:cover;border-radius:6px;" />`
      : `<div style="width:64px;height:80px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:28px;">&#128100;</div>`;
    const logoHtml = schoolLogoUrl
      ? `<img src="${schoolLogoUrl}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;border:1px solid rgba(255,255,255,.45);" />`
      : `<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);font-size:14px;">&#127979;</div>`;

    return `
      <article class="card">
        <div class="hd">${logoHtml}<div><h2>Student Identity Card</h2><p>${escapeHtml(schoolName)}</p></div></div>
        <div class="bd">
          <div>${photoHtml}</div>
          <div class="info">
            <p class="name">${escapeHtml(student.name)}</p>
            <p>Class: ${escapeHtml(student.class)}${student.classSection ? ` ${escapeHtml(student.classSection)}` : ""}</p>
            <p>Roll No: ${escapeHtml(student.rollNumber)}</p>
            <p>Admission No: ${escapeHtml(student.admissionNumber ?? "-")}</p>
            <p>DOB: ${escapeHtml(student.dateOfBirth ?? "-")}</p>
            <p>Blood Group: ${escapeHtml(student.bloodGroup ?? "-")}</p>
          </div>
        </div>
        <div class="ft"><p>If found, please return to school office</p></div>
      </article>
      <article class="card">
        <div class="hd">${logoHtml}<div><h2>School Information</h2><p>${escapeHtml(schoolName)}</p></div></div>
        <div class="back">
          <p><strong>Address:</strong> ${escapeHtml(schoolInfo.address || "-")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(schoolInfo.phone || "-")}</p>
          <p><strong>Email:</strong> ${escapeHtml(schoolInfo.email || "-")}</p>
          <p><strong>Website:</strong> ${escapeHtml(schoolInfo.website || "-")}</p>
          <p><strong>Student:</strong> ${escapeHtml(student.name)} (${escapeHtml(student.admissionNumber ?? "-")})</p>
        </div>
        <div class="ft"><p>This card belongs to ${escapeHtml(student.name)}</p></div>
      </article>
    `;
  };

  const printFilteredIdCards = () => {
    const printableAdmissions = filteredAdmissions.filter(isAdmissionComplete);
    if (printableAdmissions.length === 0) {
      setError("No completed admissions available for ID card printing.");
      return;
    }

    const schoolName = schoolDisplayName;
    const win = window.open("", "_blank", "width=960,height=760");
    if (!win) return;

    const cardsHtml = printableAdmissions
      .map((student) =>
        renderCardHtml(student, schoolName, schoolLogo, {
          address: schoolAddress,
          phone: schoolPhone,
          email: schoolEmail,
          website: schoolWebsite,
        })
      )
      .join("");

    win.document.write(`<!DOCTYPE html><html><head><title>Student ID Cards</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; }
        .sheet {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10mm;
        }
        .card {
          border: 2px solid #1d4ed8;
          border-radius: 10px;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .hd { background: #1d4ed8; color: white; display: flex; align-items: center; gap: 6px; padding: 6px 10px; }
        .hd h2 { margin: 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
        .hd p { margin: 2px 0 0; font-size: 9px; opacity: 0.85; }
        .bd { display: flex; gap: 10px; padding: 10px; align-items: flex-start; min-height: 100px; }
        .info .name { margin: 0 0 4px; font-size: 12px; font-weight: 700; }
        .info p { margin: 2px 0; font-size: 9px; color: #374151; }
        .back { padding: 10px; min-height: 100px; }
        .back p { margin: 0 0 4px; font-size: 9px; color: #374151; }
        .ft { background: #eff6ff; border-top: 1px solid #bfdbfe; text-align: center; padding: 4px; }
        .ft p { margin: 0; font-size: 8px; color: #6b7280; }
        .card:nth-of-type(4n) { break-after: page; page-break-after: always; }
        .card:last-of-type { break-after: auto; page-break-after: auto; }
      </style>
    </head><body>
      <section class="sheet">${cardsHtml}</section>
      <script>window.onload=function(){window.print();};</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setFormOpen((prev) => !prev)}
        >
          <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="text-lg font-semibold flex-1">New Admission</h3>
          {formOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {formOpen && (
          <>
        {success && <p className="text-green-600 text-sm mt-4">{success}</p>}
        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Form Number</span>
              <input
                type="text"
                readOnly
                className="w-full border rounded p-2 bg-gray-50 text-gray-600 cursor-not-allowed"
                value={formData.formNumber}
              />
              <span className="text-xs text-muted-foreground">Auto-generated</span>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Form Date</span>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={formData.formDate}
                onChange={(e) => setFormData({ ...formData, formDate: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Admission Number</span>
              <input
                type="text"
                readOnly
                className="w-full border rounded p-2 bg-gray-50 text-gray-600 cursor-not-allowed font-medium"
                value={formData.admissionNumber}
              />
              <span className="text-xs text-muted-foreground">Permanent — auto-generated</span>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Full Name</span>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full border rounded p-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Email</span>
              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Class</span>
              <input
                type="text"
                placeholder="Class"
                className="w-full border rounded p-2"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Section</span>
              <input
                type="text"
                placeholder="Section"
                className="w-full border rounded p-2"
                value={formData.classSection}
                onChange={(e) => setFormData({ ...formData, classSection: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Academic Year</span>
              <input
                type="text"
                placeholder="Academic Year (e.g. 2026-2027)"
                className="w-full border rounded p-2"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Roll Number</span>
              <input
                type="text"
                placeholder="Roll Number"
                className="w-full border rounded p-2"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Phone</span>
              <input
                type="tel"
                placeholder="Phone"
                className="w-full border rounded p-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Aadhar Number</span>
              <input
                type="text"
                placeholder="Aadhar Number"
                className="w-full border rounded p-2"
                value={formData.aadharNumber}
                onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Gender</span>
              <select
                className="w-full border rounded p-2"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Date Of Birth</span>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </label>
            <div className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Date of Birth Certificate</span>
              <div className="border rounded p-2 bg-gray-50">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => void handleBodCertificateSelect(e)}
                  className="block text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {bodCertificateName && (
                  <div className="mt-2 flex items-center justify-between bg-blue-50 p-1.5 rounded">
                    <p className="text-xs text-gray-700">✓ {bodCertificateName}</p>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => { setBodyCertificateName(""); setFormData((p) => ({ ...p, bodCertificate: "" })); }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, or PNG</p>
              </div>
            </div>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Place Of Birth</span>
              <input
                type="text"
                placeholder="Place of Birth"
                className="w-full border rounded p-2"
                value={formData.placeOfBirth}
                onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">State</span>
              <input
                type="text"
                placeholder="State"
                className="w-full border rounded p-2"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Nationality</span>
              <input
                type="text"
                placeholder="Nationality"
                className="w-full border rounded p-2"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Religion</span>
              <input
                type="text"
                placeholder="Religion"
                className="w-full border rounded p-2"
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Caste</span>
              <input
                type="text"
                placeholder="Caste"
                className="w-full border rounded p-2"
                value={formData.caste}
                onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Pin Code</span>
              <input
                type="text"
                placeholder="Pin Code"
                className="w-full border rounded p-2"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Mother Tongue</span>
              <input
                type="text"
                placeholder="Mother Tongue"
                className="w-full border rounded p-2"
                value={formData.motherTongue}
                onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="text-xs font-medium">Blood Group</span>
              <input
                type="text"
                placeholder="Blood Group"
                className="w-full border rounded p-2"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              />
            </label>
          </div>

          {/* Student Photo */}
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-sm font-medium mb-2">Student Photo</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-24 bg-gray-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0 border">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-gray-400">&#128100;</span>
                )}
              </div>
            </div>
          </div>

          {/* RTE Document Upload */}
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-sm font-medium mb-2">RTE (Right to Education) Document</p>
            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => void handleRteDocumentSelect(e)}
                className="block text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {rteDocumentName && (
                <div className="mt-3 flex items-center justify-between bg-blue-50 p-2 rounded">
                  <p className="text-xs text-gray-700">✓ {rteDocumentName}</p>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => { setRteDocumentName(""); setFormData((p) => ({ ...p, rteDocument: "" })); }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, or PNG</p>
            </div>
          </div>



          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">Residential Address</span>
            <textarea
              placeholder="Residential Address"
              className="border rounded p-2 w-full"
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">Identification Marks</span>
            <textarea
              placeholder="Identification Marks"
              className="border rounded p-2 w-full"
              rows={2}
              value={formData.identificationMarks}
              onChange={(e) => setFormData({ ...formData, identificationMarks: e.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">Previous Academic Record</span>
            <textarea
              placeholder="Previous Academic Record"
              className="border rounded p-2 w-full"
              rows={2}
              value={formData.previousAcademicRecord}
              onChange={(e) => setFormData({ ...formData, previousAcademicRecord: e.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">Achievements</span>
            <textarea
              placeholder="Achievements"
              className="border rounded p-2 w-full"
              rows={2}
              value={formData.achievements}
              onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">General Behaviour</span>
            <textarea
              placeholder="General Behaviour"
              className="border rounded p-2 w-full"
              rows={2}
              value={formData.generalBehaviour}
              onChange={(e) => setFormData({ ...formData, generalBehaviour: e.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">Medical History</span>
            <textarea
              placeholder="Medical History"
              className="border rounded p-2 w-full"
              rows={2}
              value={formData.medicalHistory}
              onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-medium">Language Preferences</span>
            <input
              type="text"
              placeholder="Language Preferences (comma separated)"
              className="border rounded p-2 w-full"
              value={formData.languagePreferences}
              onChange={(e) => setFormData({ ...formData, languagePreferences: e.target.value })}
            />
          </label>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="parent-consent"
                type="checkbox"
                checked={formData.hasParentConsent}
                onChange={(e) => setFormData({ ...formData, hasParentConsent: e.target.checked })}
                required
              />
              <label htmlFor="parent-consent" className="font-medium">
                Parent Consent Form Signed
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="bus-required"
                type="checkbox"
                checked={formData.needsTransport}
                onChange={(e) => {
                  const needsTransport = e.target.checked;
                  setFormData({
                    ...formData,
                    needsTransport,
                    busConsent: needsTransport ? false : formData.busConsent,
                  });

                  if (!needsTransport) {
                    setShowTransportTerms(true);
                  }
                }}
              />
              <label htmlFor="bus-required" className="font-medium">
                School Bus Facility Required
              </label>
            </div>

            {formData.needsTransport && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-primary">
                  School Transport Details
                </h3>

                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-foreground">
                  <p className="font-semibold">Instructions:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Students must arrive at pickup point 5 minutes early.</li>
                    <li>Follow discipline inside the bus.</li>
                    <li>Any damage to bus property will be charged.</li>
                    <li>Bus fee must be paid on time.</li>
                  </ul>
                </div>
              </div>
            )}

            {!formData.needsTransport && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <input
                    id="no-bus-consent"
                    type="checkbox"
                    checked={formData.busConsent}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowTransportTerms(true);
                        return;
                      }

                      setFormData({ ...formData, busConsent: false });
                    }}
                    required
                  />
                  <label htmlFor="no-bus-consent" className="font-medium text-foreground">
                    Parent Consent for Not Taking School Bus
                  </label>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  If the student does not use school transport, full responsibility of travel lies with
                  the parent or guardian. The school will not be held responsible for any incident during commute.
                </p>

                <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-foreground">
                  <p className="font-semibold">Instructions:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Download the undertaking form before proceeding.</li>
                    <li>Parent or guardian must sign the form physically.</li>
                    <li>Submit the signed form to the school admin.</li>
                    <li>Transport responsibility remains with the parent until the school receives the signed form.</li>
                  </ul>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={downloadTransportConsentForm}
                    className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Download Form
                  </button>
                </div>

                {formData.busConsent && (
                  <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                    Please sign the downloaded form and submit it to the school admin.
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {saving ? "Saving..." : "Add Admission"}
          </button>
        </form>
          </>
        )}
      </div>

      <div className="stat-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">New Admissions</h3>
            <div className="mt-1 flex gap-1">
              {(["all", "complete", "pending"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-0.5 text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? s === "complete"
                        ? "bg-green-600 text-white border-green-600"
                        : s === "pending"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? `All (${newAdmissions.length})` : s === "complete" ? `Complete (${newAdmissions.filter(isAdmissionComplete).length})` : `Pending (${newAdmissions.filter((x) => !isAdmissionComplete(x)).length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="all">All Classes</option>
              {classFilterOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={printFilteredIdCards}
              disabled={printableAdmissionCount === 0}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" />
              Print ID Cards (Completed)
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading admissions...</p>
        ) : filteredAdmissions.length === 0 ? (
          <p className="text-gray-500">No admissions yet.</p>
        ) : (
          <div className="max-h-[620px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAdmissions.map((student) => (
                <div
                  key={student._id}
                  className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden border-slate-200 cursor-pointer"
                  onClick={() => openDocModal(student)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openDocModal(student)}
                >
                  {/* Card header with status colour */}
                  <div className={`px-3 py-2 flex items-center justify-between ${
                    isAdmissionComplete(student) ? "bg-green-600" : "bg-amber-500"
                  }`}>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-white">Student</p>
                    <span className="text-[9px] font-semibold text-white uppercase tracking-wide">
                      {isAdmissionComplete(student) ? "✓ Complete" : "⚠ Pending"}
                    </span>
                  </div>

                  {/* Photo + info */}
                  <div className="flex gap-3 p-3 flex-1">
                    <div className="w-14 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border">
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-gray-400">&#128100;</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs space-y-0.5">
                      <p className="font-bold text-sm text-slate-800 truncate">{student.name}</p>
                      {student.admissionNumber && (
                        <p className="text-blue-600 font-medium">{student.admissionNumber}</p>
                      )}
                      <p className="text-slate-500">
                        {student.class}{student.classSection ? ` · ${student.classSection}` : ""}
                      </p>
                      <p className="text-slate-500">Roll: {student.rollNumber}</p>
                      {student.phone && <p className="text-slate-500 truncate">{student.phone}</p>}
                    </div>
                  </div>

                  {/* Pending docs list */}
                  {!isAdmissionComplete(student) && (
                    <div className="mx-3 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-amber-700 mb-0.5">Documents remaining:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {getMissingDocs(student).map((doc) => (
                          <li key={doc} className="text-[10px] text-amber-600">{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Footer action */}
                  <div className="border-t px-3 py-2 bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Click to manage documents</span>
                    {isAdmissionComplete(student) ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={(e) => { e.stopPropagation(); setIdCardStudent(student); }}
                      >
                        <IdCard className="w-3.5 h-3.5" />
                        ID Card
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-600">Complete documents to unlock ID Card</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ID Card Modal */}
      {idCardStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIdCardStudent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Student ID Card</h3>
              <button
                type="button"
                onClick={() => setIdCardStudent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border-2 border-blue-700 rounded-xl overflow-hidden">
              <div className="bg-blue-700 text-white py-2 px-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/40">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt={schoolDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">🏫</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase">Student Identity Card</p>
                  <p className="text-xs opacity-80">
                    {schoolDisplayName}
                  </p>
                </div>
              </div>
              <div className="flex p-3 gap-3 bg-white items-start">
                <div className="w-20 h-24 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border">
                  {idCardStudent.photo ? (
                    <img src={idCardStudent.photo} alt={idCardStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-gray-400">&#128100;</span>
                  )}
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-bold text-sm">{idCardStudent.name}</p>
                  <p>Class: {idCardStudent.class}{idCardStudent.classSection ? ` ${idCardStudent.classSection}` : ""}</p>
                  <p>Roll No: {idCardStudent.rollNumber}</p>
                  <p>Admission No: {idCardStudent.admissionNumber ?? "-"}</p>
                  <p>Date of Birth: {idCardStudent.dateOfBirth ?? "-"}</p>
                  <p>Blood Group: {idCardStudent.bloodGroup ?? "-"}</p>
                </div>
              </div>
              <div className="bg-blue-50 border-t px-3 py-1.5 text-center">
                <p className="text-xs text-gray-500">If found, please return to the school office</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {isAdmissionComplete(idCardStudent) && (
                <button
                  type="button"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                  onClick={printIdCard}
                >
                  <Printer className="w-4 h-4" />
                  Print ID Card
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
                onClick={() => setIdCardStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {docModalStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDocModalStudent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-5 py-4 flex items-center justify-between ${isAdmissionComplete(docModalStudent) ? "bg-green-600" : "bg-amber-500"}`}>
              <div>
                <p className="text-white font-semibold text-sm">{docModalStudent.name}</p>
                <p className="text-white/80 text-xs">{docModalStudent.admissionNumber} · {docModalStudent.class}{docModalStudent.classSection ? ` ${docModalStudent.classSection}` : ""}</p>
              </div>
              <button type="button" onClick={() => setDocModalStudent(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {isAdmissionComplete(docModalStudent) ? (
                <p className="text-green-700 text-sm font-medium text-center py-4">✓ Admission is complete. All documents are uploaded.</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">Upload missing documents:</p>

                  {!docModalStudent.rteDocument && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Right to Education Document</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleDocFileSelect("rteDocument", f); }}
                      />
                    </div>
                  )}

                  {!docModalStudent.bodCertificate && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Date of Birth Certificate</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleDocFileSelect("bodCertificate", f); }}
                      />
                    </div>
                  )}

                  {!docModalStudent.aadharCardDocument && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Aadhaar Card</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleDocFileSelect("aadharCardDocument", f); }}
                      />
                    </div>
                  )}
                </>
              )}

              {docModalError && <p className="text-red-600 text-xs">{docModalError}</p>}
              {docModalSuccess && <p className="text-green-600 text-xs">{docModalSuccess}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
                  onClick={() => setDocModalStudent(null)}
                >
                  Close
                </button>
                {!isAdmissionComplete(docModalStudent) && (
                  <button
                    type="button"
                    disabled={docUploading || Object.keys(docPatch).length === 0}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                    onClick={() => void saveDocModal()}
                  >
                    {docUploading ? "Saving..." : "Save Documents"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransportTerms && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowTransportTerms(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-[#750550]">
                Transport Terms & Conditions
              </h3>
              <button
                type="button"
                onClick={() => setShowTransportTerms(false)}
                className="text-lg text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-6 text-slate-700">
              <h2 className="text-xl font-semibold text-[#750550]">School Transport Policy</h2>
              <p>
                This policy outlines the responsibilities of the school and parents regarding student transportation.
              </p>

              <h3 className="text-lg font-semibold text-[#750550]">1. School Bus Facility</h3>
              <p>
                The school provides transportation facilities for students who opt for the school bus service.
                This service is subject to availability and adherence to school rules.
              </p>

              <h3 className="text-lg font-semibold text-[#750550]">2. Parent Responsibility (Important)</h3>
              <p>
                If a student does not avail the school bus service, the responsibility of safe transportation
                to and from the school lies entirely with the parents or guardians.
              </p>

              <ul className="list-disc space-y-2 pl-5">
                <li>School will not be responsible for any accidents or incidents outside school transport.</li>
                <li>Parents must ensure timely drop-off and pick-up of students.</li>
                <li>Any delays, safety issues, or travel arrangements are solely managed by parents.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#750550]">3. School Liability</h3>
              <p>
                The school is only responsible for students during official school transport usage or within
                school premises.
              </p>
              <p>For students not using the school bus, the school holds no liability for:</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Road accidents or injuries during commute</li>
                <li>Delays or absenteeism due to transport issues</li>
                <li>Any third-party transportation risks</li>
              </ol>

              <h3 className="text-lg font-semibold text-[#750550]">4. Consent</h3>
              <p>
                By proceeding with admission, parents or guardians acknowledge and agree to these terms and
                take full responsibility for the child&apos;s transportation if not using the school bus service.
              </p>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                Download the undertaking form, sign it physically, and submit it to the school admin.
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={downloadTransportConsentForm}
                className="inline-flex items-center justify-center gap-2 rounded bg-slate-200 px-4 py-2 font-medium text-slate-800 hover:bg-slate-300"
              >
                <Download className="h-4 w-4" />
                Download Form
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, busConsent: false }));
                  setShowTransportTerms(false);
                }}
                className="rounded bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={acceptTransportTerms}
                className="rounded bg-[#750550] px-4 py-2 font-medium text-white hover:bg-[#4a0433]"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
