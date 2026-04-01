import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Download, FileSpreadsheet, IdCard, Printer, UserPlus, X } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { API_URL } from "@/lib/api";

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
  createdAt?: string;
};

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

export default function AdmissionsModule() {
  const [formData, setFormData] = useState<AdmissionForm>(emptyForm);
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
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [showTransportTerms, setShowTransportTerms] = useState(false);
  // ref kept for potential future use
  const _idCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchAdmissions();
  }, []);

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

      const school = JSON.parse(localStorage.getItem("school") || "{}");
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

      const school = JSON.parse(localStorage.getItem("school") || "{}");
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
      setFormData(emptyForm);
      setPhotoPreview("");
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

      const school = JSON.parse(localStorage.getItem("school") || "{}");
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

      const school = JSON.parse(localStorage.getItem("school") || "{}");
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

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

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
      if (!res.ok || !data?.success || !data?.data) {
        throw new Error(data?.message || "Failed to import school data");
      }

      const result = data.data as SchoolDataImportResult;
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

  const downloadTransportConsentForm = () => {
    const school = JSON.parse(localStorage.getItem("school") || "{}");
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
    const sch = JSON.parse(localStorage.getItem("school") ?? "{}") as { name?: string };
    const schoolName = sch?.name ?? "School";
    const photoHtml = idCardStudent.photo
      ? `<img src="${idCardStudent.photo}" style="width:80px;height:100px;object-fit:cover;border-radius:6px;" />`
      : `<div style="width:80px;height:100px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:36px;">&#128100;</div>`;
    const win = window.open("", "_blank", "width=540,height=440");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${idCardStudent.name}</title>
<style>
  body{margin:20px;font-family:Arial,sans-serif;}
  .card{width:340px;border:2px solid #1d4ed8;border-radius:12px;overflow:hidden;}
  .hd{background:#1d4ed8;color:white;text-align:center;padding:8px 12px;}
  .hd h2{margin:0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;}
  .hd p{margin:2px 0 0;font-size:11px;opacity:.85;}
  .bd{display:flex;padding:12px;gap:12px;background:#fff;align-items:flex-start;}
  .info .name{font-size:14px;font-weight:700;margin:0 0 5px;}
  .info p{margin:2px 0;font-size:11px;color:#374151;}
  .ft{background:#eff6ff;border-top:1px solid #bfdbfe;text-align:center;padding:5px;}
  .ft p{margin:0;font-size:10px;color:#6b7280;}
</style></head><body>
<div class="card">
  <div class="hd"><h2>Student Identity Card</h2><p>${schoolName}</p></div>
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
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">New Admission</h3>
        </div>

        {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Form Number"
              className="border rounded p-2"
              value={formData.formNumber}
              onChange={(e) => setFormData({ ...formData, formNumber: e.target.value })}
            />
            <input
              type="date"
              className="border rounded p-2"
              value={formData.formDate}
              onChange={(e) => setFormData({ ...formData, formDate: e.target.value })}
            />
            <input
              type="text"
              placeholder="Admission Number"
              className="border rounded p-2"
              value={formData.admissionNumber}
              onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
            />
            <input
              type="text"
              placeholder="Full Name"
              className="border rounded p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="border rounded p-2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Class"
              className="border rounded p-2"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Section"
              className="border rounded p-2"
              value={formData.classSection}
              onChange={(e) => setFormData({ ...formData, classSection: e.target.value })}
            />
            <input
              type="text"
              placeholder="Academic Year (e.g. 2026-2027)"
              className="border rounded p-2"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
            />
            <input
              type="text"
              placeholder="Roll Number"
              className="border rounded p-2"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Phone"
              className="border rounded p-2"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <input
              type="text"
              placeholder="Aadhar Number"
              className="border rounded p-2"
              value={formData.aadharNumber}
              onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
            />
            <select
              className="border rounded p-2"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              className="border rounded p-2"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <input
              type="text"
              placeholder="Place of Birth"
              className="border rounded p-2"
              value={formData.placeOfBirth}
              onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
            />
            <input
              type="text"
              placeholder="State"
              className="border rounded p-2"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <input
              type="text"
              placeholder="Nationality"
              className="border rounded p-2"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            />
            <input
              type="text"
              placeholder="Religion"
              className="border rounded p-2"
              value={formData.religion}
              onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
            />
            <input
              type="text"
              placeholder="Caste"
              className="border rounded p-2"
              value={formData.caste}
              onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
            />
            <input
              type="text"
              placeholder="Pin Code"
              className="border rounded p-2"
              value={formData.pinCode}
              onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
            />
            <input
              type="text"
              placeholder="Mother Tongue"
              className="border rounded p-2"
              value={formData.motherTongue}
              onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
            />
            <input
              type="text"
              placeholder="Blood Group"
              className="border rounded p-2"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
            />
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
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handlePhotoSelect(e)}
                  className="block text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {photoPreview && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-500 hover:underline"
                    onClick={() => { setPhotoPreview(""); setFormData((p) => ({ ...p, photo: "" })); }}
                  >
                    Remove photo
                  </button>
                )}
                <p className="text-xs text-muted-foreground mt-1">JPEG / PNG — auto-resized to 250px</p>
              </div>
            </div>
          </div>

          <textarea
            placeholder="Residential Address"
            className="border rounded p-2 w-full"
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <textarea
            placeholder="Identification Marks"
            className="border rounded p-2 w-full"
            rows={2}
            value={formData.identificationMarks}
            onChange={(e) => setFormData({ ...formData, identificationMarks: e.target.value })}
          />

          <textarea
            placeholder="Previous Academic Record"
            className="border rounded p-2 w-full"
            rows={2}
            value={formData.previousAcademicRecord}
            onChange={(e) => setFormData({ ...formData, previousAcademicRecord: e.target.value })}
          />

          <textarea
            placeholder="Achievements"
            className="border rounded p-2 w-full"
            rows={2}
            value={formData.achievements}
            onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
          />

          <textarea
            placeholder="General Behaviour"
            className="border rounded p-2 w-full"
            rows={2}
            value={formData.generalBehaviour}
            onChange={(e) => setFormData({ ...formData, generalBehaviour: e.target.value })}
          />

          <textarea
            placeholder="Medical History"
            className="border rounded p-2 w-full"
            rows={2}
            value={formData.medicalHistory}
            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
          />

          <input
            type="text"
            placeholder="Language Preferences (comma separated)"
            className="border rounded p-2 w-full"
            value={formData.languagePreferences}
            onChange={(e) => setFormData({ ...formData, languagePreferences: e.target.value })}
          />

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
      </div>

      <div className="stat-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Excel Admission Import</h3>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          Upload .xlsx or .xls with columns: name, email, class, rollNumber (required). Optional:
          phone, address, dateOfBirth, gender.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelFileSelect}
          disabled={excelSaving}
          className="mb-4 block w-full rounded border bg-white p-2 text-sm"
        />

        {excelFileName && (
          <p className="mb-3 text-sm text-muted-foreground">
            File: {excelFileName} | Preview rows: {excelAdmissions.length}
            {excelTotalRows > excelAdmissions.length
              ? ` (${excelTotalRows - excelAdmissions.length} skipped due to missing required fields)`
              : ""}
          </p>
        )}

        {excelAdmissions.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Class</th>
                    <th className="p-2 text-left">Roll No</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {excelAdmissions.slice(0, 10).map((student, index) => (
                    <tr key={`${student.email}-${student.rollNumber}-${index}`} className="border-b">
                      <td className="p-2 font-medium">{student.name}</td>
                      <td className="p-2">{student.class}</td>
                      <td className="p-2">{student.rollNumber}</td>
                      <td className="p-2">{student.email}</td>
                      <td className="p-2">{student.phone || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {excelAdmissions.length > 10 && (
              <p className="text-xs text-muted-foreground">Showing first 10 rows in preview.</p>
            )}

            <button
              type="button"
              onClick={() => void handleExcelEnroll()}
              disabled={excelSaving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {excelSaving ? "Enrolling..." : "Enroll Students from Excel"}
            </button>
          </div>
        )}
      </div>

      <div className="stat-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">School Data Import</h3>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          Upload a student master workbook for this school. The importer will map rows, create missing
          classes/sections automatically, generate placeholder emails when missing, and skip duplicates.
        </p>

        <p className="mb-3 text-xs text-muted-foreground">
          Supported columns include: S_name, Reg_no, srno, cname, stuSection, roll_no, StSession,
          d_birth, Admsn_Date, Mobile_No, Mobile_No2, StreetOrVillage, city, ADHAR, sex, Stu_Caste,
          Stu_Category, TRANSPORT.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleSchoolDataFileSelect}
          disabled={schoolDataImportLoading}
          className="mb-4 block w-full rounded border bg-white p-2 text-sm"
        />

        {schoolDataImportFileName && (
          <div className="mb-4 rounded border bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-medium">File:</span> {schoolDataImportFileName}</p>
            <p><span className="font-medium">Detected sheet:</span> {schoolDataImportSheetName || "-"}</p>
            <p><span className="font-medium">Total rows read:</span> {schoolDataImportTotalRows}</p>
            <p><span className="font-medium">Valid student rows:</span> {schoolDataImportRows.length}</p>
            <p><span className="font-medium">Skipped rows:</span> {schoolDataImportInvalidRows.length}</p>
            <p><span className="font-medium">Classes to auto-create:</span> {schoolDataImportClassesToCreate.length}</p>
          </div>
        )}

        {schoolDataImportFileName && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Class / section preview</p>
              <button
                type="button"
                onClick={clearSchoolDataImportPreview}
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
              >
                Clear preview
              </button>
            </div>

            {schoolDataImportClassesToCreate.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {schoolDataImportClassesToCreate.map((classLabel) => (
                  <span
                    key={classLabel}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {classLabel}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No new classes need to be created from this file.
              </p>
            )}
          </div>
        )}

        {schoolDataImportInvalidRows.length > 0 && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-900">
              Skipped preview rows: {schoolDataImportInvalidRows.length}
            </p>
            <div className="space-y-1 text-xs text-amber-900">
              {schoolDataImportInvalidRows.slice(0, 5).map((row) => (
                <p key={`${row.rowNumber}-${row.reason}`}>
                  Row {row.rowNumber}: {row.reason}
                </p>
              ))}
              {schoolDataImportInvalidRows.length > 5 && (
                <p>Showing first 5 skipped rows.</p>
              )}
            </div>
          </div>
        )}

        {schoolDataImportRows.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Class</th>
                    <th className="p-2 text-left">Section</th>
                    <th className="p-2 text-left">Roll No</th>
                    <th className="p-2 text-left">Admission No</th>
                    <th className="p-2 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolDataImportRows.slice(0, 10).map((student) => (
                    <tr key={`${student.rowNumber}-${student.rollNumber}-${student.name}`} className="border-b">
                      <td className="p-2">{student.rowNumber}</td>
                      <td className="p-2 font-medium">{student.name}</td>
                      <td className="p-2">{student.className}</td>
                      <td className="p-2">{student.classSection}</td>
                      <td className="p-2">{student.rollNumber}</td>
                      <td className="p-2">{student.admissionNumber || "-"}</td>
                      <td className="p-2">{student.phone || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {schoolDataImportRows.length > 10 && (
              <p className="text-xs text-muted-foreground">Showing first 10 rows in preview.</p>
            )}

            <button
              type="button"
              onClick={() => void handleSchoolDataImport()}
              disabled={schoolDataImportLoading}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {schoolDataImportLoading ? "Importing..." : "Import School Data"}
            </button>
          </div>
        )}

        {schoolDataImportResult && (
          <div className="mt-4 rounded border bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">Last import summary</p>
            <p>Total rows submitted: {schoolDataImportResult.totalRows}</p>
            <p>Valid rows: {schoolDataImportResult.validRows}</p>
            <p>Imported: {schoolDataImportResult.importedCount}</p>
            <p>Duplicate rows skipped: {schoolDataImportResult.duplicateCount}</p>
            <p>Failed rows: {schoolDataImportResult.failureCount}</p>
            <p>Classes created: {schoolDataImportResult.classesCreated.length}</p>

            {schoolDataImportResult.classesCreated.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {schoolDataImportResult.classesCreated.map((classLabel) => (
                  <span
                    key={classLabel}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    {classLabel}
                  </span>
                ))}
              </div>
            )}

            {schoolDataImportResult.duplicates.length > 0 && (
              <div className="mt-3 text-xs text-slate-600">
                {schoolDataImportResult.duplicates.slice(0, 5).map((row) => (
                  <p key={`duplicate-${row.rowNumber}-${row.reason}`}>
                    Row {row.rowNumber}: {row.reason}
                  </p>
                ))}
              </div>
            )}

            {schoolDataImportResult.failures.length > 0 && (
              <div className="mt-3 text-xs text-red-600">
                {schoolDataImportResult.failures.slice(0, 5).map((row) => (
                  <p key={`failure-${row.rowNumber}-${row.reason}`}>
                    Row {row.rowNumber}: {row.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Admissions</h3>

        {loading ? (
          <p className="text-gray-500">Loading admissions...</p>
        ) : recentAdmissions.length === 0 ? (
          <p className="text-gray-500">No admissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">Roll No</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAdmissions.map((student) => (
                  <tr key={student._id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{student.name}</td>
                    <td className="p-2">{student.class}</td>
                    <td className="p-2">{student.rollNumber}</td>
                    <td className="p-2">{student.email}</td>
                    <td className="p-2">{student.phone || "-"}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={() => setIdCardStudent(student)}
                      >
                        <IdCard className="w-3.5 h-3.5" />
                        ID Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <div className="bg-blue-700 text-white text-center py-2 px-3">
                <p className="text-xs font-bold tracking-widest uppercase">Student Identity Card</p>
                <p className="text-xs opacity-80">
                  {(JSON.parse(localStorage.getItem("school") ?? "{}") as { name?: string }).name ?? "School"}
                </p>
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
              <button
                type="button"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                onClick={printIdCard}
              >
                <Printer className="w-4 h-4" />
                Print ID Card
              </button>
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
