import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

/* ================= TYPES ================= */

type Student = {
  _id: string;
  name: string;
  class: string;
};

type Staff = {
  _id: string;
  name: string;
  position: string;
};

type StudentFeeSummary = {
  financeId?: string | null;
  student?: Student;
  studentId?: Student;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  status: "pending" | "partial" | "paid" | "overdue";
  dueDate?: string | null;
};

type StaffSalarySummary = {
  financeId?: string | null;
  staff?: Staff;
  staffId?: Staff;
  salary: number;
  paidAmount: number;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentDate?: string | null;
  academicYear?: string | null;
};

type SalaryFormState = {
  mode: "set" | "pay";
  financeId: string | null;
  staffId: string;
  staffName: string;
  amount: string;
  paidAmount: string;
  paymentDate: string;
  academicYear: string;
  description: string;
};

/* ================= COMPONENT ================= */

export default function FinanceModule() {
  const [activeTab, setActiveTab] = useState<"student" | "staff">("student");

  const [studentFees, setStudentFees] = useState<StudentFeeSummary[]>([]);
  const [staffSalaries, setStaffSalaries] = useState<StaffSalarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState<SalaryFormState | null>(null);
  const [savingSalary, setSavingSalary] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const school = JSON.parse(localStorage.getItem("school") || "null");
      if (!school || !school._id) {
        setError("School ID not found in localStorage");
        setStudentFees([]);
        setStaffSalaries([]);
        return;
      }

      const [s1, s2] = await Promise.all([
        fetch(`http://localhost:5000/api/finance/${school._id}/students/summary`),
        fetch(`http://localhost:5000/api/finance/${school._id}/staff/summary`),
      ]);

      if (!s1.ok || !s2.ok) {
        throw new Error(
          `Failed loading finance summaries (${s1.status} / ${s2.status})`
        );
      }

      const studentData = (await s1.json()) as StudentFeeSummary[];
      const staffData = (await s2.json()) as StaffSalarySummary[];

      setStudentFees(Array.isArray(studentData) ? studentData : []);
      setStaffSalaries(Array.isArray(staffData) ? staffData : []);
    } catch (err) {
      console.error("FinanceModule fetch error", err);
      setError(err instanceof Error ? err.message : String(err));
      setStudentFees([]);
      setStaffSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SELECT ================= */

  const isStudent = activeTab === "student";
  const list = isStudent ? studentFees : staffSalaries;

  /* ================= CALCULATIONS ================= */

  const total = isStudent
    ? studentFees.reduce((sum, item) => sum + item.totalFee, 0)
    : staffSalaries.reduce((sum, item) => sum + item.salary, 0);

  const paid = isStudent
    ? studentFees.reduce((sum, item) => sum + item.paidAmount, 0)
    : staffSalaries.reduce((sum, item) => sum + item.paidAmount, 0);

  const due = total - paid;

  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  };

  const openSalaryForm = (
    item: StaffSalarySummary,
    mode: "set" | "pay"
  ) => {
    const staffMember = item.staff || item.staffId;

    if (!staffMember) {
      return;
    }

    const remainingAmount = Math.max(item.salary - item.paidAmount, 0);

    setSalaryForm({
      mode,
      financeId: item.financeId || null,
      staffId: staffMember._id,
      staffName: staffMember.name,
      amount: String(item.salary || ""),
      paidAmount:
        mode === "pay"
          ? String(remainingAmount || item.salary || "")
          : String(item.paidAmount || ""),
      paymentDate: new Date().toISOString().split("T")[0],
      academicYear: item.academicYear || getDefaultAcademicYear(),
      description:
        mode === "pay"
          ? `Salary payment for ${staffMember.name}`
          : `Salary setup for ${staffMember.name}`,
    });
  };

  const submitSalaryForm = async () => {
    if (!salaryForm) {
      return;
    }

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const amount = Number(salaryForm.amount);
    const paidAmount = Number(salaryForm.paidAmount);

    if (!amount || amount <= 0) {
      setError("Enter a valid salary amount");
      return;
    }

    if (paidAmount < 0) {
      setError("Paid amount cannot be negative");
      return;
    }

    const status =
      paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "pending";

    const payload = {
      type: "staff_salary",
      staffId: salaryForm.staffId,
      amount,
      paidAmount,
      paymentDate: salaryForm.paymentDate,
      status,
      description: salaryForm.description,
      academicYear: salaryForm.academicYear,
      schoolId: school._id,
    };

    try {
      setSavingSalary(true);
      setError(null);

      const res = await fetch(
        salaryForm.financeId
          ? `http://localhost:5000/api/finance/${salaryForm.financeId}`
          : "http://localhost:5000/api/finance",
        {
          method: salaryForm.financeId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save salary details");
      }

      await fetchData();
      setSalaryForm(null);
    } catch (err) {
      console.error("FinanceModule salary save error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSalary(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* TOGGLE */}
      <div className="border-b flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("student")}
          className={`pb-2 ${
            activeTab === "student"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
        >
          Students Finance
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-2 ${
            activeTab === "staff"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
        >
          Staff Finance
        </button>
      </div>

      {/* TITLE */}
      <h2 className="text-xl font-semibold">
        {isStudent ? "Students Finance" : "Staff Finance"}
      </h2>

      {!isStudent && salaryForm && (
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {salaryForm.mode === "pay" ? "Pay Salary" : "Set Salary"} for{" "}
              {salaryForm.staffName}
            </h3>
            <button
              onClick={() => setSalaryForm(null)}
              className="text-sm text-gray-500"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              min="0"
              placeholder="Salary Amount"
              className="border rounded p-2"
              value={salaryForm.amount}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, amount: e.target.value })
              }
            />
            <input
              type="number"
              min="0"
              placeholder="Paid Amount"
              className="border rounded p-2"
              value={salaryForm.paidAmount}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, paidAmount: e.target.value })
              }
            />
            <input
              type="date"
              className="border rounded p-2"
              value={salaryForm.paymentDate}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, paymentDate: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Academic Year"
              className="border rounded p-2"
              value={salaryForm.academicYear}
              onChange={(e) =>
                setSalaryForm({ ...salaryForm, academicYear: e.target.value })
              }
            />
          </div>

          <textarea
            placeholder="Description"
            className="border rounded p-2 w-full"
            rows={3}
            value={salaryForm.description}
            onChange={(e) =>
              setSalaryForm({ ...salaryForm, description: e.target.value })
            }
          />

          <div className="flex gap-2">
            <button
              onClick={submitSalaryForm}
              disabled={savingSalary}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {savingSalary
                ? "Saving..."
                : salaryForm.mode === "pay"
                ? "Pay Salary"
                : "Save Salary"}
            </button>
            <button
              onClick={() => setSalaryForm(null)}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 bg-white rounded-xl shadow text-center">
          Loading finance summary...
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 rounded-xl shadow text-center text-red-600">
          Error loading data: {error}
        </div>
      ) : (
        <>
          {/* STATS */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-xl font-bold">{total}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-green-600">Paid</p>
          <p className="text-xl font-bold text-green-600">{paid}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-red-600">Due</p>
          <p className="text-xl font-bold text-red-600">{due}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-yellow-600">Records</p>
          <p className="text-xl font-bold text-yellow-600">{list.length}</p>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-3 gap-4">
        {list.map((item) => {
          if (isStudent) {
            const s = item as StudentFeeSummary;
            const name =
              s.student?.name || s.studentId?.name || "No Name";

            return (
              <div key={name} className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold">{name}</h3>

                <p>Total: ₹{s.totalFee}</p>
                <p className="text-green-600">Paid: ₹{s.paidAmount}</p>
                <p className="text-red-600">Due: ₹{s.remainingAmount}</p>
                <p className="text-sm text-gray-500">
                  Last Date: {s.dueDate || "-"}
                </p>

                <div className="text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                  {s.status.toUpperCase()}
                </div>

                <button className="mt-3 w-full bg-yellow-500 text-white py-1 rounded flex justify-center gap-1">
                  <Bell className="w-4 h-4" /> Notify
                </button>
              </div>
            );
          } else {
            const s = item as StaffSalarySummary;
            const name =
              s.staff?.name || s.staffId?.name || "No Name";

            const dueValue = s.salary - s.paidAmount;

            return (
              <div key={name} className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold">{name}</h3>

                <p>Total: ₹{s.salary}</p>
                <p className="text-green-600">Paid: ₹{s.paidAmount}</p>
                <p className="text-red-600">Due: ₹{dueValue}</p>
                <p className="text-sm text-gray-500">
                  Payment Date: {s.paymentDate || "-"}
                </p>

                <div className="text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                  {s.status.toUpperCase()}
                </div>

                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => openSalaryForm(s, "set")}
                    className="w-full bg-blue-600 text-white py-1 rounded"
                  >
                    Set Salary
                  </button>
                  <button
                    onClick={() => openSalaryForm(s, "pay")}
                    className="w-full bg-green-600 text-white py-1 rounded"
                  >
                    Pay Salary
                  </button>
                  <button className="w-full bg-yellow-500 text-white py-1 rounded flex justify-center gap-1">
                    <Bell className="w-4 h-4" /> Notify
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>
    </>
  )}
</div>
  );
}
