import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  PencilLine,
  Plus,
  Printer,
  QrCode,
  Save,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

type Status = "Approved" | "Pending" | "Rejected";

type SchoolSession = {
  _id?: string;
  schoolInfo?: {
    name?: string;
    logo?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

type VisitorForm = {
  passId: string;
  regDate: string;
  requestMode: string;
  passStatus: Status;
  fullName: string;
  photo: string;
  mobile: string;
  email: string;
  address: string;
  idType: string;
  idNumber: string;
  idProof: string;
  idProofFileName: string;
  visitDate: string;
  entryTime: string;
  exitTime: string;
  visitType: string;
  purpose: string;
  personToMeetType: string;
  personToMeet: string;
  department: string;
  studentClass: string;
  studentName: string;
  approvalStatus: Status;
};

type VisitorRecord = VisitorForm & {
  _id: string;
  schoolId: string;
  updatedAt?: string;
};

type StudentRecord = {
  _id: string;
  name: string;
  class: string;
};

type StaffRecord = {
  _id: string;
  name: string;
  position?: string;
};

const emptyForm = (): VisitorForm => ({
  passId: "",
  regDate: "",
  requestMode: "Walk-in",
  passStatus: "Pending",
  fullName: "",
  photo: "",
  mobile: "",
  email: "",
  address: "",
  idType: "Aadhar",
  idNumber: "",
  idProof: "",
  idProofFileName: "",
  visitDate: "",
  entryTime: "",
  exitTime: "",
  visitType: "Official",
  purpose: "",
  personToMeetType: "Staff",
  personToMeet: "",
  department: "Admin",
  studentClass: "",
  studentName: "",
  approvalStatus: "Pending",
});

const statusClasses: Record<Status, string> = {
  Approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-100 text-amber-700 border border-amber-200",
  Rejected: "bg-rose-100 text-rose-700 border border-rose-200",
};

const requestModes = ["Walk-in", "Phone Request", "Email Request", "Online"];
const visitTypes = ["Official", "Personal", "Parent", "Vendor"];
const departments = ["Admin", "Accounts", "Principal"];
const idTypes = ["Aadhar", "PAN", "Driving License", "Other"];
const meetTypes = ["Student", "Teacher", "Staff"];

function mask(value: string, visibleEnd = 4) {
  if (!value) return "-";
  if (value.length <= visibleEnd) return value;
  return `${"*".repeat(value.length - visibleEnd)}${value.slice(-visibleEnd)}`;
}

function printable(value: string) {
  return value || "-";
}

export default function VisitorModule() {
  const [school, setSchool] = useState<SchoolSession | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [records, setRecords] = useState<VisitorRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<VisitorForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [makePassCollapsed, setMakePassCollapsed] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [barcodeUrl, setBarcodeUrl] = useState("");

  useEffect(() => {
    const storedSchool = JSON.parse(localStorage.getItem("school") || "null");
    if (!storedSchool?._id) {
      setError("School not found. Please log in again.");
      setLoading(false);
      return;
    }
    setSchool(storedSchool);
    setSchoolId(storedSchool._id);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const [visitorRes, studentRes, staffRes] = await Promise.all([
          fetch(`${API_URL}/api/visitors/school/${schoolId}`),
          fetch(`${API_URL}/api/students/${schoolId}`),
          fetch(`${API_URL}/api/staff/${schoolId}`),
        ]);
        const visitorData = await visitorRes.json().catch(() => []);
        const studentData = await studentRes.json().catch(() => []);
        const staffData = await staffRes.json().catch(() => []);
        if (!visitorRes.ok) throw new Error(visitorData?.message || "Failed to fetch visitor passes");
        if (!studentRes.ok) throw new Error(studentData?.message || "Failed to fetch students");
        if (!staffRes.ok) throw new Error(staffData?.message || "Failed to fetch staff");
        if (cancelled) return;
        const nextVisitors = Array.isArray(visitorData) ? (visitorData as VisitorRecord[]) : [];
        setRecords(nextVisitors);
        setStudents(Array.isArray(studentData) ? (studentData as StudentRecord[]) : []);
        setStaff(Array.isArray(staffData) ? (staffData as StaffRecord[]) : []);
        if (nextVisitors[0]) {
          setSelectedId(nextVisitors[0]._id);
          setForm({ ...emptyForm(), ...nextVisitors[0] });
          setEditing(false);
        } else {
          setSelectedId("");
          setForm(emptyForm());
          setEditing(true);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load visitor data");
          setRecords([]);
          setForm(emptyForm());
          setEditing(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    const passValue = form.passId || "";
    if (!passValue) {
      setQrCodeUrl("");
      setBarcodeUrl("");
      return;
    }
    let cancelled = false;
    const generateCodes = async () => {
      try {
        const qr = await QRCode.toDataURL(passValue, {
          margin: 1,
          width: 180,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, passValue, {
          format: "CODE128",
          lineColor: "#0f172a",
          background: "#ffffff",
          height: 48,
          width: 1.8,
          displayValue: false,
          margin: 0,
        });
        if (!cancelled) {
          setQrCodeUrl(qr);
          setBarcodeUrl(canvas.toDataURL("image/png"));
        }
      } catch {
        if (!cancelled) {
          setQrCodeUrl("");
          setBarcodeUrl("");
        }
      }
    };
    generateCodes();
    return () => {
      cancelled = true;
    };
  }, [form.passId]);

  const studentClassOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.class).filter(Boolean))).sort(),
    [students],
  );

  const studentNameOptions = useMemo(
    () =>
      students
        .filter((student) => !form.studentClass || student.class === form.studentClass)
        .map((student) => student.name)
        .sort(),
    [students, form.studentClass],
  );

  const personOptions = useMemo(() => {
    if (form.personToMeetType === "Teacher") {
      return staff
        .filter((member) => /teacher/i.test(member.position || ""))
        .map((member) => member.name)
        .sort();
    }
    if (form.personToMeetType === "Student") {
      return studentNameOptions;
    }
    return staff.map((member) => member.name).sort();
  }, [form.personToMeetType, staff, studentNameOptions]);

  const selectedRecord = useMemo(
    () => records.find((record) => record._id === selectedId) || null,
    [records, selectedId],
  );

  const updateField = (name: keyof VisitorForm, value: string) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "personToMeetType" && value !== "Student") {
        next.studentClass = "";
        next.studentName = "";
      }
      if (name === "studentClass") {
        next.studentName = "";
        next.personToMeet = "";
      }
      if (name === "studentName") {
        next.personToMeet = value;
      }
      return next;
    });
  };

  const readFile = (file: File, onSuccess: (result: string, fileName: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        toast.error("Unable to read the selected file.");
        return;
      }
      onSuccess(result, file.name);
    };
    reader.onerror = () => toast.error("Unable to read the selected file.");
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image for visitor photo.");
      event.target.value = "";
      return;
    }
    readFile(file, (result) => {
      setForm((current) => ({ ...current, photo: result }));
      toast.success("Visitor photo selected.");
    });
    event.target.value = "";
  };

  const handleIdProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed) {
      toast.error("Please upload an image or PDF for ID proof.");
      event.target.value = "";
      return;
    }
    readFile(file, (result, fileName) => {
      setForm((current) => ({ ...current, idProof: result, idProofFileName: fileName }));
      toast.success("ID proof selected.");
    });
    event.target.value = "";
  };

  const hydrateRecord = (record: VisitorRecord) => {
    setSelectedId(record._id);
    setForm({ ...emptyForm(), ...record });
    setEditing(false);
  };

  const selectRecord = (recordId: string) => {
    const record = records.find((item) => item._id === recordId);
    if (!record) return;
    hydrateRecord(record);
  };

  const startNewPass = () => {
    setSelectedId("");
    setForm(emptyForm());
    setEditing(true);
    setMakePassCollapsed(false);
  };

  const saveRecord = async () => {
    if (!schoolId) {
      toast.error("School session is missing.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        schoolId,
        ...form,
        personToMeet: form.personToMeetType === "Student" ? form.studentName : form.personToMeet,
      };
      const response = await fetch(
        selectedId ? `${API_URL}/api/visitors/${selectedId}` : `${API_URL}/api/visitors`,
        {
          method: selectedId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.data) {
        throw new Error(data?.message || "Failed to save visitor pass");
      }
      const saved = data.data as VisitorRecord;
      setRecords((current) => {
        const index = current.findIndex((item) => item._id === saved._id);
        if (index >= 0) {
          const next = [...current];
          next[index] = saved;
          return next;
        }
        return [saved, ...current];
      });
      hydrateRecord(saved);
      toast.success(selectedId ? "Visitor pass updated." : "Visitor pass generated.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save visitor pass");
    } finally {
      setSaving(false);
    }
  };

  const scanPassExit = async () => {
    const passId = scanInput.trim();
    if (!passId || !schoolId) {
      toast.error("Enter or scan a pass ID first.");
      return;
    }
    try {
      setScanLoading(true);
      const response = await fetch(`${API_URL}/api/visitors/scan-exit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, passId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.data) {
        throw new Error(data?.message || "Failed to scan pass");
      }
      const updated = data.data as VisitorRecord;
      setRecords((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      if (selectedId === updated._id) {
        hydrateRecord(updated);
      }
      setScanInput("");
      toast.success(`Exit time recorded for ${updated.fullName || updated.passId}.`);
    } catch (scanError) {
      toast.error(scanError instanceof Error ? scanError.message : "Failed to scan pass");
    } finally {
      setScanLoading(false);
    }
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const lines = [
      ["Pass ID", form.passId],
      ["Full Name", form.fullName],
      ["Mobile Number", mask(form.mobile)],
      ["Email ID", form.email],
      ["Visit Date", form.visitDate],
      ["Entry Time", form.entryTime],
      ["Exit Time", form.exitTime],
      ["Visit Type", form.visitType],
      ["Purpose", form.purpose],
      ["Person to Meet", form.personToMeetType === "Student" ? form.studentName : form.personToMeet],
      ["Department", form.department],
      ["Status", form.passStatus],
    ];

    if (school?.schoolInfo?.logo?.startsWith("data:image")) {
      try {
        doc.addImage(school.schoolInfo.logo, "PNG", 38, 28, 52, 52);
      } catch (error) {
        console.warn("Unable to add school logo to visitor pass PDF", error);
      }
    }
    doc.setFillColor(12, 74, 110);
    doc.roundedRect(100, 28, 459, 54, 16, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(school?.schoolInfo?.name || "School Visitor Pass", 116, 56);
    doc.setFontSize(10);
    doc.text(printable(school?.schoolInfo?.phone || school?.schoolInfo?.email || ""), 116, 72);
    if (qrCodeUrl) doc.addImage(qrCodeUrl, "PNG", 398, 108, 110, 110);
    if (barcodeUrl) doc.addImage(barcodeUrl, "PNG", 48, 490, 220, 52);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    let y = 126;
    lines.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 48, y);
      doc.setFont("helvetica", "normal");
      doc.text(printable(value), 188, y);
      y += 22;
    });
    doc.save(`${form.passId || "visitor-pass"}.pdf`);
  };

  const printPass = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const schoolLogo = school?.schoolInfo?.logo?.startsWith("data:image")
      ? `<img src="${school.schoolInfo.logo}" alt="School Logo" style="width:58px;height:58px;border-radius:16px;object-fit:cover;" />`
      : "";
    const qrBlock = qrCodeUrl
      ? `<img src="${qrCodeUrl}" alt="QR Code" style="width:138px;height:138px;border:1px solid #dbe4ea;border-radius:16px;padding:8px;background:#fff;" />`
      : "";
    const barcodeBlock = barcodeUrl
      ? `<img src="${barcodeUrl}" alt="Barcode" style="width:220px;height:56px;object-fit:contain;background:#fff;" />`
      : "";
    win.document.write(`<!DOCTYPE html><html><head><title>Visitor Pass</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f8fafc;color:#0f172a}.sheet{max-width:920px;margin:0 auto}.card{background:#fff;border:1px solid #dbe4ea;border-radius:24px;padding:24px}.hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:18px;margin-bottom:18px}.school{display:flex;gap:14px;align-items:center}.meta{font-size:13px;color:#475569;margin-top:6px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.field{margin-bottom:12px}.field b{display:block;font-size:12px;color:#64748b;margin-bottom:4px}.foot{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-top:18px;padding-top:18px;border-top:1px solid #e2e8f0}</style></head><body><div class="sheet"><div class="card"><div class="hero"><div class="school">${schoolLogo}<div><h2 style="margin:0">${printable(school?.schoolInfo?.name || "School Visitor Pass")}</h2><div class="meta">${printable(school?.schoolInfo?.phone || "")} ${school?.schoolInfo?.email ? `| ${school.schoolInfo.email}` : ""}<br/>${printable(school?.schoolInfo?.address || "")}</div></div></div><div>${qrBlock}</div></div><div class="grid"><div><div class="field"><b>Pass ID</b>${printable(form.passId)}</div><div class="field"><b>Full Name</b>${printable(form.fullName)}</div><div class="field"><b>Mobile Number</b>${mask(form.mobile)}</div><div class="field"><b>Email ID</b>${printable(form.email)}</div><div class="field"><b>ID Type</b>${printable(form.idType)}</div><div class="field"><b>ID Number</b>${mask(form.idNumber)}</div><div class="field"><b>Generated Time</b>${printable(form.entryTime)}</div></div><div><div class="field"><b>Visit Date</b>${printable(form.visitDate)}</div><div class="field"><b>Visit Type</b>${printable(form.visitType)}</div><div class="field"><b>Purpose</b>${printable(form.purpose)}</div><div class="field"><b>Person to Meet</b>${printable(form.personToMeetType === "Student" ? form.studentName : form.personToMeet)}</div><div class="field"><b>Department</b>${printable(form.department)}</div><div class="field"><b>Status</b>${printable(form.passStatus)}</div><div class="field"><b>Exit Time</b>${printable(form.exitTime)}</div></div></div><div class="foot"><div>${barcodeBlock}<div style="font-size:12px;color:#64748b;margin-top:6px;">Scan this pass to record exit time automatically.</div></div><div style="font-size:12px;color:#64748b;">Pass generated on ${printable(form.regDate)} at ${printable(form.entryTime)}</div></div></div></div></div><script>window.onload=function(){window.print();};</script></body></html>`);
    win.document.close();
  };

  const fieldClass =
    "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  const renderInput = (
    label: string,
    name: keyof VisitorForm,
    options?: string[],
    textarea?: boolean,
    maskedValue?: string,
  ) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">{label}</p>
      {editing ? (
        options ? (
          <select value={form[name]} onChange={(event) => updateField(name, event.target.value)} className={fieldClass}>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : textarea ? (
          <textarea value={form[name]} onChange={(event) => updateField(name, event.target.value)} className={`${fieldClass} min-h-[110px] resize-none`} />
        ) : (
          <input value={form[name]} onChange={(event) => updateField(name, event.target.value)} className={fieldClass} />
        )
      ) : (
        <div className="min-h-12 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">
          {maskedValue || form[name] || "-"}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading visitor records...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      <section className="rounded-[30px] border border-border bg-card p-6 shadow-sm">
        <button type="button" onClick={() => setMakePassCollapsed((current) => !current)} className="flex w-full items-center justify-between gap-4 text-left">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Make pass
            </div>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">Visitor Pass Generator</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Create or update a visitor pass, generate an automatic pass ID, and print it with school branding, QR code, and barcode.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3 text-muted-foreground">{makePassCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}</div>
        </button>
        {!makePassCollapsed ? (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-2 text-xs font-semibold ${statusClasses[form.passStatus]}`}>{form.passStatus}</span>
              <button type="button" onClick={startNewPass} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"><Plus className="h-4 w-4" />New Pass</button>
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"><PencilLine className="h-4 w-4" />Edit</button>
              <button type="button" onClick={saveRecord} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-70">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
              <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"><Download className="h-4 w-4" />Download PDF</button>
              <button type="button" onClick={printPass} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"><Printer className="h-4 w-4" />Print</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Saved Passes</p>
                <select value={selectedId} onChange={(event) => selectRecord(event.target.value)} className={fieldClass}>
                  <option value="">Select visitor pass</option>
                  {records.map((record) => (
                    <option key={record._id} value={record._id}>
                      {record.passId} - {record.fullName || "Unnamed Visitor"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Auto Pass ID</p>
                <div className="min-h-12 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm font-semibold text-foreground">{form.passId || "Will generate when saved"}</div>
              </div>
              {renderInput("Request Mode", "requestMode", requestModes)}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Pass Status</p>
                {editing ? (
                  <select value={form.passStatus} onChange={(event) => updateField("passStatus", event.target.value)} className={fieldClass}>
                    {Object.keys(statusClasses).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="min-h-12 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[form.passStatus]}`}>{form.passStatus}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {renderInput("Full Name", "fullName")}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Photo</p>
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-4">
                    {form.photo ? <img src={form.photo} alt={form.fullName || "Visitor"} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xs font-semibold text-primary">No Photo</div>}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"><Upload className="h-4 w-4" />Upload Photo<input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label>
                  </div>
                </div>
              </div>
              {renderInput("Mobile Number", "mobile", undefined, false, editing ? undefined : mask(form.mobile))}
              {renderInput("Email ID", "email")}
              <div className="md:col-span-2">{renderInput("Address", "address", undefined, true)}</div>
              {renderInput("ID Type", "idType", idTypes)}
              {renderInput("ID Number", "idNumber", undefined, false, editing ? undefined : mask(form.idNumber))}
              <div className="space-y-2 md:col-span-2">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">ID Proof Upload</p>
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{form.idProofFileName || "No ID proof uploaded"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Accepted formats: image or PDF</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"><Upload className="h-4 w-4" />Upload ID Proof<input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleIdProofUpload} /></label>
                  </div>
                </div>
              </div>
              {renderInput("Visit Date", "visitDate")}
              {renderInput("Entry Time", "entryTime")}
              {renderInput("Exit Time", "exitTime")}
              {renderInput("Visit Type", "visitType", visitTypes)}
              <div className="md:col-span-2">{renderInput("Purpose of Visit", "purpose", undefined, true)}</div>
              {renderInput("Person to Meet Type", "personToMeetType", meetTypes)}
              {renderInput("Department", "department", departments)}
              {form.personToMeetType === "Student" ? (
                <>
                  {renderInput("Student Class", "studentClass", studentClassOptions)}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Student Name</p>
                    {editing ? (
                      <select value={form.studentName} onChange={(event) => updateField("studentName", event.target.value)} className={fieldClass}>
                        <option value="">Select student</option>
                        {studentNameOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="min-h-12 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">{form.studentName || "-"}</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Person Name</p>
                  {editing ? (
                    <select value={form.personToMeet} onChange={(event) => updateField("personToMeet", event.target.value)} className={fieldClass}>
                      <option value="">Select person</option>
                      {personOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="min-h-12 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">{form.personToMeet || "-"}</div>
                  )}
                </div>
              )}
            </div>
            {form.passId ? (
              <div className="grid gap-4 rounded-3xl border border-border bg-muted/20 p-5 lg:grid-cols-[1fr,220px,260px]">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Generated Pass Preview</h3>
                  <p className="mt-1 text-sm text-muted-foreground">This pass carries the school logo, school details, auto pass ID, current generated time, QR code, and barcode.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">School</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{school?.schoolInfo?.name || "School"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{school?.schoolInfo?.phone || school?.schoolInfo?.email || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3">
                      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">Generated Time</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{form.entryTime || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Pass ID: {form.passId}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-2xl border border-border bg-background p-4">
                  {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="h-40 w-40" /> : <QrCode className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background p-4">
                  {barcodeUrl ? <img src={barcodeUrl} alt="Barcode" className="w-full max-w-[220px]" /> : null}
                  <p className="mt-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground">{form.passId}</p>
                </div>
              </div>
            ) : null}
            {selectedRecord?.updatedAt ? <p className="text-xs text-muted-foreground">Last synced from backend: {new Date(selectedRecord.updatedAt).toLocaleString()}</p> : null}
          </div>
        ) : null}
      </section>
      <section className="rounded-[30px] border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Scan Pass</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scan or enter the pass ID here. Once submitted, the current exit time will be recorded automatically in the backend.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr,180px]">
          <input value={scanInput} onChange={(event) => setScanInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void scanPassExit(); } }} placeholder="Scan barcode / QR code or enter pass ID" className={fieldClass} />
          <button type="button" onClick={scanPassExit} disabled={scanLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-70">
            {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Record Exit
          </button>
        </div>
      </section>
    </div>
  );
}
