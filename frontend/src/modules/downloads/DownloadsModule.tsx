import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button, message } from "antd"
import { DownloadOutlined, FilePdfOutlined, TeamOutlined, DollarOutlined, UserOutlined } from "@ant-design/icons"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { API_URL } from "@/lib/api"

type MainTab = "tc" | "bonafide" | "hall" | "nodue" | "students" | "staff" | "financial"
type HallTab = "individual" | "online"

type StudentRecord = {
  _id: string;
  name: string;
  class: string;
  rollNumber?: string;
  admissionNumber?: string;
};

type ExamRecord = {
  _id: string;
  title: string;
  examType: string;
  className: string;
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  instructions?: string;
};

type HallExamType = "mid-sem" | "final";

type ClassRecord = {
  name?: string;
  section?: string;
};

type SchoolInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
};

type BrandedSchoolInfo = SchoolInfo & {
  logoDataUrl: string | null;
};

type SchoolSession = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contact?: string;
  email?: string;
  website?: string;
  logo?: string;
  schoolInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  };
  adminInfo?: {
    image?: string;
  };
};

type LetterheadOptions = {
  title: string;
  generatedAt?: Date | string;
  accentColor?: [number, number, number];
  subtitle?: string;
};

// ── helpers ──────────────────────────────────────────────
function getSchoolId(): string {
  try {
    const school = JSON.parse(localStorage.getItem("school") || "{}");
    return school?._id || "";
  } catch {
    return "";
  }
}

function getSchoolName(): string {
  return getSchoolInfo().name || "School";
}

function savePDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

function normalizeText(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function readSchoolSession(): SchoolSession {
  try {
    return JSON.parse(localStorage.getItem("school") || "{}") as SchoolSession;
  } catch {
    return {};
  }
}

function schoolInitials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "SC";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getImageFormat(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp)/i);
  const format = match?.[1]?.toLowerCase() || "png";

  if (format === "jpg" || format === "jpeg") {
    return "JPEG";
  }

  if (format === "webp") {
    return "WEBP";
  }

  return "PNG";
}

function buildSchoolContactLine(schoolInfo: SchoolInfo) {
  return [schoolInfo.phone, schoolInfo.email, schoolInfo.website]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" | ");
}

function formatGeneratedLabel(value?: Date | string) {
  const source = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    return new Date().toLocaleDateString("en-IN");
  }

  return source.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getLogoCandidates(session: SchoolSession, schoolInfo: SchoolInfo): string[] {
  const rawCandidates = [
    schoolInfo.logo,
    session.schoolInfo?.logo,
    session.logo,
    session.adminInfo?.image,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const expanded: string[] = [];
  rawCandidates.forEach((value) => {
    expanded.push(value);
    if (value.startsWith("/")) {
      expanded.push(`${API_URL}${value}`);
    }
  });

  return Array.from(new Set(expanded));
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return await new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function rasterizeImageToDataUrl(url: string): Promise<string | null> {
  const image = await loadImageElement(url);
  if (!image) {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width || 96;
    canvas.height = image.naturalHeight || image.height || 96;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (/^data:image\/(png|jpe?g|webp);/i.test(url)) {
    return url;
  }

  if (url.startsWith("data:image/")) {
    return await rasterizeImageToDataUrl(url);
  }

  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) {
        return dataUrl;
      }
    }
  } catch {
    // Fall through to image-element loading.
  }

  return await rasterizeImageToDataUrl(url);
}

async function resolveSchoolLogoDataUrl(schoolInfo: SchoolInfo): Promise<string | null> {
  const session = readSchoolSession();
  const candidates = getLogoCandidates(session, schoolInfo);

  for (const candidate of candidates) {
    const dataUrl = await imageUrlToDataUrl(candidate);
    if (dataUrl) {
      return dataUrl;
    }
  }

  return null;
}

async function getBrandedSchoolInfo(overrides: Partial<SchoolInfo> = {}): Promise<BrandedSchoolInfo> {
  const schoolInfo = getSchoolInfo(overrides);
  return {
    ...schoolInfo,
    logoDataUrl: await resolveSchoolLogoDataUrl(schoolInfo),
  };
}

