import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  Upload,
  Eye,
  Filter,
  Search,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type AuditLog = {
  _id: string;
  expenseId: string;
  action:
    | "created"
    | "edited"
    | "submitted"
    | "approved"
    | "rejected"
    | "paid"
    | "receipt_uploaded"
    | "status_changed";
  performedBy: { name: string; email: string };
  performedDate: string;
  remarks: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  attachmentFileName?: string;
  approvalLevel?: number;
};

type Expense = {
  _id: string;
  title: string;
  amount: number;
  status: string;
  expenseDate: string;
  recordedBy: { name: string };
};

const actionColors: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  edited: "bg-amber-100 text-amber-700",
  submitted: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-indigo-100 text-indigo-700",
  receipt_uploaded: "bg-purple-100 text-purple-700",
  status_changed: "bg-slate-100 text-slate-700",
};

const actionIcons: Record<string, any> = {
  created: Plus,
  edited: Edit2,
  submitted: Upload,
  approved: CheckCircle2,
  rejected: XCircle,
  paid: Download,
  receipt_uploaded: Upload,
  status_changed: Edit2,
};

export function ExpenseAuditLog() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const limit = 20;

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (selectedExpense) {
      fetchAuditLogs();
    }
  }, [selectedExpense, page, actionFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/expenses?limit=50`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setExpenses(data.expenses);
      if (data.expenses.length > 0) {
        setSelectedExpense(data.expenses[0]);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!selectedExpense) return;

    try {
      const response = await fetch(`${API_URL}/api/expenses/audit/${selectedExpense._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      let logs = data.auditLogs || [];

      if (actionFilter !== "all") {
        logs = logs.filter((log: AuditLog) => log.action === actionFilter);
      }

      setAuditLogs(logs);
      setTotal(logs.length);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
  };

  const filteredExpenses = expenses.filter(
    (exp) =>
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp._id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedLogs = auditLogs.slice((page - 1) * limit, page * limit);
  const pages = Math.ceil(total / limit);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* Left: Expense List */}
      <div className="lg:col-span-1 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Audit Trail</h2>
          <p className="text-sm text-slate-600">View expense history & approvals</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>

        {/* Expense List */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredExpenses.map((expense) => (
              <button
                key={expense._id}
                onClick={() => {
                  setSelectedExpense(expense);
                  setPage(1);
                }}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedExpense?._id === expense._id
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-teal-300"
                }`}
              >
                <p className="font-bold text-slate-900 text-sm">{expense.title}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {new Date(expense.expenseDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Status: <span className="font-medium">{expense.status}</span>
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Audit Log Details */}
      <div className="lg:col-span-3">
        {selectedExpense ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedExpense.title}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Expense ID: {selectedExpense._id}
                  </p>
                </div>
                <span className="text-lg font-bold text-teal-600">
                  ₹{selectedExpense.amount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Date</p>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Status</p>
                  <p className="font-medium text-slate-900 capitalize">
                    {selectedExpense.status.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Recorded By</p>
                  <p className="font-medium text-slate-900">
                    {selectedExpense.recordedBy.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              >
                <option value="all">All Actions</option>
                <option value="created">Created</option>
                <option value="edited">Edited</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
                <option value="receipt_uploaded">Receipt Uploaded</option>
              </select>
            </div>

            {/* Audit Timeline */}
            <div className="space-y-3">
              {paginatedLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No audit logs found</p>
                </div>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const ActionIcon = actionIcons[log.action] || Eye;
                  return (
                    <div
                      key={log._id}
                      className={`border-l-4 pl-4 py-3 border-slate-200 hover:bg-slate-50 rounded-r-lg transition`}
                      style={{
                        borderLeftColor: {
                          created: "#3b82f6",
                          edited: "#f59e0b",
                          submitted: "#0ea5e9",
                          approved: "#10b981",
                          rejected: "#ef4444",
                          paid: "#6366f1",
                          receipt_uploaded: "#a855f7",
                          status_changed: "#94a3b8",
                        }[log.action],
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`p-2 rounded-lg ${actionColors[log.action]}`}
                          >
                            <ActionIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 capitalize">
                              {log.action.replace("_", " ")}
                            </p>
                            <p className="text-xs text-slate-600">
                              by {log.performedBy?.name || "System"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-600 flex-shrink-0">
                          {new Date(log.performedDate).toLocaleString()}
                        </span>
                      </div>

                      {log.remarks && (
                        <div className="ml-11 mb-2 p-2 bg-slate-50 rounded border border-slate-200">
                          <p className="text-sm text-slate-700">"{log.remarks}"</p>
                        </div>
                      )}

                      {log.attachmentFileName && (
                        <div className="ml-11 mb-2 p-2 bg-blue-50 rounded border border-blue-200 flex items-center gap-2">
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700">{log.attachmentFileName}</span>
                        </div>
                      )}

                      {log.changedFields && log.changedFields.length > 0 && (
                        <div className="ml-11 text-xs text-slate-600">
                          <p className="font-medium">Changed fields:</p>
                          <p>{log.changedFields.join(", ")}</p>
                        </div>
                      )}

                      {log.approvalLevel && (
                        <div className="ml-11 mt-2 text-xs text-slate-600">
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
                            Level {log.approvalLevel} Approval
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
                  {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">
                    {page}/{pages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    className="p-2 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Select an expense to view its audit trail</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
