import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { API_URL } from "@/lib/api";

type EarningComponent = {
  label: string;
  amount: number;
};

type DeductionComponent = {
  label: string;
  type: "percentage" | "amount";
  value: number;
};

type SalaryStructure = {
  _id: string;
  structureName: string;
  position: string;
  earnings: EarningComponent[];
  deductions: DeductionComponent[];
  presentDays: number;
  absentDays: number;
  status: "Active" | "Inactive";
  createdAt?: string;
};

type StaffMember = {
  _id: string;
  name: string;
  position: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  panNumber?: string;
};

export default function SalaryStructureModule() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<Partial<SalaryStructure>>({
    structureName: "",
    position: "",
    earnings: [],
    deductions: [],
    presentDays: 0,
    absentDays: 0,
    status: "Active",
  });

  const [earningInput, setEarningInput] = useState({ label: "", amount: "" });
  const [deductionInput, setDeductionInput] = useState({ label: "", type: "percentage", value: "" });

  const school = useMemo(() => JSON.parse(localStorage.getItem("school") || "{}"), []);
  const schoolId = school?._id || "";
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    if (schoolId) {
      fetchStructures();
      fetchStaff();
    }
  }, [schoolId]);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/salary-structures/${schoolId}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed to load structures (${res.status})`);
      const data = await res.json();
      setStructures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch structures");
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff/${schoolId}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed to load staff (${res.status})`);
      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch staff error:", err);
      setStaffList([]);
    }
  };

  const filteredStructures = useMemo(() => {
    const query = search.toLowerCase();
    return structures.filter(
      (s) =>
        s.structureName.toLowerCase().includes(query) ||
        s.position.toLowerCase().includes(query)
    );
  }, [structures, search]);

  const handleAddEarning = () => {
    if (!earningInput.label.trim() || !earningInput.amount) {
      alert("Please enter both label and amount");
      return;
    }
    const earnings = formData.earnings || [];
    setFormData({
      ...formData,
      earnings: [...earnings, { label: earningInput.label, amount: Number(earningInput.amount) }],
    });
    setEarningInput({ label: "", amount: "" });
  };

  const handleRemoveEarning = (index: number) => {
    const earnings = formData.earnings || [];
    setFormData({
      ...formData,
      earnings: earnings.filter((_, i) => i !== index),
    });
  };

  const handleAddDeduction = () => {
    if (!deductionInput.label.trim() || deductionInput.value === "") {
      alert("Please enter both label and value");
      return;
    }
    const value = Number(deductionInput.value);
    if (deductionInput.type === "percentage" && (value < 0 || value > 100)) {
      alert("Percentage must be between 0 and 100");
      return;
    }
    if (deductionInput.type === "amount" && value < 0) {
      alert("Amount must be greater than or equal to 0");
      return;
    }
    const deductions = formData.deductions || [];
    setFormData({
      ...formData,
      deductions: [...deductions, { label: deductionInput.label, type: deductionInput.type as "percentage" | "amount", value }],
    });
    setDeductionInput({ label: "", type: "percentage", value: "" });
  };

  const handleRemoveDeduction = (index: number) => {
    const deductions = formData.deductions || [];
    setFormData({
      ...formData,
      deductions: deductions.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.structureName?.trim() || !formData.position?.trim()) {
        alert("Please enter structure name and position");
        return;
      }

      if (!Array.isArray(formData.earnings) || formData.earnings.length === 0) {
        alert("Please add at least one earning component");
        return;
      }

      if (!Array.isArray(formData.deductions) || formData.deductions.length === 0) {
        alert("Please add at least one deduction component");
        return;
      }

      const url = editingId
        ? `${API_URL}/api/salary-structures/${schoolId}/${editingId}`
        : `${API_URL}/api/salary-structures/${schoolId}`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Request failed (${res.status})`);
      }

      setSuccess(editingId ? "Structure updated successfully!" : "Structure created successfully!");
      setTimeout(() => setSuccess(""), 3000);

      resetForm();
      setShowForm(false);
      fetchStructures();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = (structure: SalaryStructure) => {
    setFormData(structure);
    setEditingId(structure._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this structure?")) return;

    try {
      const res = await fetch(`${API_URL}/api/salary-structures/${schoolId}/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
      setSuccess("Structure deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
      fetchStructures();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const resetForm = () => {
    setFormData({
      structureName: "",
      position: "",
      earnings: [],
      deductions: [],
      presentDays: 0,
      absentDays: 0,
      status: "Active",
    });
    setEarningInput({ label: "", amount: "" });
    setDeductionInput({ label: "", type: "percentage", value: "" });
    setEditingId(null);
  };

  const calculateSalary = (structure: SalaryStructure) => {
    const grossSalary = structure.earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalDeductions = structure.deductions.reduce((sum, d) => {
      if (d.type === "percentage") {
        return sum + (grossSalary * d.value) / 100;
      } else {
        return sum + d.value;
      }
    }, 0);
    const netSalary = grossSalary - totalDeductions;
    return { grossSalary, totalDeductions, netSalary };
  };

  const viewingStructure = structures.find((s) => s._id === viewingId);
  const viewingSalary = viewingStructure ? calculateSalary(viewingStructure) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Salary Structures</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          <Plus size={20} /> New Structure
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
          {error}
          <button onClick={() => setError("")} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 text-green-700 rounded-lg border border-green-300">
          {success}
        </div>
      )}

      {/* Form Section */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? "Edit Structure" : "Create New Structure"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Structure Name *</label>
                <input
                  type="text"
                  value={formData.structureName || ""}
                  onChange={(e) => setFormData({ ...formData, structureName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Teacher Salary Structure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Position *</label>
                <input
                  type="text"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Teacher"
                />
              </div>
            </div>

            {/* Earnings Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Earnings (Fixed Amounts)</h3>

              <div className="space-y-3 mb-4">
                {(formData.earnings || []).map((earning, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                    <div>
                      <p className="font-medium">{earning.label}</p>
                      <p className="text-gray-600">₹{earning.amount.toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEarning(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={earningInput.label}
                  onChange={(e) => setEarningInput({ ...earningInput, label: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Component label (e.g., Basic Salary)"
                />
                <input
                  type="number"
                  value={earningInput.amount}
                  onChange={(e) => setEarningInput({ ...earningInput, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Amount (e.g., 50000)"
                  min="0"
                  step="100"
                />
                <button
                  type="button"
                  onClick={handleAddEarning}
                  className="w-full bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200 transition"
                >
                  + Add Earning
                </button>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Deductions (Percentage Based)</h3>

              <div className="space-y-3 mb-4">
                {(formData.deductions || []).map((deduction, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-50 p-3 rounded">
                    <div>
                      <p className="font-medium">{deduction.label}</p>
                      <p className="text-gray-600">
                        {deduction.type === "percentage" ? `${deduction.value}% of Gross Salary` : `₹${deduction.value.toLocaleString()}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={deductionInput.label}
                  onChange={(e) => setDeductionInput({ ...deductionInput, label: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Component label (e.g., Income Tax, Transport Cost)"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={deductionInput.type}
                    onChange={(e) => setDeductionInput({ ...deductionInput, type: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                  <input
                    type="number"
                    value={deductionInput.value}
                    onChange={(e) => setDeductionInput({ ...deductionInput, value: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={deductionInput.type === "percentage" ? "0-100" : "Amount"}
                    min="0"
                    max={deductionInput.type === "percentage" ? "100" : undefined}
                    step={deductionInput.type === "percentage" ? "0.1" : "100"}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddDeduction}
                  className="w-full bg-red-100 text-red-700 py-2 rounded hover:bg-red-200 transition"
                >
                  + Add Deduction
                </button>
              </div>
            </div>

            {/* Attendance Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Attendance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Present Days</label>
                  <input
                    type="number"
                    value={formData.presentDays || 0}
                    onChange={(e) => setFormData({ ...formData, presentDays: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 22"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Absent Days</label>
                  <input
                    type="number"
                    value={formData.absentDays || 0}
                    onChange={(e) => setFormData({ ...formData, absentDays: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 5"
                    min="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition font-medium"
              >
                {editingId ? "Update Structure" : "Create Structure"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Section */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading structures...</div>
      ) : filteredStructures.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            {structures.length === 0 ? "No salary structures yet." : "No results found."}
          </p>
          {structures.length === 0 && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
            >
              Create First Structure
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name or position..."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStructures.map((structure) => {
              const { grossSalary } = calculateSalary(structure);
              return (
                <div key={structure._id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition">
                  <div className="mb-3">
                    <h3 className="font-bold text-lg">{structure.structureName}</h3>
                    <p className="text-sm text-gray-600">{structure.position}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Gross: ₹{grossSalary.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="text-xs text-gray-600">
                      {structure.earnings.length} earning(s) | {structure.deductions.length} deduction(s)
                    </div>
                    <div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          structure.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {structure.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingId(structure._id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition text-sm"
                    >
                      <Eye size={16} /> View
                    </button>
                    <button
                      onClick={() => handleEdit(structure)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200 transition text-sm"
                    >
                      <Edit size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(structure._id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-700 py-2 rounded hover:bg-red-200 transition text-sm"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Viewing Modal */}
      {viewingId && viewingStructure && viewingSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{viewingStructure.structureName}</h2>
              <p className="text-gray-600 mb-6">Position: {viewingStructure.position}</p>

              {/* Staff Member Selector */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium mb-2">Select Staff Member (View Bank Details)</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffList
                    .filter((s) => s.position.toLowerCase() === viewingStructure.position.toLowerCase())
                    .map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Staff Bank Details */}
              {selectedStaffId && staffList.find((s) => s._id === selectedStaffId) && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Bank & Payment Details</h3>
                  {(() => {
                    const selectedStaff = staffList.find((s) => s._id === selectedStaffId);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Account Holder Name</p>
                          <p className="font-semibold text-gray-800">{selectedStaff?.accountHolderName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Bank Name</p>
                          <p className="font-semibold text-gray-800">{selectedStaff?.bankName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Account Number</p>
                          <p className="font-semibold text-gray-800">{selectedStaff?.accountNumber || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">IFSC Code</p>
                          <p className="font-semibold text-gray-800">{selectedStaff?.ifscCode || "N/A"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500 uppercase">PAN Number</p>
                          <p className="font-semibold text-gray-800">{selectedStaff?.panNumber || "N/A"}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Earnings */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Earnings</h3>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border p-2">Component</th>
                      <th className="border p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingStructure.earnings.map((e, i) => (
                      <tr key={i} className="border">
                        <td className="border p-2">{e.label}</td>
                        <td className="border p-2 text-right">₹{e.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-100 font-bold">
                      <td className="border p-2">Gross Salary</td>
                      <td className="border p-2 text-right">₹{viewingSalary.grossSalary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attendance Summary */}
              <div className="mb-8 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Attendance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">Present Days</p>
                    <p className="text-2xl font-bold text-yellow-700">{viewingStructure.presentDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">Absent Days</p>
                    <p className="text-2xl font-bold text-red-700">{viewingStructure.absentDays}</p>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Deductions</h3>
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-red-50">
                      <th className="border p-2">Component</th>
                      <th className="border p-2 text-right">Type</th>
                      <th className="border p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingStructure.deductions.map((d, i) => {
                      let deductionAmount = 0;
                      if (d.type === "percentage") {
                        deductionAmount = (viewingSalary.grossSalary * d.value) / 100;
                      } else {
                        deductionAmount = d.value;
                      }
                      return (
                        <tr key={i} className="border">
                          <td className="border p-2">{d.label}</td>
                          <td className="border p-2 text-right">{d.type === "percentage" ? `${d.value}%` : "Fixed"}</td>
                          <td className="border p-2 text-right">₹{deductionAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-red-100 font-bold">
                      <td className="border p-2" colSpan={2}>
                        Total Deductions
                      </td>
                      <td className="border p-2 text-right">₹{viewingSalary.totalDeductions.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Salary */}
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm mb-1">Net Salary</p>
                <p className="text-3xl font-bold text-green-700">
                  ₹{viewingSalary.netSalary.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleEdit(viewingStructure)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
                >
                  Edit Structure
                </button>
                <button
                  onClick={() => {
                    setViewingId(null);
                    setSelectedStaffId("");
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
