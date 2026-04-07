import { useState, useEffect } from "react";
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Target,
  Loader,
  Plus,
  Edit2,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "@/lib/api";

type BudgetCategory = {
  categoryId: string;
  categoryName: string;
  budgetedAmount: number;
  actualSpent: number;
  pendingApproval: number;
  remainingBalance: number;
  utilizationPercentage: number;
  status: "within_budget" | "near_limit" | "over_budget";
};

type Budget = {
  _id: string;
  fiscalYear: string;
  budgetType: "monthly" | "quarterly" | "annual";
  totalBudget: number;
  totalSpent: number;
  totalPendingApproval: number;
  remainingBalance: number;
  budgetUtilization: number;
  budgets: BudgetCategory[];
  alerts: Array<{
    categoryId: string;
    alertType: "warning" | "critical" | "exceeded";
    message: string;
  }>;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const statusColors = {
  within_budget: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  near_limit: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  over_budget: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const alertColors = {
  warning: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
  critical: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-600" },
  exceeded: { bg: "bg-red-100", text: "text-red-800", icon: "text-red-700" },
};

export function BudgetMonitoring() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [budgetType, setBudgetType] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [fiscalYear, setFiscalYear] = useState(
    new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)
  );

  useEffect(() => {
    fetchBudget();
  }, [fiscalYear, budgetType]);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/expenses/budget/status?fiscalYear=${fiscalYear}&budgetType=${budgetType}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (!response.ok) {
        // Return default budget structure if not found
        setBudget(null);
        return;
      }

      const data = await response.json();
      setBudget(data.budget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch budget");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const chartData = budget?.budgets.map((b) => ({
    name: b.categoryName,
    budgeted: b.budgetedAmount,
    spent: b.actualSpent,
    pending: b.pendingApproval,
  })) || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Budget Monitoring</h1>
          <p className="text-slate-600 mt-1">Track expenses against approved budgets</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
          <Plus className="w-4 h-4" />
          Set Budget
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 flex gap-4">
        <select
          value={budgetType}
          onChange={(e) => setBudgetType(e.target.value as any)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
        <select
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value={new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)}>
            {new Date().getFullYear()}-{new Date().getFullYear() + 1}
          </option>
          <option value={new Date().getFullYear() - 1 + "-" + new Date().getFullYear()}>
            {new Date().getFullYear() - 1}-{new Date().getFullYear()}
          </option>
        </select>
      </div>

      {budget ? (
        <>
          {/* Overall Budget Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Total Budget</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(budget.totalBudget)}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Amount Spent</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(budget.totalSpent)}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Remaining Balance</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(budget.remainingBalance)}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Utilization</p>
              <p className="text-2xl font-bold text-slate-900">{budget.budgetUtilization || 0}%</p>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${
                    (budget.budgetUtilization || 0) > 95
                      ? "bg-red-600"
                      : (budget.budgetUtilization || 0) > 80
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  }`}
                  style={{ width: `${Math.min(budget.budgetUtilization || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alerts */}
          {budget.alerts && budget.alerts.length > 0 && (
            <div className="space-y-3">
              {budget.alerts.map((alert, idx) => {
                const alertColor = alertColors[alert.alertType as keyof typeof alertColors];
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-4 rounded-lg border ${alertColor.bg}`}
                  >
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alertColor.icon}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${alertColor.text}`}>{alert.alertType.toUpperCase()}</p>
                      <p className={`text-sm ${alertColor.text}`}>{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Budget vs Actual Spending</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }}
                  formatter={(value: number) => fmt(value)}
                />
                <Legend />
                <Bar dataKey="budgeted" fill="#0891b2" name="Budgeted" />
                <Bar dataKey="spent" fill="#f59e0b" name="Spent" />
                <Bar dataKey="pending" fill="#6366f1" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Details */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Category-wise Budget</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                      Budgeted
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                      Spent
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                      Remaining
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">
                      utilization
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budget.budgets.map((cat, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-100 ${
                        statusColors[cat.status].bg
                      } hover:opacity-75 transition`}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">
                        {cat.categoryName}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-slate-900">
                        {fmt(cat.budgetedAmount)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-slate-900">
                        {fmt(cat.actualSpent)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-slate-600">
                        {fmt(cat.pendingApproval)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-slate-900">
                        {fmt(cat.remainingBalance)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                cat.utilizationPercentage > 95
                                  ? "bg-red-600"
                                  : cat.utilizationPercentage > 80
                                  ? "bg-amber-600"
                                  : "bg-emerald-600"
                              }`}
                              style={{ width: `${Math.min(cat.utilizationPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-900 w-10 text-right">
                            {cat.utilizationPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded border ${
                            statusColors[cat.status].text
                          } ${statusColors[cat.status].border}`}
                        >
                          {cat.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
          <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-3">No budget configured for {fiscalYear}</p>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
            Create Budget
          </button>
        </div>
      )}
    </div>
  );
}
