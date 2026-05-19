import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  MessageSquare,
  ChevronRight,
  Filter,
  Loader,
  AlertCircle,
  Zap,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type Expense = {
  _id: string;
  title: string;
  amount: number;
  categoryId: { name: string };
  vendorName?: string;
  expenseDate: string;
  status: string;
  recordedBy: { name: string; email: string };
  approvalHistory: Array<{
    approvedBy: string;
    approvalDate: string;
    remarks: string;
    level: number;
  }>;
  approvalLevel: number;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const ApprovalLevelInfo = {
  1: { label: "Level 1 (Department)", roles: "Department Head" },
  2: { label: "Level 2 (Finance)", roles: "Finance Officer" },
  3: { label: "Level 3 (Management)", roles: "Principal/Management" },
};

const getApprovalThreshold = (amount: number): number => {
  // Auto-approve below 5000
  if (amount < 5000) return 0;
  // Level 1: 5000-25000
  if (amount < 25000) return 1;
  // Level 2: 25000-100000
  if (amount < 100000) return 2;
  // Level 3: Above 100000
  return 3;
};

export function ExpenseApprovalWorkflow() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("pending");

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, approvalFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/expenses?status=submitted,pending_approval&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setExpenses(data.expenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (approvalFilter === "pending") {
      filtered = filtered.filter(
        (e) => e.status === "submitted" || e.status === "pending_approval"
      );
    } else if (approvalFilter === "need_escalation") {
      filtered = filtered.filter((e) => {
        const requiredLevel = getApprovalThreshold(e.amount);
        return requiredLevel > 1 && e.approvalLevel < requiredLevel;
      });
    }

    setFilteredExpenses(filtered);
  };

  const isAutoApprovable = (amount: number): boolean => {
    return amount < 5000;
  };

  const handleApprove = async (expenseId: string) => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/expenses/${expenseId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ remarks: remarks || "Approved" }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      setSuccess("Expense approved successfully");
      setRemarks("");
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleReject = async (expenseId: string) => {
    if (!remarks.trim()) {
      setError("Please provide rejection reason");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/expenses/${expenseId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ rejectionReason: remarks }),
      });

      if (!response.ok) throw new Error("Failed to reject");

      setSuccess("Expense rejected");
      setRemarks("");
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const QueueCard = ({ expense }: { expense: Expense }) => {
    const requiredLevel = getApprovalThreshold(expense.amount);
    const isAutoApprove = isAutoApprovable(expense.amount);
    const needsEscalation = requiredLevel > 1 && expense.approvalLevel < requiredLevel;

    return (
      <div
        onClick={() => setSelectedExpense(expense)}
        className={`border rounded-lg p-4 cursor-pointer transition ${
          selectedExpense?._id === expense._id
            ? "border-teal-500 bg-teal-50"
            : "border-slate-200 hover:border-teal-300"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{expense.title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {expense.categoryId?.name} • {new Date(expense.expenseDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900 text-lg">{fmt(expense.amount)}</p>
            {isAutoApprove && (
              <span className="inline-block mt-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                Auto-Approvable
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
          <User className="w-4 h-4" />
          {expense.recordedBy?.name || "Unknown"}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {needsEscalation && (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-slate-700">
              Approval Level: {expense.approvalLevel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {expense.approvalHistory.length} approval(s) completed
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Left: Queue List */}
      <div className="lg:col-span-1 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Approval Queue</h2>
          <p className="text-sm text-slate-600">Expenses pending your approval</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setApprovalFilter("pending")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
              approvalFilter === "pending"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            Pending
          </button>
          <button
            onClick={() => setApprovalFilter("need_escalation")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
              approvalFilter === "need_escalation"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Zap className="w-4 h-4 inline mr-1" />
            Escalate
          </button>
        </div>

        {/* Queue */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No expenses to approve</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredExpenses.map((expense) => (
              <QueueCard key={expense._id} expense={expense} />
            ))}
          </div>
        )}
      </div>

      {/* Right: Details & Actions */}
      <div className="lg:col-span-2">
        {selectedExpense ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {/* Messages */}
            {error && (
              <div className="mb-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}

            {/* Header */}
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {selectedExpense.title}
              </h2>
              <p className="text-sm text-slate-600">
                {selectedExpense.categoryId?.name} •{" "}
                {new Date(selectedExpense.expenseDate).toLocaleDateString()}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm text-slate-600">Amount</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {fmt(selectedExpense.amount)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm text-slate-600">Vendor</p>
                  <p className="font-medium text-slate-900">
                    {selectedExpense.vendorName || "N/A"}
                  </p>
                </div>
              </div>

              {/* Approval Level Info */}
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">Current Approval Level</p>
                <div className="space-y-2">
                  {[1, 2, 3].map((level) => {
                    const isCompleted = selectedExpense.approvalHistory.some(
                      (a) => a.level === level
                    );
                    const isCurrent = level === selectedExpense.approvalLevel;

                    return (
                      <div
                        key={level}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isCompleted
                            ? "bg-emerald-50 border-emerald-200"
                            : isCurrent
                            ? "bg-amber-50 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : isCurrent ? (
                            <Clock className="w-5 h-5 text-amber-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-400"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {ApprovalLevelInfo[level as keyof typeof ApprovalLevelInfo]?.label}
                          </p>
                          <p className="text-xs text-slate-600">
                            {ApprovalLevelInfo[level as keyof typeof ApprovalLevelInfo]?.roles}
                          </p>
                        </div>
                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-600">APPROVED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recorded By */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm font-bold text-blue-700 mb-2">Submitted By</p>
                <p className="font-medium text-slate-900">{selectedExpense.recordedBy?.name}</p>
                <p className="text-sm text-slate-600">{selectedExpense.recordedBy?.email}</p>
              </div>
            </div>

            {/* Approval History */}
            {selectedExpense.approvalHistory.length > 0 && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-3">Approval History</p>
                <div className="space-y-2">
                  {selectedExpense.approvalHistory.map((approval, idx) => (
                    <div key={idx} className="text-sm text-slate-600">
                      <p className="font-medium text-slate-900">
                        Level {approval.level} - {new Date(approval.approvalDate).toLocaleString()}
                      </p>
                      {approval.remarks && (
                        <p className="text-slate-600 mt-1">"{approval.remarks}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Remarks / Notes
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add approval remarks or rejection reason..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Auto-Approval Notice */}
            {isAutoApprovable(selectedExpense.amount) && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <Zap className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <p className="text-sm text-teal-700">
                  This expense is below ₹5,000 and can be auto-approved.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedExpense._id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => handleReject(selectedExpense._id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select an expense from the queue to review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
