import { useState } from "react"
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

// ── sub-components ────────────────────────────────────────

function StudentReport() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    const schoolId = getSchoolId();
    if (!schoolId) { void message.error("School not found. Please log in again."); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/students/${schoolId}`);
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
      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/staff/${schoolId}`);
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
      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/finance/${schoolId}/students/summary`);
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
              <Input placeholder="Class Name" className="w-[200px]" />
              <Select>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Exam Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid">Mid Term</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Student Name" className="w-[200px]" />
              <Button type="primary">Search</Button>
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