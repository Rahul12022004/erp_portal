import { useState } from "react";
import { Upload, X, AlertCircle, CheckCircle2, Save } from "lucide-react";
import { API_URL } from "@/lib/api";

type FormData = {
  expenseDate: string;
  title: string;
  description: string;
  notes: string;
  categoryId: string;
  subcategory: string;
  department: string;
  expenseType: "operational" | "capital" | "maintenance" | "event";
  amount: string;
  paymentMode: "cash" | "bank_transfer" | "upi" | "credit_card" | "cheque";
  transactionReferenceNumber: string;
  billNumber: string;
  vendorName: string;
  vendorId: string;
  isRecurring: boolean;
  recurringFrequency?: "weekly" | "monthly" | "quarterly" | "annual";
  recurringEndDate?: string;
};

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function AddExpenseForm({ onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState<FormData>({
    expenseDate: new Date().toISOString().split("T")[0],
    title: "",
    description: "",
    notes: "",
    categoryId: "",
    subcategory: "",
    department: "",
    expenseType: "operational",
    amount: "",
    paymentMode: "cash",
    transactionReferenceNumber: "",
    billNumber: "",
    vendorName: "",
    vendorId: "",
    isRecurring: false,
  });

  const [receipts, setReceipts] = useState<File[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReceipts([...receipts, ...files]);
  };

  const removeReceipt = (index: number) => {
    setReceipts(receipts.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate
    if (!formData.title || !formData.categoryId || !formData.amount || !formData.paymentMode) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, String(value));
        }
      });

      receipts.forEach((file) => {
        formDataToSend.append("receipts", file);
      });

      const response = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("Failed to create expense");

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <h2 className="text-xl font-bold text-slate-900">Add New Expense</h2>
        <p className="text-sm text-slate-600 mt-1">Record a new school expense with full documentation</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">Expense created successfully!</p>
          </div>
        )}

        {/* Row 1: Date, Title, Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expenseDate"
              value={formData.expenseDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Office Supplies Purchase"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Select Category</option>
              <option value="maintenance">Maintenance</option>
              <option value="utilities">Utilities (Fuel, Electricity, Water)</option>
              <option value="stationery">Stationery & Supplies</option>
              <option value="transport">Transport</option>
              <option value="events">Events & Functions</option>
              <option value="security">Security</option>
              <option value="lab">Lab Expenses</option>
              <option value="cleaning">Cleaning & Housekeeping</option>
              <option value="miscellaneous">Miscellaneous</option>
            </select>
          </div>
        </div>

        {/* Row 2: Subcategory, Department, Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subcategory</label>
            <input
              type="text"
              name="subcategory"
              value={formData.subcategory}
              onChange={handleInputChange}
              placeholder="e.g., Electrical"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-500 mt-1">Optional sub-classification</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              placeholder="e.g., Administration"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <select
              name="expenseType"
              value={formData.expenseType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="operational">Operational</option>
              <option value="capital">Capital</option>
              <option value="maintenance">Maintenance</option>
              <option value="event">Event</option>
            </select>
          </div>
        </div>

        {/* Row 3: Amount, Payment Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-700 font-medium">
                ₹
              </span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="credit_card">Credit Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        {/* Row 4: Transaction Ref, Bill Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Reference Number</label>
            <input
              type="text"
              name="transactionReferenceNumber"
              value={formData.transactionReferenceNumber}
              onChange={handleInputChange}
              placeholder="e.g., TXN123456"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-500 mt-1">UPI/Bank reference or Check number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bill / Invoice Number</label>
            <input
              type="text"
              name="billNumber"
              value={formData.billNumber}
              onChange={handleInputChange}
              placeholder="e.g., BILL-2024-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Row 5: Vendor Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Vendor / Payee Name</label>
          <input
            type="text"
            name="vendorName"
            value={formData.vendorName}
            onChange={handleInputChange}
            placeholder="e.g., ABC Supplies Ltd."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Row 6: Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide details about the expense..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {/* Row 7: Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Additional remarks or notes..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {/* Row 8: Receipt Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Receipt / Invoice Upload</label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-teal-500 hover:bg-teal-50 transition cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-500">Supported: PNG, JPG, PDF (Max 10MB per file)</p>
            </label>
          </div>

          {receipts.length > 0 && (
            <div className="mt-3 space-y-2">
              {receipts.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-sm text-slate-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeReceipt(idx)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recurring Expense */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleInputChange}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-slate-700">This is a recurring expense</span>
          </label>

          {formData.isRecurring && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                <select
                  name="recurringFrequency"
                  value={formData.recurringFrequency || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Frequency</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  name="recurringEndDate"
                  value={formData.recurringEndDate || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Save className="w-4 h-4" />
            {loading ? "Creating..." : "Save Expense"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
