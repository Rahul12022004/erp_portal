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
  try {
    const school = JSON.parse(localStorage.getItem("school") || "{}");
    return school?.name || "School";
  } catch {
    return "School";
  }
}

function savePDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

function normalizeText(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${getSchoolName()} — Student Details Report`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      autoTable(doc, {
        startY: 28,
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

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${getSchoolName()} — Staff & Teacher Details Report`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      autoTable(doc, {
        startY: 28,
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
      const res = await fetch(`/api/finance/${schoolId}/students/summary`);
      if (!res.ok) throw new Error("Failed to fetch financial data");
      const data = await res.json() as Array<{
        student: Record<string, unknown>;
        totalFee: number;
        paidAmount: number;
        remainingAmount: number;
        status: string;
        dueDate: string;
      }>;

      const totalFees = data.reduce((s, r) => s + (r.totalFee || 0), 0);
      const totalPaid = data.reduce((s, r) => s + (r.paidAmount || 0), 0);
      const totalDue  = data.reduce((s, r) => s + (r.remainingAmount || 0), 0);

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${getSchoolName()} — Financial Report`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      autoTable(doc, {
        startY: 28,
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
  const [tab, setTab] = useState<MainTab>("students")
  const [hallTab, setHallTab] = useState<HallTab>("individual")
  const [hallClassName, setHallClassName] = useState("")
  const [hallExamType, setHallExamType] = useState<HallExamType>("mid-sem")
  const [hallLoading, setHallLoading] = useState(false)
  const [hallClassOptions, setHallClassOptions] = useState<string[]>([])
  const [hallClassLoading, setHallClassLoading] = useState(false)
  const [hallClassLoadError, setHallClassLoadError] = useState("")

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

        autoTable(doc, {
          startY: 36,
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
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Class Name" className="w-[200px]" />
          <Input placeholder="Student Name" className="w-[200px]" />
          <Button type="primary" icon={<DownloadOutlined />}>Download TC</Button>
        </div>
      )}

      {/* ================= BONAFIDE ================= */}
      {tab === "bonafide" && (
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Student Name" className="w-[200px]" />
          <Input placeholder="Purpose" className="w-[200px]" />
          <Button type="primary" icon={<FilePdfOutlined />}>Generate Bonafide</Button>
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
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Class Name" className="w-[200px]" />
          <Input placeholder="Student Name" className="w-[200px]" />
          <Button type="primary">Search</Button>
        </div>
      )}
    </div>
  )
}