function addSchoolLetterhead(doc: jsPDF, schoolInfo: BrandedSchoolInfo, options: LetterheadOptions) {
  const accent = options.accentColor || [37, 99, 235];
  const pageWidth = doc.internal.pageSize.getWidth();
  const top = 10;
  const left = 10;
  const right = pageWidth - 10;
  const logoX = 14;
  const logoY = 14;
  const logoSize = 18;
  const textX = logoX + logoSize + 6;
  const titleX = pageWidth - 14;
  const addressLines = doc.splitTextToSize(
    schoolInfo.address || "School Campus Address",
    Math.max(68, pageWidth - textX - 76)
  );
  const contactLines = doc.splitTextToSize(
    buildSchoolContactLine(schoolInfo) || "Phone | Email | Website",
    Math.max(68, pageWidth - textX - 76)
  );
  const subtitleLines = options.subtitle
    ? doc.splitTextToSize(options.subtitle, 56)
    : [];
  const leftBottomY = 20 + addressLines.length * 4.2 + contactLines.length * 4.2;
  const rightBottomY = 18 + subtitleLines.length * 4.2;
  const contentBottom = Math.max(logoY + logoSize, leftBottomY, rightBottomY + 8);
  const boxHeight = Math.max(30, contentBottom - top + 6);
  const separatorY = top + boxHeight + 2;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(left, top, right - left, boxHeight, 3, 3, "F");
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.line(left + 4, separatorY, right - 4, separatorY);

  if (schoolInfo.logoDataUrl) {
    try {
      doc.addImage(schoolInfo.logoDataUrl, getImageFormat(schoolInfo.logoDataUrl), logoX, logoY, logoSize, logoSize);
    } catch {
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(schoolInitials(schoolInfo.name), logoX + logoSize / 2, logoY + 11, { align: "center" });
      doc.setTextColor(15, 23, 42);
    }
  } else {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(schoolInitials(schoolInfo.name), logoX + logoSize / 2, logoY + 11, { align: "center" });
    doc.setTextColor(15, 23, 42);
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(schoolInfo.name || "School ERP", textX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(addressLines, textX, 24);
  doc.text(contactLines, textX, 24 + addressLines.length * 4.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(options.title, titleX, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${formatGeneratedLabel(options.generatedAt)}`, titleX, 24, { align: "right" });

  if (subtitleLines.length > 0) {
    doc.text(subtitleLines, titleX, 29, { align: "right" });
  }

  return separatorY + 5;
}

function matchesExamType(examType: string, selectedType: HallExamType) {
  const type = normalizeText(examType);

  if (selectedType === "final") {
    return /(final|annual|year end|year-end)/i.test(type);
  }

  return /(mid|midterm|mid term|mid-sem|mid sem|semester|half yearly|half-yearly)/i.test(
    type
  );
}

function formatExamDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString();
}

function toClassLabel(classItem: ClassRecord) {
  const name = String(classItem.name || "").trim();
  const section = String(classItem.section || "").trim();
  if (!name) {
    return "";
  }

  return section ? `${name} - ${section}` : name;
}

// ── sub-components ────────────────────────────────────────

function StudentReport() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    const schoolId = getSchoolId();
    if (!schoolId) { void message.error("School not found. Please log in again."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json() as Record<string, unknown>[];
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${getSchoolName()} — Student Details Report`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      const startY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Student Details Report",
        generatedAt,
        accentColor: [37, 99, 235],
      });

      autoTable(doc, {
        startY,
        head: [["Roll No", "Name", "Email", "Class", "Gender", "DOB", "Phone", "House", "Transport"]],
        body: data.map(s => [
          s.rollNumber ?? "", s.name ?? "", s.email ?? "", s.class ?? "",
          s.gender ?? "", s.dateOfBirth ?? "", s.phone ?? "",
          s.house ?? "—", s.needsTransport ? "Yes" : "No",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [239, 246, 255] },
      });

      savePDF(doc, `students_${new Date().toISOString().slice(0, 10)}.pdf`);
      void message.success("Student details PDF downloaded!");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <UserOutlined style={{ fontSize: 18 }} />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Student Details Report</p>
          <p className="text-xs text-gray-500">All student records including class, contact, and house info.</p>
        </div>
      </div>
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        loading={loading}
        onClick={handleDownload}
        style={{ width: "100%", background: "#2563eb" }}
        size="large"
      >
        {loading ? "Preparing PDF..." : "Download Student Details (PDF)"}
      </Button>
    </div>
  );
}

function StaffReport() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    const schoolId = getSchoolId();
    if (!schoolId) { void message.error("School not found. Please log in again."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json() as Record<string, unknown>[];
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${getSchoolName()} — Staff & Teacher Details Report`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      const startY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Staff & Teacher Details Report",
        generatedAt,
        accentColor: [22, 163, 74],
      });

      autoTable(doc, {
        startY,
        head: [["Name", "Email", "Position", "Phone", "Qualification", "Experience", "Status", "Join Date"]],
        body: data.map(s => [
          s.name ?? "", s.email ?? "", s.position ?? "", s.phone ?? "",
          s.qualification ?? "", s.experience ?? "", s.status ?? "", s.joinDate ?? "",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      });

      savePDF(doc, `staff_${new Date().toISOString().slice(0, 10)}.pdf`);
      void message.success("Staff details PDF downloaded!");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <TeamOutlined style={{ fontSize: 18 }} />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Teacher &amp; Staff Details Report</p>
          <p className="text-xs text-gray-500">All staff &amp; teacher records including position, contact, and status.</p>
        </div>
      </div>
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        loading={loading}
        onClick={handleDownload}
        style={{ width: "100%", background: "#16a34a" }}
        size="large"
      >
        {loading ? "Preparing PDF..." : "Download Staff Details (PDF)"}
      </Button>
    </div>
  );
}

function FinancialReport() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    const schoolId = getSchoolId();
    if (!schoolId) { void message.error("School not found. Please log in again."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/${schoolId}/students/summary?legacy=true`);
      if (!res.ok) throw new Error("Failed to fetch financial data");
      const data = await res.json() as Array<{
        student: Record<string, unknown>;
        totalFee: number;
        paidAmount: number;
        remainingAmount: number;
        status: string;
        dueDate: string;
      }>;
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();

      const totalFees = data.reduce((s, r) => s + (r.totalFee || 0), 0);
      const totalPaid = data.reduce((s, r) => s + (r.paidAmount || 0), 0);
      const totalDue  = data.reduce((s, r) => s + (r.remainingAmount || 0), 0);

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${getSchoolName()} — Financial Report`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      const startY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Financial Report",
        generatedAt,
        accentColor: [217, 119, 6],
      });

      autoTable(doc, {
        startY,
        head: [["Student Name", "Class", "Roll No", "Total Fee (Rs)", "Paid (Rs)", "Due (Rs)", "Status", "Due Date"]],
        body: [
          ...data.map(r => [
            String(r.student?.name ?? ""),
            String(r.student?.class ?? ""),
            String(r.student?.rollNumber ?? ""),
            String(r.totalFee),
            String(r.paidAmount),
            String(r.remainingAmount),
            r.status,
            r.dueDate,
          ]),
          ["", "", "TOTAL", String(totalFees), String(totalPaid), String(totalDue), "", ""],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [217, 119, 6] },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        didParseCell: (data) => {
          if (data.row.index === (data as unknown as { table: { body: unknown[] } }).table.body.length - 1) {
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      savePDF(doc, `financial_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      void message.success("Financial report PDF downloaded!");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <DollarOutlined style={{ fontSize: 18 }} />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Financial Report</p>
          <p className="text-xs text-gray-500">Student fee summary — total fee, paid, due, and status for every student.</p>
        </div>
      </div>
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        loading={loading}
        onClick={handleDownload}
        style={{ width: "100%", background: "#d97706" }}
        size="large"
      >
        {loading ? "Preparing PDF..." : "Download Financial Report (PDF)"}
      </Button>
    </div>
  );
}

// ── main component ────────────────────────────────────────

export default function Downloads() {
  const initialSchoolInfo = useMemo(() => getSchoolInfo(), []);
  const [tab, setTab] = useState<MainTab>("students")
  const [hallTab, setHallTab] = useState<HallTab>("individual")
  const [hallClassName, setHallClassName] = useState("")
  const [hallExamType, setHallExamType] = useState<HallExamType>("mid-sem")
  const [hallLoading, setHallLoading] = useState(false)
  const [hallClassOptions, setHallClassOptions] = useState<string[]>([])
  const [hallClassLoading, setHallClassLoading] = useState(false)
  const [hallClassLoadError, setHallClassLoadError] = useState("")
  const [noDueSchoolName, setNoDueSchoolName] = useState(initialSchoolInfo.name)
  const [noDueSchoolAddress, setNoDueSchoolAddress] = useState(initialSchoolInfo.address)
  const [noDueSchoolPhone, setNoDueSchoolPhone] = useState(initialSchoolInfo.phone)
  const [noDueSchoolEmail, setNoDueSchoolEmail] = useState(initialSchoolInfo.email)
  const [noDueClassName, setNoDueClassName] = useState("")
  const [noDueStudentName, setNoDueStudentName] = useState("")
  const [noDueRollNo, setNoDueRollNo] = useState("")
  const [noDueAdmissionNo, setNoDueAdmissionNo] = useState("")
  const [noDueAcademicYear, setNoDueAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`)
  const [noDueIssuedBy, setNoDueIssuedBy] = useState("Principal")
  const [noDueRemarks, setNoDueRemarks] = useState("No dues are pending against the student as on date.")
  const [noDueLoading, setNoDueLoading] = useState(false)
  const [tcSchoolName, setTcSchoolName] = useState(initialSchoolInfo.name)
  const [tcSchoolAddress, setTcSchoolAddress] = useState(initialSchoolInfo.address)
  const [tcSchoolPhone, setTcSchoolPhone] = useState(initialSchoolInfo.phone)
  const [tcSchoolEmail, setTcSchoolEmail] = useState(initialSchoolInfo.email)
  const [tcBoardName, setTcBoardName] = useState("Central Board of Secondary Education")
  const [tcCertificateNo, setTcCertificateNo] = useState("")
  const [tcAdmissionNo, setTcAdmissionNo] = useState("")
  const [tcStudentName, setTcStudentName] = useState("")
  const [tcFatherName, setTcFatherName] = useState("")
  const [tcMotherName, setTcMotherName] = useState("")
  const [tcDob, setTcDob] = useState("")
  const [tcClassLastStudied, setTcClassLastStudied] = useState("")
  const [tcResult, setTcResult] = useState("Pass")
  const [tcPromotionClass, setTcPromotionClass] = useState("")
  const [tcDues, setTcDues] = useState("No")
  const [tcConduct, setTcConduct] = useState("Good")
  const [tcLeavingDate, setTcLeavingDate] = useState("")
  const [tcReason, setTcReason] = useState("Parent request")
  const [tcIssueDate, setTcIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [tcIssuedBy, setTcIssuedBy] = useState("Principal")
  const [tcLoading, setTcLoading] = useState(false)
  const [bonafideSchoolName, setBonafideSchoolName] = useState(initialSchoolInfo.name)
  const [bonafideSchoolAddress, setBonafideSchoolAddress] = useState(initialSchoolInfo.address)
  const [bonafideSchoolPhone, setBonafideSchoolPhone] = useState(initialSchoolInfo.phone)
  const [bonafideSchoolEmail, setBonafideSchoolEmail] = useState(initialSchoolInfo.email)
  const [bonafideStudentName, setBonafideStudentName] = useState("")
  const [bonafideClassName, setBonafideClassName] = useState("")
  const [bonafideAdmissionNo, setBonafideAdmissionNo] = useState("")
  const [bonafideRollNo, setBonafideRollNo] = useState("")
  const [bonafidePurpose, setBonafidePurpose] = useState("For official use")
  const [bonafideSession, setBonafideSession] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`)
  const [bonafideIssueDate, setBonafideIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [bonafideIssuedBy, setBonafideIssuedBy] = useState("Principal")
  const [bonafideLoading, setBonafideLoading] = useState(false)

  const loadHallClasses = async () => {
    const schoolId = getSchoolId();
    if (!schoolId) {
      setHallClassOptions([]);
      setHallClassLoadError("School session not found. Please log in again.");
      return;
    }

    setHallClassLoading(true);
    setHallClassLoadError("");

    try {
      const [classesRes, examsRes, studentsRes] = await Promise.all([
        fetch(`/api/classes/${schoolId}`),
        fetch(`/api/exams/school/${schoolId}`),
        fetch(`/api/students/${schoolId}`),
      ]);

      const classesData = classesRes.ok
        ? ((await classesRes.json()) as ClassRecord[])
        : [];
      const examsData = examsRes.ok
        ? ((await examsRes.json()) as ExamRecord[])
        : [];
      const studentsData = studentsRes.ok
        ? ((await studentsRes.json()) as StudentRecord[])
        : [];

      const mergedClasses = new Set<string>([
        ...classesData.map(toClassLabel).filter(Boolean),
        ...examsData.map((exam) => String(exam.className || "").trim()).filter(Boolean),
        ...studentsData.map((student) => String(student.class || "").trim()).filter(Boolean),
      ]);

      const sortedOptions = Array.from(mergedClasses).sort((a, b) =>
        a.localeCompare(b)
      );

      setHallClassOptions(sortedOptions);
      if (!hallClassName && sortedOptions.length > 0) {
        setHallClassName(sortedOptions[0]);
      }

      if (sortedOptions.length === 0) {
        setHallClassLoadError("No classes found. Create class/exam first or enter class manually.");
      }
    } catch {
      setHallClassOptions([]);
      setHallClassLoadError("Unable to load classes right now.");
    } finally {
      setHallClassLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "hall" || hallTab !== "individual") {
      return;
    }

    void loadHallClasses();
  }, [tab, hallTab]);

  useEffect(() => {
    const handleSessionUpdate = () => {
      if (tab === "hall" && hallTab === "individual") {
        void loadHallClasses();
      }
    };

    window.addEventListener("school-session-updated", handleSessionUpdate);

    return () => {
      window.removeEventListener("school-session-updated", handleSessionUpdate);
    };
  }, [tab, hallTab]);

  const hallExamTypeLabel = useMemo(
    () => (hallExamType === "final" ? "Final Exam" : "Mid-Sem Exam"),
    [hallExamType]
  );

  const handleDownloadHallTickets = async () => {
    const schoolId = getSchoolId();
    if (!schoolId) {
      void message.error("School not found. Please log in again.");
      return;
    }

    const selectedClass = hallClassName.trim();
    if (!selectedClass) {
      void message.error("Please enter class name");
      return;
    }

    setHallLoading(true);

    try {
      const [studentsRes, examsRes] = await Promise.all([
        fetch(`/api/students/${schoolId}`),
        fetch(`/api/exams/school/${schoolId}`),
      ]);

      if (!studentsRes.ok) {
        throw new Error("Failed to fetch students");
      }

      if (!examsRes.ok) {
        throw new Error("Failed to fetch exams");
      }

      const students = (await studentsRes.json()) as StudentRecord[];
      const exams = (await examsRes.json()) as ExamRecord[];
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();

      const classKey = normalizeText(selectedClass);

      const classStudents = students.filter(
        (student) => normalizeText(student.class) === classKey
      );

      if (classStudents.length === 0) {
        throw new Error("No students found for selected class");
      }

      const classExams = exams
        .filter((exam) => normalizeText(exam.className) === classKey)
        .filter((exam) => matchesExamType(exam.examType, hallExamType))
        .sort((a, b) => {
          const dateDiff = String(a.examDate).localeCompare(String(b.examDate));
          if (dateDiff !== 0) {
            return dateDiff;
          }
          return String(a.startTime).localeCompare(String(b.startTime));
        });

      if (classExams.length === 0) {
        throw new Error(`No ${hallExamTypeLabel} schedule found for this class`);
      }

      const doc = new jsPDF();

      classStudents.forEach((student, index) => {
        if (index > 0) {
          doc.addPage();
        }

        doc.setFontSize(18);
        doc.text(getSchoolName(), 14, 16);

        doc.setFontSize(13);
        doc.text(`${hallExamTypeLabel} Hall Ticket`, 14, 24);

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 31);
        const startY = addSchoolLetterhead(doc, schoolInfo, {
          title: `${hallExamTypeLabel} Hall Ticket`,
          generatedAt,
          accentColor: [37, 99, 235],
          subtitle: selectedClass,
        });

        autoTable(doc, {
          startY,
          theme: "grid",
          styles: { fontSize: 9 },
          body: [
            ["Student Name", student.name || "-"],
            ["Class", selectedClass],
            ["Roll Number", student.rollNumber || "-"],
            ["Admission Number", student.admissionNumber || "-"],
          ],
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 48 },
            1: { cellWidth: 130 },
          },
        });

        autoTable(doc, {
          startY: (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
            ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
            : 72,
          head: [["S. No.", "Subject", "Date", "Time", "Instructions"]],
          body: classExams.map((exam, examIndex) => [
            String(examIndex + 1),
            exam.subject || exam.title || "-",
            formatExamDate(exam.examDate),
            `${exam.startTime} - ${exam.endTime}`,
            exam.instructions?.trim() || "Follow exam hall rules and carry school ID card.",
          ]),
          styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
          headStyles: { fillColor: [37, 99, 235] },
          columnStyles: {
            0: { cellWidth: 14 },
            1: { cellWidth: 34 },
            2: { cellWidth: 24 },
            3: { cellWidth: 26 },
            4: { cellWidth: 86 },
          },
        });

        const lastY =
          (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ||
          250;
        doc.setFontSize(9);
        doc.text("General Instructions:", 14, Math.min(lastY + 8, 270));
        doc.text("1. Reach exam hall at least 30 minutes before start time.", 14, Math.min(lastY + 14, 276));
        doc.text("2. Bring this hall ticket and valid school ID card.", 14, Math.min(lastY + 20, 282));
      });

      const safeClassName = selectedClass.replace(/[^a-zA-Z0-9_-]/g, "-");
      savePDF(
        doc,
        `hall-tickets-${safeClassName}-${hallExamType}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      void message.success(`Hall tickets downloaded for ${classStudents.length} students`);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Failed to download hall tickets");
    } finally {
      setHallLoading(false);
    }
  };

  const handleDownloadNoDueCertificate = async () => {
    if (!noDueStudentName.trim()) {
      void message.error("Please enter student name");
      return;
    }

    if (!noDueClassName.trim()) {
      void message.error("Please enter class name");
      return;
    }

    setNoDueLoading(true);

    try {
      const issueDate = new Date();
      const issueDateLabel = issueDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const dateCode = `${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, "0")}${String(issueDate.getDate()).padStart(2, "0")}`;
      const certificateNo = `NDC-${dateCode}-${String(issueDate.getTime()).slice(-3)}`;
      const schoolInfo = await getBrandedSchoolInfo({
        name: noDueSchoolName.trim() || undefined,
        address: noDueSchoolAddress.trim() || undefined,
        phone: noDueSchoolPhone.trim() || undefined,
        email: noDueSchoolEmail.trim() || undefined,
      });

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.7);
      doc.rect(10, 10, 190, 277);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, 182, 269);
      let contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: "No Due Certificate",
        generatedAt: issueDate,
        accentColor: [15, 118, 110],
      });
      let metaY = contentStartY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(noDueSchoolName.trim() || "School ERP", 105, 28, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(noDueSchoolAddress.trim() || "School Campus Address", 105, 35, { align: "center" });
      doc.text(`Phone: ${noDueSchoolPhone.trim() || "-"}    Email: ${noDueSchoolEmail.trim() || "-"}`, 105, 41, { align: "center" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.4);
      doc.line(20, 47, 190, 47);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("NO DUE CERTIFICATE", 105, 60, { align: "center" });
      contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: "No Due Certificate",
        generatedAt: issueDate,
        accentColor: [15, 118, 110],
      });
      metaY = contentStartY + 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Certificate No: ${certificateNo}`, 20, metaY);
      doc.text(`Date: ${issueDateLabel}`, 150, metaY);

      const statement = [
        `This is to certify that ${noDueStudentName.trim()} ${noDueRollNo.trim() ? `(Roll No: ${noDueRollNo.trim()})` : ""}`,
        `of class ${noDueClassName.trim()} ${noDueAdmissionNo.trim() ? `(Admission No: ${noDueAdmissionNo.trim()})` : ""}`,
        `for the academic year ${noDueAcademicYear.trim() || "-"} has cleared all dues payable to the school.`,
        noDueRemarks.trim() || "No dues are pending against the student as on date.",
      ].join(" ");

      const wrapped = doc.splitTextToSize(statement, 165);
      const statementY = metaY + 18;
      doc.text(wrapped, 22, statementY);

      const detailsTopY = Math.max(150, statementY + wrapped.length * 6 + 16);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(20, detailsTopY, 170, 52);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Student Details", 24, detailsTopY + 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(`Student Name: ${noDueStudentName.trim()}`, 24, detailsTopY + 19);
      doc.text(`Class: ${noDueClassName.trim()}`, 24, detailsTopY + 26);
      doc.text(`Roll Number: ${noDueRollNo.trim() || "-"}`, 24, detailsTopY + 33);
      doc.text(`Admission Number: ${noDueAdmissionNo.trim() || "-"}`, 24, detailsTopY + 40);
      doc.text(`Academic Year: ${noDueAcademicYear.trim() || "-"}`, 24, detailsTopY + 47);

      doc.setFont("helvetica", "normal");
      doc.text("Authorized Signatory", 150, 250, { align: "center" });
      doc.line(125, 244, 175, 244);
      doc.setFont("helvetica", "bold");
      doc.text(noDueIssuedBy.trim() || "Principal", 150, 256, { align: "center" });

      const safeStudent = noDueStudentName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "student";
      savePDF(doc, `no-due-certificate-${safeStudent}-${dateCode}.pdf`);
      void message.success("No Due Certificate downloaded successfully.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Failed to generate no due certificate");
    } finally {
      setNoDueLoading(false);
    }
  };

  const handleDownloadTransferCertificate = async () => {
    if (!tcStudentName.trim()) {
      void message.error("Please enter student name");
      return;
    }

    if (!tcClassLastStudied.trim()) {
      void message.error("Please enter class last studied");
      return;
    }

    setTcLoading(true);

    try {
      const now = new Date();
      const autoNo = `TC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getTime()).slice(-4)}`;
      const certificateNo = tcCertificateNo.trim() || autoNo;
      const issueDate = tcIssueDate ? new Date(tcIssueDate) : now;
      const issueDateLabel = issueDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const schoolInfo = await getBrandedSchoolInfo({
        name: tcSchoolName.trim() || undefined,
        address: tcSchoolAddress.trim() || undefined,
        phone: tcSchoolPhone.trim() || undefined,
        email: tcSchoolEmail.trim() || undefined,
      });

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setDrawColor(60, 93, 148);
      doc.setLineWidth(0.8);
      doc.rect(9, 9, 192, 279);
      doc.setLineWidth(0.35);
      doc.rect(13, 13, 184, 271);
      let contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Transfer Certificate",
        generatedAt: issueDate,
        accentColor: [60, 93, 148],
        subtitle: (tcBoardName || "Board of Education").toUpperCase(),
      });
      let metaY = contentStartY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`S. No: ${certificateNo}`, 16, 20);

      doc.setFontSize(17);
      doc.text((tcBoardName || "Board of Education").toUpperCase(), 105, 30, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text((tcSchoolName || "School Name").toUpperCase(), 105, 40, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(tcSchoolAddress || "School Address", 105, 46, { align: "center" });
      doc.text(`Phone: ${tcSchoolPhone || "-"}   Email: ${tcSchoolEmail || "-"}`, 105, 51, { align: "center" });

      doc.setDrawColor(60, 93, 148);
      doc.setLineWidth(0.3);
      doc.line(18, 56, 192, 56);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("TRANSFER CERTIFICATE", 105, 66, { align: "center" });
      contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Transfer Certificate",
        generatedAt: issueDate,
        accentColor: [60, 93, 148],
        subtitle: (tcBoardName || "Board of Education").toUpperCase(),
      });
      metaY = contentStartY + 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Certificate No: ${certificateNo}`, 16, metaY);
      doc.text(`Date of Issue: ${issueDateLabel}`, 194, metaY, { align: "right" });

      autoTable(doc, {
        startY: metaY + 8,
        theme: "grid",
        styles: { fontSize: 9.6, cellPadding: 2.6, lineColor: [180, 190, 205], lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 78, fontStyle: "bold" },
          1: { cellWidth: 96 },
        },
        body: [
          ["1. Certificate No.", certificateNo],
          ["2. Admission No.", tcAdmissionNo || "-"],
          ["3. Name of Student", tcStudentName],
          ["4. Father's Name", tcFatherName || "-"],
          ["5. Mother's Name", tcMotherName || "-"],
          ["6. Date of Birth", tcDob || "-"],
          ["7. Class Last Studied", tcClassLastStudied],
          ["8. Result of Last Examination", tcResult || "-"],
          ["9. Promoted to Class", tcPromotionClass || "-"],
          ["10. Any Dues", tcDues || "No"],
          ["11. General Conduct", tcConduct || "Good"],
          ["12. Date of Leaving", tcLeavingDate || "-"],
          ["13. Reason for Leaving", tcReason || "-"],
          ["14. Date of Issue", issueDateLabel],
        ],
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 220;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("This is to certify that the above information is correct as per school records.", 16, finalY + 10);

      doc.line(22, 262, 80, 262);
      doc.line(132, 262, 188, 262);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Class Teacher", 51, 268, { align: "center" });
      doc.text(tcIssuedBy || "Principal", 160, 268, { align: "center" });

      const safeStudent = tcStudentName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "student";
      savePDF(doc, `transfer-certificate-${safeStudent}-${now.toISOString().slice(0, 10)}.pdf`);
      void message.success("Transfer Certificate downloaded successfully.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Failed to generate transfer certificate");
    } finally {
      setTcLoading(false);
    }
  };

  const handleDownloadBonafideCertificate = async () => {
    if (!bonafideStudentName.trim()) {
      void message.error("Please enter student name");
      return;
    }

    if (!bonafideClassName.trim()) {
      void message.error("Please enter class name");
      return;
    }

    setBonafideLoading(true);

    try {
      const now = new Date();
      const issueDate = bonafideIssueDate ? new Date(bonafideIssueDate) : now;
      const issueDateLabel = issueDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const refNo = `BON-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getTime()).slice(-4)}`;
      const schoolInfo = await getBrandedSchoolInfo({
        name: bonafideSchoolName.trim() || undefined,
        address: bonafideSchoolAddress.trim() || undefined,
        phone: bonafideSchoolPhone.trim() || undefined,
        email: bonafideSchoolEmail.trim() || undefined,
      });

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.8);
      doc.rect(10, 10, 190, 277);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, 182, 269);
      let contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Bonafide Certificate",
        generatedAt: issueDate,
        accentColor: [30, 64, 175],
      });
      let metaY = contentStartY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text((bonafideSchoolName || "School Name").toUpperCase(), 105, 30, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(`Ref No: ${refNo}`, 16, metaY);
      doc.text(`Date: ${issueDateLabel}`, 194, metaY, { align: "right" });

      doc.setDrawColor(30, 64, 175);
      doc.line(20, 54, 190, 54);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("BONAFIDE CERTIFICATE", 105, 66, { align: "center" });
      contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: "Bonafide Certificate",
        generatedAt: issueDate,
        accentColor: [30, 64, 175],
      });
      metaY = contentStartY + 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const para = [
        `This is to certify that ${bonafideStudentName.trim()}${bonafideAdmissionNo.trim() ? ` (Admission No: ${bonafideAdmissionNo.trim()})` : ""}`,
        `${bonafideRollNo.trim() ? `Roll No: ${bonafideRollNo.trim()},` : ""} is a bonafide student of this institution,`,
        `studying in class ${bonafideClassName.trim()} during the academic session ${bonafideSession.trim() || "-"}.`,
        `This certificate is issued on request for the purpose of ${bonafidePurpose.trim() || "official use"}.`,
      ].join(" ");

      const wrappedPara = doc.splitTextToSize(para, 165);
      const bodyStartY = metaY + 18;
      doc.text(wrappedPara, 22, bodyStartY);

      const bodyEndY = bodyStartY + wrappedPara.length * 6;
      doc.setFontSize(10);
      doc.text("This certificate is valid only with authorized signature and school seal.", 22, bodyEndY + 12);

      doc.line(130, 248, 188, 248);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(bonafideIssuedBy || "Principal", 159, 255, { align: "center" });
      doc.text("Authorized Signatory", 159, 261, { align: "center" });

      const safeStudent = bonafideStudentName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "student";
      savePDF(doc, `bonafide-certificate-${safeStudent}-${now.toISOString().slice(0, 10)}.pdf`);
      void message.success("Bonafide certificate downloaded successfully.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Failed to generate bonafide certificate");
    } finally {
      setBonafideLoading(false);
    }
  };

  const TABS = [
    { id: "students",  label: "Student Details" },
    { id: "staff",     label: "Staff / Teacher" },
    { id: "financial", label: "Financial Report" },
    { id: "tc",        label: "Download TC" },
    { id: "bonafide",  label: "Bonafide" },
    { id: "hall",      label: "Hall Ticket" },
    { id: "nodue",     label: "No Due Certificate" },
  ] as const;

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      <h1 className="text-2xl font-semibold">Downloads</h1>


      {/* MAIN TABS */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Button
            key={t.id}
            type={tab === t.id ? "primary" : "default"}
            onClick={() => setTab(t.id as MainTab)}
            icon={["students", "staff", "financial"].includes(t.id) ? <DownloadOutlined /> : undefined}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* ================= REPORT TABS ================= */}
      {tab === "students" && <StudentReport />}
      {tab === "staff" && <StaffReport />}
      {tab === "financial" && <FinancialReport />}

      {/* ================= DOWNLOAD TC ================= */}
      {tab === "tc" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Transfer Certificate</h3>
          <p className="text-sm text-slate-500">Certificate layout is styled similar to your sample. Update fields and download PDF.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Board Name" value={tcBoardName} onChange={(event) => setTcBoardName(event.target.value)} />
            <Input placeholder="Certificate No (auto if blank)" value={tcCertificateNo} onChange={(event) => setTcCertificateNo(event.target.value)} />
            <Input placeholder="School Name" value={tcSchoolName} onChange={(event) => setTcSchoolName(event.target.value)} />
            <Input placeholder="School Contact" value={tcSchoolPhone} onChange={(event) => setTcSchoolPhone(event.target.value)} />
            <Input placeholder="School Address" value={tcSchoolAddress} onChange={(event) => setTcSchoolAddress(event.target.value)} className="md:col-span-2" />
            <Input placeholder="School Email" value={tcSchoolEmail} onChange={(event) => setTcSchoolEmail(event.target.value)} />
            <Input placeholder="Issued By" value={tcIssuedBy} onChange={(event) => setTcIssuedBy(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Student Name" value={tcStudentName} onChange={(event) => setTcStudentName(event.target.value)} />
            <Input placeholder="Admission Number" value={tcAdmissionNo} onChange={(event) => setTcAdmissionNo(event.target.value)} />
            <Input placeholder="Father Name" value={tcFatherName} onChange={(event) => setTcFatherName(event.target.value)} />
            <Input placeholder="Mother Name" value={tcMotherName} onChange={(event) => setTcMotherName(event.target.value)} />
            <Input placeholder="Date of Birth" value={tcDob} onChange={(event) => setTcDob(event.target.value)} />
            <Input placeholder="Class Last Studied" value={tcClassLastStudied} onChange={(event) => setTcClassLastStudied(event.target.value)} />
            <Input placeholder="Result" value={tcResult} onChange={(event) => setTcResult(event.target.value)} />
            <Input placeholder="Promoted to Class" value={tcPromotionClass} onChange={(event) => setTcPromotionClass(event.target.value)} />
            <Input placeholder="Any Dues" value={tcDues} onChange={(event) => setTcDues(event.target.value)} />
            <Input placeholder="General Conduct" value={tcConduct} onChange={(event) => setTcConduct(event.target.value)} />
            <Input placeholder="Date of Leaving" value={tcLeavingDate} onChange={(event) => setTcLeavingDate(event.target.value)} />
            <Input placeholder="Date of Issue (YYYY-MM-DD)" value={tcIssueDate} onChange={(event) => setTcIssueDate(event.target.value)} />
            <Input placeholder="Reason for Leaving" value={tcReason} onChange={(event) => setTcReason(event.target.value)} className="md:col-span-2" />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={tcLoading}
              onClick={() => void handleDownloadTransferCertificate()}
            >
              {tcLoading ? "Generating..." : "Download Transfer Certificate"}
            </Button>
            <Button
              onClick={() => {
                const latestSchoolInfo = getSchoolInfo();
                setTcSchoolName(latestSchoolInfo.name);
                setTcSchoolAddress(latestSchoolInfo.address);
                setTcSchoolPhone(latestSchoolInfo.phone);
                setTcSchoolEmail(latestSchoolInfo.email);
              }}
            >
              Reset School Info
            </Button>
          </div>
        </div>
      )}

      {/* ================= BONAFIDE ================= */}
      {tab === "bonafide" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Bonafide Certificate</h3>
          <p className="text-sm text-slate-500">Fill in school and student details, then generate the bonafide certificate PDF.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="School Name" value={bonafideSchoolName} onChange={(event) => setBonafideSchoolName(event.target.value)} />
            <Input placeholder="School Contact" value={bonafideSchoolPhone} onChange={(event) => setBonafideSchoolPhone(event.target.value)} />
            <Input placeholder="School Address" value={bonafideSchoolAddress} onChange={(event) => setBonafideSchoolAddress(event.target.value)} className="md:col-span-2" />
            <Input placeholder="School Email" value={bonafideSchoolEmail} onChange={(event) => setBonafideSchoolEmail(event.target.value)} />
            <Input placeholder="Issued By" value={bonafideIssuedBy} onChange={(event) => setBonafideIssuedBy(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Student Name" value={bonafideStudentName} onChange={(event) => setBonafideStudentName(event.target.value)} />
            <Input placeholder="Class Name" value={bonafideClassName} onChange={(event) => setBonafideClassName(event.target.value)} />
            <Input placeholder="Admission Number" value={bonafideAdmissionNo} onChange={(event) => setBonafideAdmissionNo(event.target.value)} />
            <Input placeholder="Roll Number" value={bonafideRollNo} onChange={(event) => setBonafideRollNo(event.target.value)} />
            <Input placeholder="Academic Session" value={bonafideSession} onChange={(event) => setBonafideSession(event.target.value)} />
            <Input placeholder="Date of Issue (YYYY-MM-DD)" value={bonafideIssueDate} onChange={(event) => setBonafideIssueDate(event.target.value)} />
            <Input placeholder="Purpose" value={bonafidePurpose} onChange={(event) => setBonafidePurpose(event.target.value)} className="md:col-span-2" />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={bonafideLoading}
              onClick={() => void handleDownloadBonafideCertificate()}
            >
              {bonafideLoading ? "Generating..." : "Download Bonafide Certificate"}
            </Button>
            <Button
              onClick={() => {
                const latestSchoolInfo = getSchoolInfo();
                setBonafideSchoolName(latestSchoolInfo.name);
                setBonafideSchoolAddress(latestSchoolInfo.address);
                setBonafideSchoolPhone(latestSchoolInfo.phone);
                setBonafideSchoolEmail(latestSchoolInfo.email);
              }}
            >
              Reset School Info
            </Button>
          </div>
        </div>
      )}

      {/* ================= HALL TICKET ================= */}
      {tab === "hall" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              type={hallTab === "individual" ? "primary" : "default"}
              onClick={() => setHallTab("individual")}
            >
              Individual Hall Ticket
            </Button>
            <Button
              type={hallTab === "online" ? "primary" : "default"}
              onClick={() => setHallTab("online")}
            >
              Online Individual Hall Ticket
            </Button>
          </div>

          {hallTab === "individual" && (
            <div className="flex flex-wrap gap-4">
              <Select
                value={hallClassName}
                onValueChange={setHallClassName}
                disabled={hallClassLoading || hallClassOptions.length === 0}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue
                    placeholder={hallClassLoading ? "Loading classes..." : "Select Class"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {hallClassOptions.map((classOption) => (
                    <SelectItem key={classOption} value={classOption}>
                      {classOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={hallExamType}
                onValueChange={(value) => setHallExamType(value as HallExamType)}
              >
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Exam Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid-sem">Mid-Sem Exam</SelectItem>
                  <SelectItem value="final">Final Exam</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={hallLoading}
                onClick={() => void handleDownloadHallTickets()}
              >
                {hallLoading ? "Preparing Hall Tickets..." : "Download Hall Tickets (All Students)"}
              </Button>
              <Button onClick={() => void loadHallClasses()} disabled={hallClassLoading}>
                Refresh Classes
              </Button>
              {hallClassOptions.length === 0 && !hallClassLoading && (
                <Input
                  placeholder="Class Name (manual)"
                  className="w-[220px]"
                  value={hallClassName}
                  onChange={(event) => setHallClassName(event.target.value)}
                />
              )}
              {hallClassLoadError && (
                <p className="w-full text-xs text-amber-700">{hallClassLoadError}</p>
              )}
            </div>
          )}

          {hallTab === "online" && (
            <div className="flex flex-wrap gap-4">
              <Input placeholder="Class Name" className="w-[200px]" />
              <Select>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Exam Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online Exam</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Student Name" className="w-[200px]" />
              <Button type="primary">Search</Button>
            </div>
          )}
        </div>
      )}

      {/* ================= NO DUE ================= */}
      {tab === "nodue" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">No Due Certificate</h3>
          <p className="text-sm text-slate-500">Update school information and student details, then download the certificate PDF.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="School Name" value={noDueSchoolName} onChange={(event) => setNoDueSchoolName(event.target.value)} />
            <Input placeholder="School Contact" value={noDueSchoolPhone} onChange={(event) => setNoDueSchoolPhone(event.target.value)} />
            <Input placeholder="School Address" value={noDueSchoolAddress} onChange={(event) => setNoDueSchoolAddress(event.target.value)} className="md:col-span-2" />
            <Input placeholder="School Email" value={noDueSchoolEmail} onChange={(event) => setNoDueSchoolEmail(event.target.value)} />
            <Input placeholder="Issued By (Principal / Admin)" value={noDueIssuedBy} onChange={(event) => setNoDueIssuedBy(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Student Name" value={noDueStudentName} onChange={(event) => setNoDueStudentName(event.target.value)} />
            <Input placeholder="Class Name" value={noDueClassName} onChange={(event) => setNoDueClassName(event.target.value)} />
            <Input placeholder="Roll Number" value={noDueRollNo} onChange={(event) => setNoDueRollNo(event.target.value)} />
            <Input placeholder="Admission Number" value={noDueAdmissionNo} onChange={(event) => setNoDueAdmissionNo(event.target.value)} />
            <Input placeholder="Academic Year" value={noDueAcademicYear} onChange={(event) => setNoDueAcademicYear(event.target.value)} />
            <Input placeholder="Remarks" value={noDueRemarks} onChange={(event) => setNoDueRemarks(event.target.value)} className="md:col-span-2" />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={noDueLoading}
              onClick={() => void handleDownloadNoDueCertificate()}
            >
              {noDueLoading ? "Generating..." : "Download No Due Certificate"}
            </Button>
            <Button
              onClick={() => {
                const latestSchoolInfo = getSchoolInfo();
                setNoDueSchoolName(latestSchoolInfo.name);
                setNoDueSchoolAddress(latestSchoolInfo.address);
                setNoDueSchoolPhone(latestSchoolInfo.phone);
                setNoDueSchoolEmail(latestSchoolInfo.email);
              }}
            >
              Reset School Info
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getSchoolInfo(overrides: Partial<SchoolInfo> = {}): SchoolInfo {
  try {
    const school = readSchoolSession();
    const schoolData = school.schoolInfo || {};
    const baseAddress = String(schoolData.address || school.address || "").trim();
    const fallbackAddressParts = [school.city, school.state, school.pincode]
      .map((part) => String(part || "").trim())
      .filter(Boolean);

    const baseInfo: SchoolInfo = {
      name: String(schoolData.name || school.name || "School ERP").trim() || "School ERP",
      address: baseAddress || fallbackAddressParts.join(", ") || "School Campus Address",
      phone: String(schoolData.phone || school.phone || school.contact || "").trim() || "+91-XXXXXXXXXX",
      email: String(schoolData.email || school.email || "").trim() || "info@school.edu",
      website: String(schoolData.website || school.website || "").trim(),
      logo: String(schoolData.logo || school.logo || "").trim(),
    };

    return {
      ...baseInfo,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([, value]) => String(value || "").trim())
      ),
    } as SchoolInfo;
  } catch {
    return {
      name: String(overrides.name || "School ERP").trim() || "School ERP",
      address: String(overrides.address || "School Campus Address").trim() || "School Campus Address",
      phone: String(overrides.phone || "+91-XXXXXXXXXX").trim() || "+91-XXXXXXXXXX",
      email: String(overrides.email || "info@school.edu").trim() || "info@school.edu",
      website: String(overrides.website || "").trim(),
      logo: String(overrides.logo || "").trim(),
    };
  }
}
