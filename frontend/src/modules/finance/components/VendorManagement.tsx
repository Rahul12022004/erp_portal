import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  AlertCircle,
  Loader,
  Eye,
  Star,
  Search,
  Filter,
  ChevronRight,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type Vendor = {
  _id: string;
  name: string;
  vendorCode: string;
  contactPerson?: string;
  contactNumber: string;
  email: string;
  address?: string;
  city?: string;
  gstNumber?: string;
  panNumber?: string;
  totalSpent: number;
  outstandingAmount: number;
  paymentTerms?: string;
  rating: number;
  status: "active" | "inactive" | "blacklisted";
  serviceType: string[];
};

type FormData = {
  name: string;
  vendorCode: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  address: string;
  city: string;
  gstNumber: string;
  panNumber: string;
  paymentTerms: string;
  serviceType: string[];
  status: "active" | "inactive" | "blacklisted";
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    vendorCode: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    address: "",
    city: "",
    gstNumber: "",
    panNumber: "",
    paymentTerms: "",
    serviceType: [],
    status: "active",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    filterVendors();
  }, [vendors, searchQuery, statusFilter]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/expenses/vendors/list`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setVendors(data.vendors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    if (searchQuery) {
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    setFilteredVendors(filtered);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceTypeChange = (serviceType: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceType: prev.serviceType.includes(serviceType)
        ? prev.serviceType.filter((s) => s !== serviceType)
        : [...prev.serviceType, serviceType],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.contactNumber || !formData.email) {
      setError("Name, Contact Number, and Email are required");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/expenses/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      setSuccess("Vendor created successfully!");
      resetForm();
      await fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vendor");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      vendorCode: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      address: "",
      city: "",
      gstNumber: "",
      panNumber: "",
      paymentTerms: "",
      serviceType: [],
      status: "active",
    });
    setShowForm(false);
  };

  const statusStyles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-50 text-slate-700 border-slate-200",
    blacklisted: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vendor Management</h1>
          <p className="text-slate-600 mt-1">Manage vendors and payees for expenses</p>
        </div>
        <button
          onClick={() => (!showForm ? setShowForm(true) : resetForm())}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Vendor"}
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
          <AlertCircle className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">New Vendor</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., ABC Supplies Ltd."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vendor Code</label>
                <input
                  type="text"
                  name="vendorCode"
                  value={formData.vendorCode}
                  onChange={handleInputChange}
                  placeholder="e.g., VEN001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Name of contact person"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="City"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">GST Number</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 27AABCR5055K1Z0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Full address"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service Type(s)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "Maintenance",
                  "Supplies",
                  "Repairs",
                  "Transport",
                  "Utilities",
                  "Cleaning",
                ].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.serviceType.includes(type)}
                      onChange={() => handleServiceTypeChange(type)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms</label>
                <input
                  type="text"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  placeholder="e.g., Net 30"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
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
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium"
              >
                Create Vendor
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

      {/* Search and Filter */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-teal-500">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name, email, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No vendors found</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor._id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{vendor.name}</h3>
                  {vendor.vendorCode && (
                    <p className="text-xs text-slate-500">{vendor.vendorCode}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded border ${
                    statusStyles[vendor.status]
                  }`}
                >
                  {vendor.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {vendor.contactNumber && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    {vendor.contactNumber}
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                    <Mail className="w-4 h-4" />
                    {vendor.email}
                  </div>
                )}
                {vendor.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    {vendor.city}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 p-2 bg-slate-50 rounded border border-slate-200">
                <div>
                  <p className="text-xs text-slate-600">Total Spent</p>
                  <p className="font-bold text-slate-900 text-sm">{fmt(vendor.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Outstanding</p>
                  <p className="font-bold text-slate-900 text-sm">{fmt(vendor.outstandingAmount)}</p>
                </div>
              </div>

              {vendor.rating > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < vendor.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-slate-600 ml-1">{vendor.rating}/5</span>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition flex items-center justify-center gap-1">
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition flex items-center justify-center gap-1">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
