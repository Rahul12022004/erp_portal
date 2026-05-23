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
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="tabs-scroll overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-1 rounded-[22px] bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(148,163,184,0.12)] ring-1 ring-slate-200/70">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-[16px] px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-[0_4px_14px_rgba(148,163,184,0.18)] ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800 hover:shadow-sm"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
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
