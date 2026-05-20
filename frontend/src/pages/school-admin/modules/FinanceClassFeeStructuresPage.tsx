import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  X,
} from "lucide-react";
import {
  getClassFeeStructureList,
  getSchoolClasses,
  saveClassFeeStructure,
  updateClassFeeStructure,
} from "@/modules/finance/api/financeClient";
import type {
  ClassFeeStructureRecord,
  LateFeeType,
  SchoolClass,
} from "@/modules/finance/types";
import { getUniqueClasses } from "@/lib/classUtils";

// ─── helpers ────────────────────────────────────────────────────────────────

const getSchoolId = (): string => {
  const s = JSON.parse(localStorage.getItem("school") || "null") as {
    _id?: string;
  } | null;
  return s?._id ?? "";
};

const fmtShort = (v: number): string => {
  const n = Number(v || 0);
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
};

const pct = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

// ─── form types ─────────────────────────────────────────────────────────────

type FeeForm = {
  classId: string;
  academicYear: string;
  academicFee: string;
  transportFee: string;
  otherFee: string;
  dueDate: string;
  lateFeeType: LateFeeType;
  lateFeeAmount: string;
  lateFeeGraceDays: string;
  lateFeeDescription: string;
};

const EMPTY_FORM: FeeForm = {
  classId: "",
  academicYear: "",
  academicFee: "",
  transportFee: "0",
  otherFee: "0",
  dueDate: "",
  lateFeeType: "none",
  lateFeeAmount: "0",
  lateFeeGraceDays: "0",
  lateFeeDescription: "",
};

function formFromStructure(s: ClassFeeStructureRecord): FeeForm {
  return {
    classId: s.class_id,
    academicYear: s.academic_year,
    academicFee: String(s.academic_fee),
    transportFee: String(s.default_transport_fee),
    otherFee: String(s.other_fee),
    dueDate: s.due_date,
    lateFeeType: s.late_fee_type,
    lateFeeAmount: String(s.late_fee_amount),
    lateFeeGraceDays: String(s.late_fee_grace_days),
    lateFeeDescription: s.late_fee_description ?? "",
  };
}

// ─── input helper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400";

// ─── main page ───────────────────────────────────────────────────────────────

