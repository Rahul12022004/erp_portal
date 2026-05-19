import { useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Tag,
  Users,
  CheckSquare,
  BarChart2,
  FileText,
  Shield,
} from "lucide-react";
import { ExpenseDashboard } from "./ExpenseDashboard";
import { AddExpenseForm } from "./AddExpenseForm";
import { ExpenseList } from "./ExpenseList";
import { ExpenseCategoryManagement } from "./ExpenseCategoryManagement";
import { VendorManagement } from "./VendorManagement";
import { ExpenseApprovalWorkflow } from "./ExpenseApprovalWorkflow";
import { BudgetMonitoring } from "./BudgetMonitoring";
import { ExpenseReports } from "./ExpenseReports";
import { ExpenseAuditLog } from "./ExpenseAuditLog";

type ExpenseTab =
  | "dashboard"
  | "add"
  | "list"
  | "categories"
  | "vendors"
  | "approval"
  | "budget"
  | "reports"
  | "audit";

const TABS: { id: ExpenseTab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "add", label: "Add Expense", icon: PlusCircle },
  { id: "list", label: "Expense List", icon: List },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "vendors", label: "Vendors", icon: Users },
  { id: "approval", label: "Approval", icon: CheckSquare },
  { id: "budget", label: "Budget", icon: BarChart2 },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "audit", label: "Audit Log", icon: Shield },
];

export default function ExpenseModule() {
  const [activeTab, setActiveTab] = useState<ExpenseTab>("dashboard");

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "dashboard" && <ExpenseDashboard />}
        {activeTab === "add" && (
          <AddExpenseForm
            onSuccess={() => setActiveTab("list")}
            onCancel={() => setActiveTab("list")}
          />
        )}
        {activeTab === "list" && <ExpenseList />}
        {activeTab === "categories" && <ExpenseCategoryManagement />}
        {activeTab === "vendors" && <VendorManagement />}
        {activeTab === "approval" && <ExpenseApprovalWorkflow />}
        {activeTab === "budget" && <BudgetMonitoring />}
        {activeTab === "reports" && <ExpenseReports />}
        {activeTab === "audit" && <ExpenseAuditLog />}
      </div>
    </div>
  );
}
