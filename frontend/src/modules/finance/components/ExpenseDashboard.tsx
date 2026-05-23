import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  WalletCards,
  AlertCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "@/lib/api";

type DashboardSummary = {
  totalExpensesThisMonth: number;
  approvedExpensesCount: number;
  pendingApprovalCount: number;
  cashExpenses: number;
  bankExpenses: number;
  topCategories: Array<{
    _id: string;
    total: number;
    count: number;
    category?: Array<{ name: string; code: string }>;
  }>;
};

type MonthlyData = {
  month: string;
  expenses: number;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const COLORS = ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#cffafe"];

const clayShell = "rounded-[28px] border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#f2f7fc_100%)] p-5 shadow-[0_18px_45px_rgba(148,163,184,0.16)]";
const clayCard = "rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 shadow-[0_10px_28px_rgba(148,163,184,0.14)]";
const clayInset = "rounded-[22px] border border-slate-200/85 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_rgba(148,163,184,0.1)]";

export function ExpenseDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/expenses/dashboard/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();
      setSummary(data.summary);

      // Generate mock monthly data
      generateMonthlyData();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const data = months.map((month) => ({
      month,
      expenses: Math.floor(Math.random() * 50000) + 10000,
    }));
    setMonthlyData(data);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    trend?: { percentage: number; isPositive: boolean };
  }) => (
    <div className={clayCard}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {trend.isPositive ? "↑" : "↓"} {trend.percentage}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.1),transparent_34%),linear-gradient(180deg,#fff7f7_0%,#fff1f2_60%,#f8fbff_100%)] p-3">
      {/* Header */}
      <section className={clayShell}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-700 shadow-sm">Expense Area</div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950">Expense Dashboard</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">Monitor and manage school expenses</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 bg-[linear-gradient(180deg,#ffffff_0%,#ffe4e6_100%)] px-4 py-3 text-sm font-bold text-rose-800 shadow-[0_8px_20px_rgba(244,63,94,0.12)] transition hover:shadow-[0_12px_24px_rgba(244,63,94,0.18)]">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Date Range Filter */}
        <div className={`mt-4 ${clayInset}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="h-9 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-[0_2px_10px_rgba(148,163,184,0.08)] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            <span className="text-sm text-slate-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="h-9 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-[0_2px_10px_rgba(148,163,184,0.08)] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Expenses This Month"
          value={fmt(summary?.totalExpensesThisMonth || 0)}
          icon={WalletCards}
          color="bg-teal-100 text-teal-700"
          trend={{ percentage: 12, isPositive: false }}
        />
        <StatCard
          title="Approved Expenses"
          value={summary?.approvedExpensesCount || 0}
          icon={CheckCircle2}
          color="bg-emerald-100 text-emerald-700"
          trend={{ percentage: 8, isPositive: true }}
        />
        <StatCard
          title="Pending Approvals"
          value={summary?.pendingApprovalCount || 0}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
          trend={{ percentage: 3, isPositive: false }}
        />
        <StatCard
          title="Cash Expenses"
          value={fmt(summary?.cashExpenses || 0)}
          icon={DollarSign}
          color="bg-slate-100 text-slate-700"
        />
        <StatCard
          title="Bank Expenses"
          value={fmt(summary?.bankExpenses || 0)}
          icon={CreditCard}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Top Category"
          value={summary?.topCategories?.[0]?.category?.[0]?.name || "N/A"}
          icon={BarChart3}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Trend */}
        <div className={clayCard}>
          <h2 className="text-base font-bold text-slate-900 mb-4">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }} />
              <Line type="monotone" dataKey="expenses" stroke="#0891b2" strokeWidth={2} dot={{ fill: "#0891b2" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className={clayCard}>
          <h2 className="text-base font-bold text-slate-900 mb-4">Top Spending Categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={summary?.topCategories.map((cat) => ({
                  name: cat.category?.[0]?.name || "Uncategorized",
                  value: cat.total,
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${fmt(value)}`}
                outerRadius={80}
                fill="#0891b2"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => fmt(value)} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Expenses Summary */}
      <div className={clayCard}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Expenses Summary</h2>
          <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Category</th>
                <th className="text-right py-3 px-3 font-semibold text-slate-700">Amount</th>
                <th className="text-right py-3 px-3 font-semibold text-slate-700">Count</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {summary?.topCategories?.slice(0, 5).map((cat, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 text-slate-900">{cat.category?.[0]?.name || "Uncategorized"}</td>
                  <td className="text-right py-3 px-3 text-slate-900 font-medium">{fmt(cat.total)}</td>
                  <td className="text-right py-3 px-3 text-slate-600">{cat.count}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600"
                          style={{
                            width: `${((cat.total / (summary?.topCategories?.[0]?.total || 1)) * 100).toFixed(0)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 w-8">
                        {((cat.total / (summary?.topCategories?.[0]?.total || 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
