import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Edit, ImagePlus, RefreshCw, Trash2, X } from "lucide-react";
import { API_URL } from "@/lib/api";
import { readStoredSchoolSession } from "@/lib/auth";

type StudentListItem = {
  _id: string;
  admissionNumber?: string;
  name: string;
  email: string;
  class: string;
  classSection?: string;
  academicYear?: string;
  rollNumber: string;
  phone?: string;
  gender?: string;
  photo?: string;
};

type StudentRecord = StudentListItem & {
  formNumber?: string;
  aadharNumber?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  state?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  pinCode?: string;
  motherTongue?: string;
  bloodGroup?: string;
  address?: string;
  identificationMarks?: string;
  previousAcademicRecord?: string;
  achievements?: string;
  generalBehaviour?: string;
  medicalHistory?: string;
  languagePreferences?: string[] | string;
};

const asText = (value: unknown): string => String(value ?? "").trim();

const toStudentListItem = (student: Partial<StudentRecord>): StudentListItem => ({
  _id: asText(student._id),
  admissionNumber: asText(student.admissionNumber) || undefined,
  name: asText(student.name) || "Student",
  email: asText(student.email),
  class: asText(student.class),
  classSection: asText(student.classSection) || undefined,
  academicYear: asText(student.academicYear) || undefined,
  rollNumber: asText(student.rollNumber),
  phone: asText(student.phone) || undefined,
  gender: asText(student.gender) || undefined,
  photo: asText(student.photo) || undefined,
});

type SchoolClass = {
  _id: string;
  name: string;
};

const toSchoolClass = (schoolClass: Partial<SchoolClass>): SchoolClass => ({
  _id: asText(schoolClass._id),
  name: asText(schoolClass.name),
});

type PaymentStatus = "pending" | "partial" | "paid" | "overdue";

type FeeComponent = {
  label: string;
  amount: number;
};

type PaymentReceipt = {
  receiptNumber: string;
  transactionId: string;
  paymentDate: string;
  amountPaid: number;
  paymentType?: "upi" | "card" | "cash" | "cheque";
};

type StudentFeeSummary = {
  financeId?: string | null;
  totalFee: number;
  totalAssignedAmount?: number;
  paidAmount: number;
  totalPaidAmount?: number;
  remainingAmount: number;
  pendingBalance?: number;
  currentDueAmount?: number;
  olderPendingAmount?: number;
  status: PaymentStatus;
  paymentStatus?: PaymentStatus;
  dueDate?: string | null;
  effectiveDueDate?: string | null;
  academicYear?: string | null;
  feeComponents?: FeeComponent[];
  latestReceipt?: PaymentReceipt | null;
  paymentHistory?: PaymentReceipt[];
  isOverdue?: boolean;
  extensionGranted?: boolean;
  extensionGrantedAt?: string | null;
  extensionExpiresAt?: string | null;
  extensionGrantedBy?: string | null;
  extensionReason?: string | null;
  extensionEligible?: boolean;
};

type StudentForm = {
  formNumber: string;
  admissionNumber: string;
  name: string;
  email: string;
  class: string;
  classSection: string;
  academicYear: string;
  rollNumber: string;
  phone: string;
  aadharNumber: string;
  gender: string;
  dateOfBirth: string;
  placeOfBirth: string;
  state: string;
  nationality: string;
  religion: string;
  caste: string;
  pinCode: string;
  motherTongue: string;
  bloodGroup: string;
  photo: string;
  address: string;
  identificationMarks: string;
  previousAcademicRecord: string;
  achievements: string;
  generalBehaviour: string;
  medicalHistory: string;
  languagePreferences: string;
};