export default function FinanceClassFeeStructuresPage() {
  const schoolId = useMemo(() => getSchoolId(), []);
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FeeForm>(EMPTY_FORM);
  const [showLateFee, setShowLateFee] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // ── queries ────────────────────────────────────────────────────────────────

  const structuresQuery = useQuery({
    queryKey: ["finance-class-fee-structures", schoolId],
    queryFn: () => getClassFeeStructureList(schoolId),
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
  });

  const classesQuery = useQuery({
    queryKey: ["finance-school-classes", schoolId],
    queryFn: () => getSchoolClasses(schoolId),
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
  });

  const structures = structuresQuery.data ?? [];
  const classes = classesQuery.data ?? [];

  const classMap = useMemo(() => {
    const m = new Map<string, SchoolClass>();
    for (const c of classes) m.set(c._id, c);
    return m;
  }, [classes]);

  const getDisplayName = (classId: string, _sectionId?: string | null) => {
    const c = classMap.get(classId);
    return c ? c.name : classId;
  };

  // ── form helpers ───────────────────────────────────────────────────────────

  const setField = <K extends keyof FeeForm>(k: K, v: FeeForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const clearFeedback = () => {
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleEdit = (s: ClassFeeStructureRecord) => {
    setEditingId(s._id);
    setForm(formFromStructure(s));
    setShowLateFee(s.late_fee_type !== "none");
    clearFeedback();
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowLateFee(false);
    clearFeedback();
  };

  // ── submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const academicFeeNum = Number(form.academicFee) || 0;
    const transportFeeNum = Number(form.transportFee) || 0;
    const otherFeeNum = Number(form.otherFee) || 0;

    if (!form.classId || !form.academicYear || !form.dueDate) {
      setSaveError("Class, Academic Year, and Due Date are required.");
      return;
    }
    if (academicFeeNum <= 0 && transportFeeNum <= 0 && otherFeeNum <= 0) {
      setSaveError("At least one fee amount must be greater than 0.");
      return;
    }

    const lateFeePayload = showLateFee
      ? {
          late_fee_type: form.lateFeeType,
          late_fee_amount: Number(form.lateFeeAmount) || 0,
          late_fee_grace_days: Number(form.lateFeeGraceDays) || 0,
          late_fee_description: form.lateFeeDescription,
        }
      : { late_fee_type: "none" as const, late_fee_amount: 0, late_fee_grace_days: 0, late_fee_description: "" };

    setSaving(true);
    try {
      if (editingId) {
        await updateClassFeeStructure(editingId, schoolId, {
          academic_fee: academicFeeNum,
          default_transport_fee: transportFeeNum,
          other_fee: otherFeeNum,
          due_date: form.dueDate,
          ...lateFeePayload,
        });
        setSaveSuccess("Updated and assignments synced.");
      } else {
        await saveClassFeeStructure(schoolId, {
          class_id: form.classId,
          // section_id removed — fee structure applies to all sections
          academic_year: form.academicYear,
          academic_fee: academicFeeNum,
          default_transport_fee: transportFeeNum,
          other_fee: otherFeeNum,
          due_date: form.dueDate,
          ...lateFeePayload,
        });
        setSaveSuccess("Created and auto-assigned to all active students.");
        setForm(EMPTY_FORM);
        setShowLateFee(false);
      }
      void qc.invalidateQueries({
        queryKey: ["finance-class-fee-structures", schoolId],
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = editingId !== null;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* ── FORM PANEL (left 2 cols) ── */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          {/* header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEditing ? "Edit Fee Structure" : "New Fee Structure"}
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {isEditing
                  ? "Update fees or due date — assignments sync automatically"
                  : "Define fees for a class then auto-assign to all active students"}
              </p>
            </div>
            {isEditing && (
              <button
                onClick={handleCancel}
                className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Class */}
            <Field label="Class" required>
              <select
                value={form.classId}
                onChange={(e) => setField("classId", e.target.value)}
                disabled={isEditing}
                required
                className={inputCls}
              >
                <option value="">Select class…</option>
                {classesQuery.isLoading && (
                  <option disabled>Loading…</option>
                )}
                {getUniqueClasses(classes).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Academic Year */}
            <Field label="Academic Year" required>
              <input
                type="text"
                placeholder="e.g. 2025-26"
                value={form.academicYear}
                onChange={(e) => setField("academicYear", e.target.value)}
                disabled={isEditing}
                required
                className={inputCls}
              />
            </Field>

            {/* Fee amounts row */}
            <div className="grid grid-cols-3 gap-2">
              <Field label="Academic Fee" required>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.academicFee}
                  onChange={(e) => setField("academicFee", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Transport Fee">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.transportFee}
                  onChange={(e) => setField("transportFee", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Other Fee">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.otherFee}
                  onChange={(e) => setField("otherFee", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Due Date */}
            <Field label="Due Date" required>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setField("dueDate", e.target.value)}
                required
                className={inputCls}
              />
            </Field>

            {/* Late fee accordion */}
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowLateFee((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <span>Late Fee Config (optional)</span>
                {showLateFee ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showLateFee && (
                <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
                  <Field label="Type">
                    <select
                      value={form.lateFeeType}
                      onChange={(e) =>
                        setField("lateFeeType", e.target.value as LateFeeType)
                      }
                      className={inputCls}
                    >
                      <option value="none">None</option>
                      <option value="fixed">Fixed (one-time)</option>
                      <option value="daily">Daily (per day overdue)</option>
                      <option value="percentage">Percentage of due amount</option>
                    </select>
                  </Field>

                  {form.lateFeeType !== "none" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label={
                          form.lateFeeType === "percentage"
                            ? "Rate (%)"
                            : "Amount (₹)"
                        }
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={form.lateFeeAmount}
                          onChange={(e) =>
                            setField("lateFeeAmount", e.target.value)
                          }
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Grace Days">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={form.lateFeeGraceDays}
                          onChange={(e) =>
                            setField("lateFeeGraceDays", e.target.value)
                          }
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  )}

                  <Field label="Description">
                    <input
                      type="text"
                      placeholder="e.g. ₹50/day after 7-day grace period"
                      value={form.lateFeeDescription}
                      onChange={(e) =>
                        setField("lateFeeDescription", e.target.value)
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Feedback */}
            {saveError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                {saveSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : isEditing
                  ? "Update & Sync"
                  : "Create & Auto-Assign"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── TABLE PANEL (right 3 cols) ── */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Existing Fee Structures
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {structures.length} structure
                {structures.length !== 1 ? "s" : ""} configured
              </p>
            </div>
          </div>

          {/* loading */}
          {structuresQuery.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          )}

          {/* error */}
          {structuresQuery.isError && (
            <p className="py-8 text-center text-sm text-rose-600">
              Failed to load fee structures.
            </p>
          )}

          {/* empty */}
          {!structuresQuery.isLoading &&
            !structuresQuery.isError &&
            structures.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-4">
                  <Plus className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  No fee structures yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Use the form to create one — fees auto-assign to all active
                  students in the class
                </p>
              </div>
            )}

          {/* table */}
          {!structuresQuery.isLoading && structures.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="py-2 text-left">Class / Year</th>
                    <th className="py-2 text-right">Acad.</th>
                    <th className="py-2 text-right">Trans.</th>
                    <th className="py-2 text-right">Other</th>
                    <th className="py-2 text-right">Due</th>
                    <th className="py-2 text-center">Paid / Total</th>
                    <th className="py-2 text-right">%</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {structures.map((s) => {
                    const cp = pct(s.paidCount, s.assignedCount);
                    const active = editingId === s._id;
                    return (
                      <tr
                        key={s._id}
                        className={`border-b transition-colors ${
                          active ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2.5">
                          <p className="font-medium text-slate-800">
                            {getDisplayName(s.class_id, s.section_id)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.academic_year}
                          </p>
                        </td>
                        <td className="py-2.5 text-right text-slate-700">
                          {fmtShort(s.academic_fee)}
                        </td>
                        <td className="py-2.5 text-right text-slate-500">
                          {fmtShort(s.default_transport_fee)}
                        </td>
                        <td className="py-2.5 text-right text-slate-500">
                          {fmtShort(s.other_fee)}
                        </td>
                        <td className="py-2.5 text-right text-[11px] text-slate-500">
                          {s.due_date}
                        </td>
                        <td className="py-2.5 text-center text-xs">
                          <span className="font-semibold text-emerald-600">
                            {s.paidCount}
                          </span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className="text-slate-500">
                            {s.assignedCount}
                          </span>
                          {s.pendingCount > 0 && (
                            <span className="ml-1 text-amber-500">
                              ({s.pendingCount} pending)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-400 transition-all"
                                style={{ width: `${cp}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                cp >= 75
                                  ? "text-emerald-600"
                                  : cp >= 40
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {cp}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pl-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                              active
                                ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Edit2 className="h-3 w-3" />
                            {active ? "Editing" : "Edit"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
