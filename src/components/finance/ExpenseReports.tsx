import { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Filter,
  Calendar,
  Loader,
  AlertCircle,
} from "lucide-react";
import {
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

type ReportType =
  | "daily"
  | "monthly_summary"
  | "category_wise"
  | "vendor_wise"
  | "pending_approval"
  | "budget_vs_actual"
  | "cash_vs_bank"
  | "department_wise";

type Report = {
  title: string;
  data: any[];
  generatedAt: string;
  filters: Record<string, string>;
};

const reportTypes: Array<{ value: ReportType; label: string; description: string }> = [
  { value: "daily", label: "Daily Expense Report", description: "Daily expense summary" },
  {
    value: "monthly_summary",
    label: "Monthly Summary",
    description: "M-o-M expense trends",
  },
  {
    value: "category_wise",
    label: "Category-wise Report",
    description: "Expenses by category",
  },
  {
    value: "vendor_wise",
    label: "Vendor-wise Report",
    description: "Spending by vendor",
  },
  {
    value: "pending_approval",
    label: "Pending Approvals",
    description: "Expenses awaiting approval",
  },
  {
    value: "budget_vs_actual",
    label: "Budget vs Actual",
    description: "Budget performance",
  },
  {
    value: "cash_vs_bank",
    label: "Cash vs Bank",
    description: "Payment method analysis",
  },
  {
    value: "department_wise",
    label: "Department-wise",
    description: "Expenses by department",
  },
];

const COLORS = ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#cffafe"];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export function ExpenseReports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("monthly_summary");
  const [reportData, setReportData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    generateReport();
  }, [selectedReport, startDate, endDate]);

  const generateReport = async () => {
    try {
      setLoading(true);

      // Mock report generation - in production, call backend endpoint
      const mockData = generateMockReportData();
      setReportData({
        title: reportTypes.find((r) => r.value === selectedReport)?.label || "Report",
        data: mockData,
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate },
      });
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockReportData = () => {
    switch (selectedReport) {
      case "monthly_summary":
        return [
          { month: "Jan", expenses: 45000, budget: 50000 },
          { month: "Feb", expenses: 52000, budget: 50000 },
          { month: "Mar", expenses: 38000, budget: 50000 },
          { month: "Apr", expenses: 61000, budget: 50000 },
          { month: "May", expenses: 45000, budget: 50000 },
          { month: "Jun", expenses: 48000, budget: 50000 },
        ];
      case "category_wise":
        return [
          { name: "Maintenance", value: 125000 },
          { name: "Utilities", value: 89000 },
          { name: "Supplies", value: 56000 },
          { name: "Transport", value: 42000 },
          { name: "Events", value: 38000 },
        ];
      case "vendor_wise":
        return [
          { vendor: "ABC Supplies", amount: 85000, invoices: 12 },
          { vendor: "XYZ Services", amount: 72000, invoices: 8 },
          { vendor: "Local Vendor", amount: 54000, invoices: 15 },
          { vendor: "Others", amount: 89000, invoices: 22 },
        ];
      case "cash_vs_bank":
        return [
          { type: "Cash", amount: 125000, percentage: 35 },
          { type: "Bank Transfer", amount: 98000, percentage: 28 },
          { type: "UPI", amount: 89000, percentage: 25 },
          { type: "Card", amount: 38000, percentage: 12 },
        ];
      case "pending_approval":
        return [
          { category: "Maintenance", amount: 45000, count: 5 },
          { category: "Supplies", amount: 28000, count: 3 },
          { category: "Events", amount: 18000, count: 2 },
        ];
      case "budget_vs_actual":
        return [
          { name: "Maintenance", budgeted: 100000, actual: 95000 },
          { name: "Utilities", budgeted: 80000, actual: 89000 },
          { name: "Supplies", budgeted: 50000, actual: 48000 },
          { name: "Transport", budgeted: 60000, actual: 62000 },
        ];
      case "department_wise":
        return [
          { department: "Administration", amount: 125000 },
          { department: "Academic", amount: 98000 },
          { department: "Sports", amount: 54000 },
          { department: "Infrastructure", amount: 89000 },
        ];
      default:
        return [];
    }
  };

  const handleExportPDF = () => {
    alert("PDF export functionality to be implemented");
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const csv = [
      [reportData.title],
      [`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`],
      [],
      ...reportData.data.map((row) => [
        Object.keys(row).map((key) => `"${row[key]}"`).join(","),
      ]),
    ]
      .map((row) => (Array.isArray(row) ? row.join(",") : row))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReport}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const renderChart = () => {
    if (["monthly_summary", "budget_vs_actual"].includes(selectedReport)) {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={reportData?.data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={selectedReport === "budget_vs_actual" ? "name" : "month"} />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }}
              formatter={(value: number) => fmt(value)}
            />
            <Legend />
            {selectedReport === "monthly_summary" ? (
              <>
                <Bar dataKey="expenses" fill="#0891b2" name="Expenses" />
                <Bar dataKey="budget" fill="#cffafe" name="Budget" />
              </>
            ) : (
              <>
                <Bar dataKey="budgeted" fill="#0891b2" name="Budgeted" />
                <Bar dataKey="actual" fill="#f59e0b" name="Actual" />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (
      ["category_wise", "vendor_wise", "cash_vs_bank", "department_wise"].includes(
        selectedReport
      )
    ) {
      const pieData = reportData?.data.map((item) => ({
        name: item.name || item.vendor || item.type || item.department,
        value: item.value || item.amount,
      })) || [];

      return (
        <ResponsiveContainer width="100%" height={400}>
          <RePieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${fmt(value)}`}
              outerRadius={100}
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
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expense Reports</h1>
          <p className="text-slate-600 mt-1">Generate and download detailed expense reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => (
          <button
            key={report.value}
            onClick={() => setSelectedReport(report.value)}
            className={`p-4 rounded-lg border-2 transition text-left ${
              selectedReport === report.value
                ? "border-teal-500 bg-teal-50"
                : "border-slate-200 hover:border-teal-300"
            }`}
          >
            <p className="font-bold text-slate-900">{report.label}</p>
            <p className="text-sm text-slate-600">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : reportData ? (
        <>
          {/* Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{reportData.title}</h2>
            {renderChart()}
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {reportData.data[0] &&
                      Object.keys(reportData.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left font-semibold text-slate-900"
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      {Object.values(row).map((value: any, vidx) => (
                        <td key={vidx} className="px-6 py-3 text-slate-900">
                          {typeof value === "number" && !value.toString().includes(".")
                            ? fmt(value)
                            : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No data available for selected report</p>
          </div>
        </div>
      )}
    </div>
  );
}
