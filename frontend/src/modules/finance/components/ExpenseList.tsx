import { useState, useEffect } from "react";
import {
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Printer,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader,
  AlertCircle,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type Expense = {
  _id: string;
  expenseDate: string;
  title: string;
  categoryId: { name: string; code: string };
  vendorId?: { name: string };
  vendorName?: string;
  amount: number;
  paymentMode: string;
  receipts?: Array<{ url: string; fileName: string }>;
  status: "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "paid";
  recordedBy?: { name: string; email: string };
};

type Filters = {
  startDate: string;
  endDate: string;
  categoryId: string;
  vendorId: string;
  paymentMode: string;
  status: string;
  searchQuery: string;
  minAmount: string;
  maxAmount: string;
};

const paymentModeLabel: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  credit_card: "Credit Card",
  cheque: "Cheque",
};

const statusColor: Record<string, { bg: string; text: string; badge: string }> = {
  draft: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-700",
  },
  submitted: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  pending_approval: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  paid: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-700",
  },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [filters, setFilters] = useState<Filters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    categoryId: "",
    vendorId: "",
    paymentMode: "",
    status: "",
    searchQuery: "",
    minAmount: "",
    maxAmount: "",
  });

  useEffect(() => {
    fetchExpenses();
  }, [page, filters]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.paymentMode && { paymentMode: filters.paymentMode }),
        ...(filters.status && { status: filters.status }),
        ...(filters.minAmount && { minAmount: filters.minAmount }),
        ...(filters.maxAmount && { maxAmount: filters.maxAmount }),
      });

      const response = await fetch(`${API_URL}/api/expenses?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setExpenses(data.expenses);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleApprove = async (expenseId: string) => {
    if (!confirm("Approve this expense?")) return;

    try {
      const response = await fetch(`${API_URL}/api/expenses/${expenseId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ remarks: "" }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      fetchExpenses();
    } catch (error) {
      console.error("Error approving expense:", error);
    }
  };

  const handleReject = async (expenseId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const response = await fetch(`${API_URL}/api/expenses/${expenseId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ rejectionReason: reason }),
      });

      if (!response.ok) throw new Error("Failed to reject");

      fetchExpenses();
    } catch (error) {
      console.error("Error rejecting expense:", error);
    }
  };

  const handlePrintVoucher = (expense: Expense) => {
    const printContent = `
      <html>
        <head>
          <title>Expense Voucher - ${expense.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; width: 30%; }
            .value { width: 70%; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Expense Voucher</h2>
            <p>${expense._id}</p>
          </div>
          <div class="section">
            <div class="row">
              <div class="label">Date:</div>
              <div class="value">${new Date(expense.expenseDate).toLocaleDateString()}</div>
            </div>
            <div class="row">
              <div class="label">Title:</div>
              <div class="value">${expense.title}</div>
            </div>
            <div class="row">
              <div class="label">Category:</div>
              <div class="value">${expense.categoryId?.name || "N/A"}</div>
            </div>
            <div class="row">
              <div class="label">Amount:</div>
              <div class="value">${fmt(expense.amount)}</div>
            </div>
            <div class="row">
              <div class="label">Vendor:</div>
              <div class="value">${expense.vendorName || expense.vendorId?.name || "N/A"}</div>
            </div>
            <div class="row">
              <div class="label">Payment Mode:</div>
              <div class="value">${paymentModeLabel[expense.paymentMode] || expense.paymentMode}</div>
            </div>
            <div class="row">
              <div class="label">Status:</div>
              <div class="value">${expense.status}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExport = () => {
    const csv = [
      ["Date", "Title", "Category", "Vendor", "Amount", "Payment Mode", "Status"],
      ...expenses.map((exp) => [
        new Date(exp.expenseDate).toLocaleDateString(),
        exp.title,
        exp.categoryId?.name || "N/A",
        exp.vendorName || exp.vendorId?.name || "N/A",
        exp.amount,
        paymentModeLabel[exp.paymentMode],
        exp.status,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expense List</h1>
          <p className="text-slate-600 mt-1">Manage and track all school expenses</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
              <select
                name="paymentMode"
                value={filters.paymentMode}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="credit_card">Credit Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No expenses found</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Title</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Vendor</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Mode</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense._id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-3 text-sm text-slate-900">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900 font-medium">{expense.title}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{expense.categoryId?.name || "N/A"}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {expense.vendorName || expense.vendorId?.name || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-900 font-semibold text-right">{fmt(expense.amount)}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {paymentModeLabel[expense.paymentMode] || expense.paymentMode}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[expense.status].badge}`}>
                          {expense.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="View"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Edit"
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {expense.status === "submitted" && (
                            <>
                              <button
                                onClick={() => handleApprove(expense._id)}
                                title="Approve"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(expense._id)}
                                title="Reject"
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handlePrintVoucher(expense)}
                            title="Print Voucher"
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} expenses
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">
                  Page {page} of {pages}
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
          </>
        )}
      </div>
    </div>
  );
}