const emptyForm: StudentForm = {
  formNumber: "",
  admissionNumber: "",
  name: "",
  email: "",
  class: "",
  classSection: "",
  academicYear: "",
  rollNumber: "",
  phone: "",
  aadharNumber: "",
  gender: "",
  dateOfBirth: "",
  placeOfBirth: "",
  state: "",
  nationality: "",
  religion: "",
  caste: "",
  pinCode: "",
  motherTongue: "",
  bloodGroup: "",
  photo: "",
  address: "",
  identificationMarks: "",
  previousAcademicRecord: "",
  achievements: "",
  generalBehaviour: "",
  medicalHistory: "",
  languagePreferences: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const getDisplayDueDate = (summary: StudentFeeSummary | null) =>
  summary?.effectiveDueDate || summary?.dueDate || null;

const getStatusBadgeClass = (status?: string) => {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "partial") return "bg-amber-100 text-amber-700";
  if (status === "overdue") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
};

const resizeImage = (file: File, maxPx: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = (event) => {
      const image = new Image();
      image.onerror = () => reject(new Error("Invalid image"));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxPx / image.width, maxPx / image.height, 1);
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas unsupported"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const toForm = (student: Partial<StudentRecord>): StudentForm => ({
  formNumber: student.formNumber || "",
  admissionNumber: student.admissionNumber || "",
  name: student.name || "",
  email: student.email || "",
  class: student.class || "",
  classSection: student.classSection || "",
  academicYear: student.academicYear || "",
  rollNumber: student.rollNumber || "",
  phone: student.phone || "",
  aadharNumber: student.aadharNumber || "",
  gender: student.gender || "",
  dateOfBirth: student.dateOfBirth || "",
  placeOfBirth: student.placeOfBirth || "",
  state: student.state || "",
  nationality: student.nationality || "",
  religion: student.religion || "",
  caste: student.caste || "",
  pinCode: student.pinCode || "",
  motherTongue: student.motherTongue || "",
  bloodGroup: student.bloodGroup || "",
  photo: student.photo || "",
  address: student.address || "",
  identificationMarks: student.identificationMarks || "",
  previousAcademicRecord: student.previousAcademicRecord || "",
  achievements: student.achievements || "",
  generalBehaviour: student.generalBehaviour || "",
  medicalHistory: student.medicalHistory || "",
  languagePreferences: Array.isArray(student.languagePreferences)
    ? student.languagePreferences.join(", ")
    : student.languagePreferences || "",
});

