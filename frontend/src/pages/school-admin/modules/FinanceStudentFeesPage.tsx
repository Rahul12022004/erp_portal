import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Pagination from "@mui/material/Pagination";
import { RefreshCw, Search, X } from "lucide-react";
import {
  getAvailableYears,
  getSchoolClasses,
  getStudentFeeSummaryPage,
  recordPayment,
} from "@/modules/finance/api/financeClient";
import type {
  StudentFeeSummaryItem,
  StudentSummaryMetrics,
} from "@/modules/finance/types";
import { getUniqueClasses } from "@/lib/classUtils";

const PAGE_SIZE = 20;

type StatusFilter = "all" | "paid" | "partial" | "pending" | "overdue";

function getSchoolId(): string {
  try {
    return (JSON.parse(localStorage.getItem("school") || "null") as { _id?: string } | null)?._id ?? "";
  } catch {
    return "";
  }
}

function fmt(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  paid: { label: "Paid", bg: "bg-green-100", text: "text-green-700" },
  partial: { label: "Partial", bg: "bg-amber-100", text: "text-amber-700" },
  overdue: { label: "Overdue", bg: "bg-red-100", text: "text-red-700" },
  pending: { label: "Pending", bg: "bg-slate-100", text: "text-slate-600" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

type PaymentForm = {
  amount: string;
  mode: "cash" | "upi" | "card" | "cheque" | "bank_transfer";
  date: string;
  refNo: string;
  remarks: string;
};

function RecordPaymentModal({
  schoolId,
  item,
  onClose,
  onSuccess,
}: {
  schoolId: string;
  item: StudentFeeSummaryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<PaymentForm>({
    amount: String(item.currentDueAmount > 0 ? item.currentDueAmount : item.remainingAmount),
    mode: "cash",
    date: new Date().toISOString().slice(0, 10),
    refNo: "",
    remarks: "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      recordPayment(schoolId, {
        student_fee_assignment_id: item.financeId!,
        payment_date: form.date,
        payment_amount: Number(form.amount),
        payment_mode: form.mode,
        reference_no: form.refNo || undefined,
        remarks: form.remarks || undefined,
      }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    if (!item.financeId) { setError("No fee assignment found for this student"); return; }
    setError("");
    mutation.mutate();
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Record Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">{item.student.name} · {item.student.class}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="border-b bg-slate-50 px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Fee Breakdown</span>
            <span>
              Remaining:{" "}
              <span className="font-semibold text-red-600">{fmt(item.remainingAmount)}</span>
            </span>
          </div>
          <div className="space-y-1">
            {item.feeComponents.length === 0 && (
              <p className="text-xs text-slate-400">No fee components</p>
            )}
            {item.feeComponents.map((fc) => (
              <div key={fc.label} className="flex justify-between text-xs text-slate-600">
                <span>{fc.label}</span>
                <span>{fmt(fc.amount)}</span>
              </div>
            ))}
          </div>
          {item.olderPendingAmount > 0 && (
            <div className="mt-2 flex justify-between text-xs font-medium text-amber-700">
              <span>Older year dues</span>
              <span>{fmt(item.olderPendingAmount)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                className={inputCls}
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Payment Date *</label>
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Payment Mode *</label>
            <select
              className={inputCls}
              value={form.mode}
              onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as PaymentForm["mode"] }))}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Reference No.</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Transaction ID / Cheque No."
              value={form.refNo}
              onChange={(e) => setForm((p) => ({ ...p, refNo: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>Remarks</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Optional notes"
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-lg font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}

function MetricsBar({ metrics }: { metrics: StudentSummaryMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="Total Students" value={String(metrics.totalStudents)} />
      <MetricCard label="Total Fee" value={fmt(metrics.currentTotalFee)} />
      <MetricCard label="Collected" value={fmt(metrics.currentPaidAmount)} accent="text-green-700" />
      <MetricCard label="Pending" value={fmt(metrics.currentPendingAmount)} accent="text-amber-600" />
      <MetricCard
        label="Overdue"
        value={String(metrics.overdueCount)}
        sub="students"
        accent="text-red-600"
      />
      <MetricCard
        label="Outstanding"
        value={fmt(metrics.outstandingBalance)}
        sub="incl. older years"
      />
    </div>
  );
}

export default function FinanceStudentFeesPage() {
  const schoolId = getSchoolId();
  const queryClient = useQueryClient();

  const [academicYear, setAcademicYear] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalItem, setModalItem] = useState<StudentFeeSummaryItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const yearsQuery = useQuery({
    queryKey: ["finance-years", schoolId],
    queryFn: () => getAvailableYears(schoolId),
    enabled: Boolean(schoolId),
  });

  const classesQuery = useQuery({
    queryKey: ["finance-school-classes", schoolId],
    queryFn: () => getSchoolClasses(schoolId),
    enabled: Boolean(schoolId),
  });

  const effectiveYear = academicYear || yearsQuery.data?.[0] || "";

  const summaryQuery = useQuery({
    queryKey: ["finance-student-fees", schoolId, effectiveYear, selectedClassName, debouncedSearch, page],
    queryFn: () =>
      getStudentFeeSummaryPage(schoolId, {
        page,
        limit: PAGE_SIZE,
        className: selectedClassName || undefined,
        academicYear: effectiveYear || undefined,
        search: debouncedSearch || undefined,
      }),
    enabled: Boolean(schoolId),
    placeholderData: (prev) => prev,
  });

  const { items = [], metrics, pagination } = summaryQuery.data ?? {};

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  function handlePaymentSuccess() {
    queryClient.invalidateQueries({ queryKey: ["finance-student-fees", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["finance-dashboard-summary", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["finance-all-assignments", schoolId] });
  }

  const isLoading = summaryQuery.isLoading;
  const isFetching = summaryQuery.isFetching;

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Student Fees</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            View fee status and record payments for individual students
          </p>
        </div>
        <button
          onClick={() => summaryQuery.refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={academicYear}
          onChange={(e) => { setAcademicYear(e.target.value); setPage(1); }}
        >
          {(yearsQuery.data ?? []).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedClassName}
          onChange={(e) => { setSelectedClassName(e.target.value); setPage(1); }}
        >
          <option value="">All Classes</option>
          {getUniqueClasses(classesQuery.data ?? []).map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, roll no…"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
      </div>

      {isLoading && !metrics ? <MetricsSkeleton /> : metrics ? <MetricsBar metrics={metrics} /> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3 text-right">Total Fee</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No students found
                </td>
              </tr>
            )}
            {!isLoading &&
              filteredItems.map((item) => (
                <tr key={item.studentId} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.student.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {item.student.class}
                      {item.student.rollNumber ? ` · Roll ${item.student.rollNumber}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {fmt(item.totalFee)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">
                    {fmt(item.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-amber-700">
                    {fmt(item.remainingAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={!item.financeId || item.status === "paid"}
                      onClick={() => setModalItem(item)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {item.status === "paid" ? "Paid" : "Record Payment"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, pagination.totalItems)} of {pagination.totalItems} students
          </span>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            size="small"
            shape="rounded"
          />
        </div>
      )}

      {modalItem && (
        <RecordPaymentModal
          schoolId={schoolId}
          item={modalItem}
          onClose={() => setModalItem(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
