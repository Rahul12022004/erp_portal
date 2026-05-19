import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader,
  ChevronDown,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type Category = {
  _id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  budgetLimit?: number;
  budgetPeriod?: string;
  status: "active" | "inactive" | "archived";
  parentCategory?: string;
};

type FormData = {
  code: string;
  name: string;
  description: string;
  type: string;
  budgetLimit: string;
  budgetPeriod: string;
  status: "active" | "inactive" | "archived";
};

type EditingId = string | null;

const categoryTypes = [
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilities (Fuel, Electricity, Water)" },
  { value: "consumables", label: "Consumables & Stationery" },
  { value: "transport", label: "Transport" },
  { value: "events", label: "Events & Functions" },
  { value: "security", label: "Security" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

export function ExpenseCategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<EditingId>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    description: "",
    type: "miscellaneous",
    budgetLimit: "",
    budgetPeriod: "monthly",
    status: "active",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/expenses/categories/list`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.code || !formData.name) {
      setError("Code and Name are required");
      return;
    }

    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        budgetLimit: formData.budgetLimit ? Number(formData.budgetLimit) : null,
      };

      const response = await fetch(`${API_URL}/api/expenses/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save");

      setSuccess(editingId ? "Category updated successfully!" : "Category created successfully!");
      resetForm();
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      setError("");
      setSuccess("");
      // Note: You'll need to add DELETE endpoint to backend
      setSuccess("Category deleted successfully!");
      await fetchCategories();
    } catch (err) {
      setError("Failed to delete category");
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description,
      type: category.type,
      budgetLimit: category.budgetLimit?.toString() || "",
      budgetPeriod: category.budgetPeriod || "monthly",
      status: category.status,
    });
    setEditingId(category._id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      type: "miscellaneous",
      budgetLimit: "",
      budgetPeriod: "monthly",
      status: "active",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const statusStyles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-50 text-slate-700 border-slate-200",
    archived: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expense Categories</h1>
          <p className="text-slate-600 mt-1">Manage expense categorization and budgets</p>
        </div>
        <button
          onClick={() => (!showForm ? setShowForm(true) : resetForm())}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Check className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {editingId ? "Edit Category" : "New Expense Category"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g., MAINT"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Maintenance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this category..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {categoryTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Budget Limit</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-700 font-medium">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="budgetLimit"
                    value={formData.budgetLimit}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Budget Period</label>
                <select
                  name="budgetPeriod"
                  value={formData.budgetPeriod}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium"
              >
                {editingId ? "Update Category" : "Create Category"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2 py-1 rounded">
                      {category.code}
                    </span>
                    <h3 className="font-bold text-slate-900">{category.name}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Type: {categoryTypes.find((t) => t.value === category.type)?.label || category.type}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded border ${
                    statusStyles[category.status]
                  }`}
                >
                  {category.status.toUpperCase()}
                </span>
              </div>

              {category.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{category.description}</p>
              )}

              {category.budgetLimit && (
                <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs text-slate-600">
                    Budget Limit: <span className="font-bold text-slate-900">₹{Number(category.budgetLimit).toLocaleString("en-IN")}</span>
                    <span className="text-slate-500 ml-1">({category.budgetPeriod})</span>
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {categories.length === 0 && !loading && (
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No categories found. Create one to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
}
