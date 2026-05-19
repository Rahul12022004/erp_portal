import { useCallback, useEffect, useMemo, useState } from "react";
import { readStoredSchoolSession } from "@/lib/auth";
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronRight,
  Clock, FileText, Globe, GraduationCap, Link2, Paperclip,
  Plus, Send, Star, Trash2, Users, X, BookMarked, LayoutGrid,
} from "lucide-react";
import type { ClassItem, Subject, Assignment, AssignmentSubmission, StudyMaterial } from "./api/types";
import * as classService from "./api/classService";
import * as subjectService from "./api/subjectService";
import * as assignmentService from "./api/assignmentService";
import * as materialService from "./api/materialService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<Assignment["status"], string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT:     "bg-slate-100 text-slate-600",
  CLOSED:    "bg-red-100 text-red-600",
};

const MATERIAL_ICON: Record<StudyMaterial["type"], string> = {
  FILE: "📎", LINK: "🔗", VIDEO: "🎬", DOCUMENT: "📄", OTHER: "📦",
};

function fmt(date: string | null) {
  if (!date) return "No due date";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isPast(date: string | null) {
  return !!date && new Date(date) < new Date();
}

function getTeacherId(): string {
  try { return JSON.parse(localStorage.getItem("teacher") ?? "null")?._id ?? ""; } catch { return ""; }
}

// ─── Class Grid (landing) ─────────────────────────────────────────────────────

function ClassGrid({ classes, onSelect }: { classes: ClassItem[]; onSelect: (c: ClassItem) => void }) {
  if (!classes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
        <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">No classes found. Create classes in the Classes module first.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((cls) => (
        <button
          key={cls._id}
          onClick={() => onSelect(cls)}
          className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl text-white font-bold shadow-sm">
              {(cls.name ?? "C")[0]}
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="font-bold text-slate-900">
              {cls.name}{cls.section ? ` — ${cls.section}` : ""}
            </p>
            {cls.stream && <p className="text-xs text-slate-500">{cls.stream}</p>}
            {cls.academicYear && <p className="text-xs text-slate-400">{cls.academicYear}</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {cls.studentCount ?? 0} students
              </span>
              {cls.classTeacher && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> {cls.classTeacher.name}
                </span>
              )}
            </div>
            {cls.classCode && (
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-indigo-600">
                {cls.classCode}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Subjects Tab ─────────────────────────────────────────────────────────────

function SubjectsTab({ classId, schoolId }: { classId: string; schoolId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setSubjects(await subjectService.getSubjects(schoolId, classId)); } catch { /* ignore */ }
    setLoading(false);
  }, [classId, schoolId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name.trim()) { setError("Name required"); return; }
    setSaving(true); setError("");
    try {
      await subjectService.createSubject({ schoolId, classId, ...form });
      setForm({ name: "", code: "", description: "" });
      setShowForm(false);
      load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    await subjectService.deleteSubject(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Subject
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject Name *</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                placeholder="e.g. Mathematics" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Code</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                placeholder="e.g. MATH10" value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
          </div>
          <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-2">{[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100" />)}</div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          No subjects yet. Add subjects for this class.
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((s) => (
            <div key={s._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600">
                  {s.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">
                    {s.code && <span className="mr-2">{s.code}</span>}
                    {s.teacherId && <span>{(s.teacherId as { name: string }).name}</span>}
                  </p>
                </div>
              </div>
              <button onClick={() => del(s._id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

interface GradeState { sub: AssignmentSubmission; points: string; comment: string }

function AssignmentsTab({ classId, schoolId, className }: { classId: string; schoolId: string; className: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [pending, setPending] = useState<{ student: { _id: string; name: string; rollNumber: string }; status: string }[]>([]);
  const [subTab, setSubTab] = useState<"instructions" | "submissions">("instructions");
  const [grading, setGrading] = useState<GradeState | null>(null);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeError, setGradeError] = useState("");
  const [form, setForm] = useState({ subject: "", title: "", instructions: "", dueDate: "", totalPoints: 100, status: "PUBLISHED" as "PUBLISHED" | "DRAFT" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const teacherId = getTeacherId();

  const load = useCallback(async () => {
    setLoading(true);
    try { setAssignments(await assignmentService.getAssignments(schoolId, classId)); } catch { /* ignore */ }
    setLoading(false);
  }, [classId, schoolId]);

  useEffect(() => { load(); }, [load]);

  const loadSubmissions = useCallback(async (aId: string) => {
    const data = await assignmentService.getSubmissions(aId);
    setSubmissions(data.submissions); setPending(data.pending);
  }, []);

  useEffect(() => { if (selected && subTab === "submissions") loadSubmissions(selected._id); }, [selected, subTab, loadSubmissions]);

  const create = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    setSaving(true); setError("");
    try {
      await assignmentService.createAssignment({ schoolId, classId, className, ...form, teacherId });
      setForm({ subject: "", title: "", instructions: "", dueDate: "", totalPoints: 100, status: "PUBLISHED" });
      setView("list"); load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    await assignmentService.deleteAssignment(id);
    setView("list"); setSelected(null); load();
  };

  const grade = async () => {
    if (!grading || !selected) return;
    const pts = Number(grading.points);
    if (isNaN(pts) || pts < 0) { setGradeError("Invalid points"); return; }
    setGradeSaving(true); setGradeError("");
    try {
      await assignmentService.gradeSubmission(selected._id, grading.sub._id, { gradePoints: pts, gradeComment: grading.comment, gradedBy: teacherId });
      setGrading(null); loadSubmissions(selected._id);
    } catch (err) { setGradeError(err instanceof Error ? err.message : "Failed"); }
    setGradeSaving(false);
  };

  // LIST
  if (view === "list") return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setView("create")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">{[0,1,2].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          No assignments. Click "Create" to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a._id} onClick={() => { setSelected(a); setSubTab("instructions"); setView("detail"); }}
              className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{a.title}</p>
                    {a.subject && <p className="text-xs text-slate-500">{a.subject}</p>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLOR[a.status]}`}>{a.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className={`flex items-center gap-1 ${isPast(a.dueDate) && a.status !== "CLOSED" ? "text-red-500 font-medium" : ""}`}>
                  <Clock className="h-3.5 w-3.5" /> {fmt(a.dueDate)}
                </span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" /> {a.totalPoints} pts</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {a.submissionsTotal} submitted</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // CREATE
  if (view === "create") return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setView("list")} className="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft className="h-5 w-5 text-slate-500" /></button>
        <h3 className="font-bold text-slate-900">New Assignment</h3>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              placeholder="Assignment title" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</label>
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              placeholder="e.g. Mathematics" value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Instructions</label>
          <textarea rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            placeholder="What students need to do..." value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
            <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points</label>
            <input type="number" min={1} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={form.totalPoints} onChange={(e) => setForm((f) => ({ ...f, totalPoints: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <div className="relative">
              <select className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "PUBLISHED" | "DRAFT" }))}>
                <option value="PUBLISHED">Publish</option>
                <option value="DRAFT">Draft</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setView("list")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={create} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            <Send className="h-4 w-4" /> {saving ? "Creating..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );

  // DETAIL
  if (view === "detail" && selected) return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => { setView("list"); setSelected(null); }} className="rounded-lg p-1.5 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <p className="font-bold text-slate-900">{selected.title}</p>
            {selected.subject && <p className="text-xs text-slate-500">{selected.subject}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[selected.status]}`}>{selected.status}</span>
          <button onClick={() => del(selected._id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        <span className={`flex items-center gap-1 ${isPast(selected.dueDate) ? "text-red-600 font-medium" : ""}`}>
          <Clock className="h-3.5 w-3.5" /> Due: {fmt(selected.dueDate)}
        </span>
        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" /> {selected.totalPoints} pts</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {selected.submissionsTotal} submitted · {selected.submissionsGraded} graded</span>
      </div>

      <div className="flex border-b border-slate-200">
        {(["instructions", "submissions"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${subTab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {subTab === "instructions" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selected.instructions
            ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.instructions}</p>
            : <p className="text-sm italic text-slate-400">No instructions provided.</p>}
        </div>
      )}

      {subTab === "submissions" && (
        <div className="space-y-2">
          {submissions.map((sub) => (
            <div key={sub._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">{sub.studentId.name?.[0]}</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{sub.studentId.name}</p>
                  <p className="text-xs text-slate-400">Roll: {sub.studentId.rollNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sub.status === "GRADED" && <span className="text-sm font-semibold text-green-700">{sub.gradePoints}/{selected.totalPoints}</span>}
                <button onClick={() => setGrading({ sub, points: String(sub.gradePoints ?? ""), comment: sub.gradeComment ?? "" })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  {sub.status === "GRADED" ? "Re-grade" : "Grade"}
                </button>
              </div>
            </div>
          ))}
          {pending.map(({ student }) => (
            <div key={student._id} className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">{student.name?.[0]}</div>
                <p className="text-sm text-slate-600">{student.name}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">Not submitted</span>
            </div>
          ))}
          {submissions.length === 0 && pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No submissions yet.</div>
          )}
        </div>
      )}

      {/* Grade modal */}
      {grading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Grade — {grading.sub.studentId.name}</h3>
              <button onClick={() => setGrading(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            {grading.sub.content && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 max-h-28 overflow-y-auto">{grading.sub.content}</div>
            )}
            {gradeError && <p className="text-xs text-red-600">{gradeError}</p>}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points (max {selected.totalPoints})</label>
              <input type="number" min={0} max={selected.totalPoints}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                value={grading.points} onChange={(e) => setGrading((g) => g ? { ...g, points: e.target.value } : g)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</label>
              <textarea rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                value={grading.comment} onChange={(e) => setGrading((g) => g ? { ...g, comment: e.target.value } : g)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGrading(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={grade} disabled={gradeSaving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" /> {gradeSaving ? "Saving..." : "Save Grade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}

// ─── Materials Tab ────────────────────────────────────────────────────────────

function MaterialsTab({ classId, schoolId }: { classId: string; schoolId: string }) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "LINK" as StudyMaterial["type"], url: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const teacherId = getTeacherId();

  const load = useCallback(async () => {
    setLoading(true);
    try { setMaterials(await materialService.getMaterials(schoolId, classId)); } catch { /* ignore */ }
    setLoading(false);
  }, [classId, schoolId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    setSaving(true); setError("");
    try {
      await materialService.createMaterial({ schoolId, classId, teacherId, ...form });
      setForm({ title: "", description: "", type: "LINK", url: "" });
      setShowForm(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this material?")) return;
    await materialService.deleteMaterial(id); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{materials.length} material{materials.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Material
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                placeholder="Material title" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
              <div className="relative">
                <select className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as StudyMaterial["type"] }))}>
                  {(["LINK", "VIDEO", "DOCUMENT", "FILE", "OTHER"] as const).map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
          <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            placeholder="URL (optional)" value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-2">{[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100" />)}</div>
      ) : materials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No materials yet.</div>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div key={m._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-xl">{MATERIAL_ICON[m.type]}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                  <p className="text-xs text-slate-400">
                    {m.type}
                    {(m.subjectId as { name: string } | null)?.name ? ` · ${(m.subjectId as { name: string }).name}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={(e) => e.stopPropagation()}>
                    Open
                  </a>
                )}
                <button onClick={() => del(m._id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ cls, onUpdate: _onUpdate }: { cls: ClassItem; onUpdate: (updated: ClassItem) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Students", value: cls.studentCount ?? 0, icon: <Users className="h-4 w-4" />, color: "text-blue-500" },
          { label: "Teachers", value: (cls.assignedTeachers?.length ?? 0) + (cls.classTeacher ? 1 : 0), icon: <GraduationCap className="h-4 w-4" />, color: "text-indigo-500" },
          { label: "Academic Year", value: cls.academicYear ?? "—", icon: <BookOpen className="h-4 w-4" />, color: "text-green-500" },
          { label: "Stream", value: cls.stream ?? "General", icon: <BookMarked className="h-4 w-4" />, color: "text-amber-500" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${color}`}>{icon} {label}</div>
            <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>


      {cls.classTeacher && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Class Teacher</p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
              {cls.classTeacher.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{cls.classTeacher.name}</p>
              <p className="text-xs text-slate-400">{cls.classTeacher.position}</p>
            </div>
          </div>
        </div>
      )}

      {cls.meetLink && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Meet Link</p>
          <a href={cls.meetLink} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
            <Globe className="h-4 w-4" /> {cls.meetLink}
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Class Workspace ──────────────────────────────────────────────────────────

type WorkspaceTab = "overview" | "subjects" | "assignments" | "materials";

const WORKSPACE_TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "overview",     label: "Overview" },
  { key: "subjects",     label: "Subjects" },
  { key: "assignments",  label: "Assignments" },
  { key: "materials",    label: "Materials" },
];

function ClassWorkspace({ cls: initialCls, schoolId, onBack }: { cls: ClassItem; schoolId: string; onBack: () => void }) {
  const [cls, setCls] = useState(initialCls);
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [codeCopied, setCodeCopied] = useState(false);
  const label = `${cls.name}${cls.section ? ` — ${cls.section}` : ""}`;

  const copyCode = () => {
    if (!cls.classCode) return;
    navigator.clipboard.writeText(cls.classCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
          {cls.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">{label}</h2>
            {cls.classCode && (
              <button
                onClick={copyCode}
                title="Click to copy class code"
                className={`rounded-lg border px-2.5 py-0.5 font-mono text-sm font-bold tracking-widest transition-colors ${
                  codeCopied
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                }`}
              >
                {codeCopied ? "Copied!" : cls.classCode}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {cls.stream ?? "General"}{cls.academicYear ? ` · ${cls.academicYear}` : ""}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200">
        {WORKSPACE_TABS.map(({ key, label: lbl }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview"    && <OverviewTab cls={cls} onUpdate={setCls} />}
      {tab === "subjects"    && <SubjectsTab classId={cls._id} schoolId={schoolId} />}
      {tab === "assignments" && <AssignmentsTab classId={cls._id} schoolId={schoolId} className={cls.name + (cls.section ? ` - ${cls.section}` : "")} />}
      {tab === "materials"   && <MaterialsTab classId={cls._id} schoolId={schoolId} />}
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────

export default function AcademicsModule() {
  const school = readStoredSchoolSession();
  const schoolId = school?._id ?? "";

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  const currentAcademicYear = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 4 ? `${y}–${(y + 1).toString().slice(2)}` : `${y - 1}–${y.toString().slice(2)}`;
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    classService.getClasses(schoolId)
      .then(setClasses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolId]);

  return (
    <div className="p-6 space-y-6">
      {!selectedClass && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Academics</h2>
                <p className="text-xs text-slate-500">Classes · Subjects · Assignments · Materials</p>
              </div>
            </div>
            <span className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              AY {currentAcademicYear}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Classes", value: classes.length, icon: <GraduationCap className="h-4 w-4" />, color: "text-blue-500" },
              { label: "Total Students", value: classes.reduce((s, c) => s + (c.studentCount ?? 0), 0), icon: <Users className="h-4 w-4" />, color: "text-green-500" },
              { label: "Teachers", value: new Set(classes.flatMap((c) => [c.classTeacher?._id, ...(c.assignedTeachers?.map((t) => t._id) ?? [])].filter(Boolean))).size, icon: <BookOpen className="h-4 w-4" />, color: "text-indigo-500" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${color}`}>{icon} {label}</div>
                <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Class grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[0,1,2,3,4,5].map((i) => <div key={i} className="h-36 rounded-2xl bg-slate-100" />)}
            </div>
          ) : (
            <ClassGrid classes={classes} onSelect={setSelectedClass} />
          )}
        </>
      )}

      {selectedClass && (
        <ClassWorkspace
          cls={selectedClass}
          schoolId={schoolId}
          onBack={() => setSelectedClass(null)}
        />
      )}
    </div>
  );
}