export default function StudentModule() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [photoPreview, setPhotoPreview] = useState("");
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [feeSummaryError, setFeeSummaryError] = useState("");
  const [grantingExtension, setGrantingExtension] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const school = readStoredSchoolSession();
      if (!school?._id) {
        throw new Error("School not found. Please log in again.");
      }
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`${API_URL}/api/students/${school._id}`),
        fetch(`${API_URL}/api/classes/${school._id}`),
      ]);
      if (!studentsRes.ok) throw new Error(`Failed to load students (${studentsRes.status})`);
      if (!classesRes.ok) throw new Error(`Failed to load classes (${classesRes.status})`);
      const studentData = await studentsRes.json().catch(() => []);
      const classData = await classesRes.json().catch(() => []);

      setStudents(
        Array.isArray(studentData)
          ? studentData.map((student) => toStudentListItem((student ?? {}) as Partial<StudentRecord>))
          : []
      );
      setClasses(
        Array.isArray(classData)
          ? classData.map((schoolClass) => toSchoolClass((schoolClass ?? {}) as Partial<SchoolClass>)).filter((schoolClass) => schoolClass._id && schoolClass.name)
          : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch student data");
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();
    return students.filter((student) =>
      !query ||
      asText(student.name).toLowerCase().includes(query) ||
      asText(student.email).toLowerCase().includes(query) ||
      asText(student.rollNumber).toLowerCase().includes(query) ||
      asText(student.admissionNumber).toLowerCase().includes(query)
    );
  }, [students, search]);

  const fetchStudentFeeSummary = async (schoolId: string, studentId: string) => {
    const response = await fetch(`${API_URL}/api/finance/${schoolId}/students/${studentId}/summary`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Failed to load student fee summary");
    }
    return data as StudentFeeSummary;
  };

  const openEditor = async (studentId: string) => {
    try {
      setEditorOpen(true);
      setEditorLoading(true);
      setEditorError("");
      setFeeSummary(null);
      setFeeSummaryError("");
      setEditingId(studentId);
      const school = readStoredSchoolSession();
      if (!school?._id) {
        throw new Error("School not found. Please log in again.");
      }

      const [studentResponse, summary] = await Promise.all([
        fetch(`${API_URL}/api/students/${studentId}`),
        fetchStudentFeeSummary(school._id, studentId).catch((error) => {
          setFeeSummaryError(error instanceof Error ? error.message : "Failed to load fee summary");
          return null;
        }),
      ]);

      if (!studentResponse.ok) throw new Error(`Failed to load student (${studentResponse.status})`);
      const student = await studentResponse.json();
      const nextForm = toForm(student);
      setForm(nextForm);
      setPhotoPreview(nextForm.photo);
      setFeeSummary(summary);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Failed to load student");
    } finally {
      setEditorLoading(false);
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorLoading(false);
    setEditorSaving(false);
    setEditorError("");
    setEditingId("");
    setForm(emptyForm);
    setPhotoPreview("");
    setFeeSummary(null);
    setFeeSummaryError("");
    setGrantingExtension(false);
  };

  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    try {
      setEditorSaving(true);
      setEditorError("");
      const response = await fetch(`${API_URL}/api/students/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          languagePreferences: form.languagePreferences.split(",").map((value) => value.trim()).filter(Boolean),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Failed to update student");
      await fetchStudents();
      closeEditor();
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setEditorSaving(false);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const response = await fetch(`${API_URL}/api/students/${studentId}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Failed to delete student");
      await fetchStudents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete student");
    }
  };

  const handlePhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const image = await resizeImage(file, 320);
      setPhotoPreview(image);
      setForm((current) => ({ ...current, photo: image }));
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      event.target.value = "";
    }
  };

  const grantFeeExtension = async () => {
    if (!editingId) return;

    const school = readStoredSchoolSession();
    if (!school?._id) {
      setFeeSummaryError("School not found. Please log in again.");
      return;
    }

    try {
      setGrantingExtension(true);
      setFeeSummaryError("");
      const response = await fetch(`${API_URL}/api/finance/${school._id}/students/${editingId}/extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to grant fee extension");
      }
      setFeeSummary((data?.data || null) as StudentFeeSummary | null);
    } catch (err) {
      setFeeSummaryError(err instanceof Error ? err.message : "Failed to grant fee extension");
    } finally {
      setGrantingExtension(false);
    }
  };

  const textAreaFields = [
    ["address", "Residential Address"],
    ["identificationMarks", "Identification Marks"],
    ["previousAcademicRecord", "Previous Academic Record"],
    ["achievements", "Achievements"],
    ["generalBehaviour", "General Behaviour"],
    ["medicalHistory", "Medical History"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Management</h2>
          <p className="text-sm text-muted-foreground">Edit existing admission records fetched from the backend.</p>
        </div>
        <button type="button" onClick={() => void fetchStudents()} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          <RefreshCw className="h-4 w-4" />
          Refresh Records
        </button>
      </div>

      <input
        className="w-full rounded border p-2"
        placeholder="Search by name, admission number, roll number, or email"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <p className="text-center text-gray-500">Loading students...</p> : error ? <p className="text-center text-red-600">{error}</p> : (
        <div className="stat-card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3 text-left">Student</th>
                <th className="p-3 text-left">Admission No</th>
                <th className="p-3 text-left">Class</th>
                <th className="p-3 text-left">Roll No</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border bg-gray-100">
                        {student.photo ? <img src={student.photo} alt={student.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">{asText(student.name).slice(0, 2).toUpperCase() || "ST"}</div>}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.gender || "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{student.admissionNumber || "-"}</td>
                  <td className="p-3">{student.class}{student.classSection ? ` - ${student.classSection}` : ""}</td>
                  <td className="p-3">{student.rollNumber}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{student.phone || "-"}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => void openEditor(student._id)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void deleteStudent(student._id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold">Edit Student Admission</h3>
                <p className="text-sm text-muted-foreground">Auto-filled from backend data.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {editorLoading ? <p className="text-center text-gray-500">Loading admission record...</p> : (
                <form onSubmit={saveStudent} className="space-y-6">
                  {editorError && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editorError}</div>}
                  <div className="grid gap-6 xl:grid-cols-[260px_320px_1fr]">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <p className="mb-3 text-sm font-semibold">Student Photo</p>
                      <div className="mb-4 flex h-72 items-center justify-center overflow-hidden rounded-xl border bg-white">
                        {photoPreview ? <img src={photoPreview} alt={form.name || "Student"} className="h-full w-full object-cover" /> : <span className="text-sm text-muted-foreground">No photo available</span>}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        <ImagePlus className="h-4 w-4" />
                        Replace Photo
                        <input type="file" accept="image/*" onChange={(event) => void handlePhotoSelect(event)} className="hidden" />
                      </label>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Fee Summary</p>
                          <p className="mt-1 text-xs text-muted-foreground">Current fee, old pending balance, and one-time extension status.</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(feeSummary?.paymentStatus || feeSummary?.status)}`}>
                          {String(feeSummary?.paymentStatus || feeSummary?.status || "pending").toUpperCase()}
                        </span>
                      </div>

                      {feeSummaryError && (
                        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {feeSummaryError}
                        </div>
                      )}

                      {feeSummary ? (
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="rounded-xl border bg-white p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Current Fee Due</span>
                              <span className="font-semibold text-slate-900">{formatCurrency(feeSummary.currentDueAmount ?? feeSummary.pendingBalance ?? feeSummary.remainingAmount)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-slate-500">Past Fee Pending</span>
                              <span className="font-semibold text-rose-700">{formatCurrency(feeSummary.olderPendingAmount ?? 0)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-slate-500">Total Paid</span>
                              <span className="font-semibold text-emerald-700">{formatCurrency(feeSummary.totalPaidAmount ?? feeSummary.paidAmount)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-slate-500">Total Assigned</span>
                              <span className="font-semibold text-slate-900">{formatCurrency(feeSummary.totalAssignedAmount ?? feeSummary.totalFee)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-slate-500">Effective Due Date</span>
                              <span className="font-semibold text-slate-900">{formatDate(getDisplayDueDate(feeSummary))}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-slate-500">Original Due Date</span>
                              <span className="font-semibold text-slate-900">{formatDate(feeSummary.dueDate)}</span>
                            </div>
                          </div>

                          {feeSummary.feeComponents && feeSummary.feeComponents.length > 0 && (
                            <div className="rounded-xl border bg-white p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fee Components</p>
                              <div className="mt-3 space-y-2">
                                {feeSummary.feeComponents.map((component) => (
                                  <div key={`${component.label}-${component.amount}`} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">{component.label}</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(component.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {feeSummary.isOverdue ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                              This fee is overdue. If it has stayed pending for more than one month, you can grant one extra month from here.
                            </div>
                          ) : (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                              No overdue action is needed right now.
                            </div>
                          )}

                          {feeSummary.extensionGranted ? (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                              <p className="font-semibold">One-month extension granted</p>
                              <p className="mt-1">Valid until {formatDate(feeSummary.extensionExpiresAt)}.</p>
                              <p className="mt-1">Approved by {feeSummary.extensionGrantedBy || "School Admin"} on {formatDate(feeSummary.extensionGrantedAt)}.</p>
                            </div>
                          ) : feeSummary.extensionEligible ? (
                            <button
                              type="button"
                              onClick={() => void grantFeeExtension()}
                              disabled={grantingExtension}
                              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
                            >
                              {grantingExtension ? "Granting Extension..." : "Grant 1-Month Extension"}
                            </button>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                              Extension becomes available only when the unpaid fee stays pending for more than one month.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                          Fee summary is not available for this student yet.
                        </div>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Form Number"><input className="w-full rounded border p-2" value={form.formNumber} onChange={(event) => setForm({ ...form, formNumber: event.target.value })} /></Field>
                      <Field label="Admission Number"><input className="w-full rounded border p-2" value={form.admissionNumber} onChange={(event) => setForm({ ...form, admissionNumber: event.target.value })} /></Field>
                      <Field label="Full Name"><input className="w-full rounded border p-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
                      <Field label="Email"><input type="email" className="w-full rounded border p-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
                      <Field label="Class"><div className="space-y-2"><select className="w-full rounded border p-2" value={classes.some((schoolClass) => schoolClass.name === form.class) ? form.class : ""} onChange={(event) => setForm({ ...form, class: event.target.value })}><option value="">Select class</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass.name}>{schoolClass.name}</option>)}</select><input className="w-full rounded border p-2" value={form.class} onChange={(event) => setForm({ ...form, class: event.target.value })} required /></div></Field>
                      <Field label="Section"><input className="w-full rounded border p-2" value={form.classSection} onChange={(event) => setForm({ ...form, classSection: event.target.value })} /></Field>
                      <Field label="Academic Year"><input className="w-full rounded border p-2" value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} /></Field>
                      <Field label="Roll Number"><input className="w-full rounded border p-2" value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} required /></Field>
                      <Field label="Phone"><input className="w-full rounded border p-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
                      <Field label="Aadhar Number"><input className="w-full rounded border p-2" value={form.aadharNumber} onChange={(event) => setForm({ ...form, aadharNumber: event.target.value })} /></Field>
                      <Field label="Gender"><select className="w-full rounded border p-2" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></Field>
                      <Field label="Date of Birth"><input type="date" className="w-full rounded border p-2" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></Field>
                      <Field label="Place of Birth"><input className="w-full rounded border p-2" value={form.placeOfBirth} onChange={(event) => setForm({ ...form, placeOfBirth: event.target.value })} /></Field>
                      <Field label="State"><input className="w-full rounded border p-2" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></Field>
                      <Field label="Nationality"><input className="w-full rounded border p-2" value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} /></Field>
                      <Field label="Religion"><input className="w-full rounded border p-2" value={form.religion} onChange={(event) => setForm({ ...form, religion: event.target.value })} /></Field>
                      <Field label="Caste"><input className="w-full rounded border p-2" value={form.caste} onChange={(event) => setForm({ ...form, caste: event.target.value })} /></Field>
                      <Field label="Pin Code"><input className="w-full rounded border p-2" value={form.pinCode} onChange={(event) => setForm({ ...form, pinCode: event.target.value })} /></Field>
                      <Field label="Mother Tongue"><input className="w-full rounded border p-2" value={form.motherTongue} onChange={(event) => setForm({ ...form, motherTongue: event.target.value })} /></Field>
                      <Field label="Blood Group"><input className="w-full rounded border p-2" value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} /></Field>
                      <Field label="Language Preferences"><input className="w-full rounded border p-2" value={form.languagePreferences} onChange={(event) => setForm({ ...form, languagePreferences: event.target.value })} placeholder="English, Hindi" /></Field>
                      <div className="md:col-span-2">
                        {textAreaFields.map(([key, label]) => (
                          <Field key={key} label={label}>
                            <textarea className="w-full rounded border p-2" rows={2} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                          </Field>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button type="button" onClick={closeEditor} className="rounded border px-4 py-2 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={editorSaving} className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-70">{editorSaving ? "Saving..." : "Save Changes"}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
