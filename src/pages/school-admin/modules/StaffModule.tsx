import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, FileText, X, ExternalLink } from "lucide-react";

type Staff = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department?: string;
  qualification?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  joinDate?: string;
  status: "Active" | "Inactive" | "On Leave";
  ossId?: string;
  workHistoryDoc?: string;
  offerLetterDoc?: string;
  identityDoc?: string;
};

export default function StaffModule() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("All");
  const [staffType, setStaffType] = useState<"teachers" | "staff">("teachers"); // ✅ Added
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [viewDocStaff, setViewDocStaff] = useState<Staff | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    qualification: "",
    address: "",
    dateOfBirth: "",
    gender: "",
    joinDate: "",
    status: "Active",
    ossId: "",
    workHistoryDoc: "",
    offerLetterDoc: "",
    identityDoc: "",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError("");
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setStaffList([]);
        return;
      }

      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/staff/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load staff (${res.status})`);
      }

      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch staff error:", err);
      setStaffList([]);
      setError(err instanceof Error ? err.message : "Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) return;

      // Set position to "Teacher" if adding teacher
      const submitData = {
        ...formData,
        position: staffType === "teachers" ? "Teacher" : formData.position,
      };

      const url = editingStaff
        ? `https://erp-portal-1-ftwe.onrender.com/api/staff/${editingStaff._id}`
        : "https://erp-portal-1-ftwe.onrender.com/api/staff";

      const method = editingStaff ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitData, schoolId: school._id }),
      });

      if (res.ok) {
        await fetchStaff();
        resetForm();
        // Show success message
        if (staffType === "teachers" && !editingStaff) {
          alert(`✓ Teacher created successfully!\nLogin credentials have been sent to ${formData.email}`);
        } else {
          alert("Staff member saved successfully!");
        }
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Failed to save staff");
      }
    } catch (err) {
      console.error("Save staff error:", err);
      alert("Error saving staff");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/staff/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchStaff();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Failed to delete staff");
      }
    } catch (err) {
      console.error("Delete staff error:", err);
      alert("Error deleting staff");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      qualification: "",
      address: "",
      dateOfBirth: "",
      gender: "",
      joinDate: "",
      status: "Active",
      ossId: "",
      workHistoryDoc: "",
      offerLetterDoc: "",
      identityDoc: "",
    });
    setShowAddForm(false);
    setEditingStaff(null);
  };

  const handleFileUpload = (field: "workHistoryDoc" | "offerLetterDoc" | "identityDoc") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = typeof reader.result === "string" ? reader.result : "";
        setFormData((prev) => ({ ...prev, [field]: base64 }));
      };
      reader.readAsDataURL(file);
    };

  const startEdit = (staff: Staff) => {
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      position: staff.position,
      department: staff.department || "",
      qualification: staff.qualification || "",
      address: staff.address || "",
      dateOfBirth: staff.dateOfBirth || "",
      gender: staff.gender || "",
      joinDate: staff.joinDate || "",
      status: staff.status,
      ossId: staff.ossId || "",
      workHistoryDoc: staff.workHistoryDoc || "",
      offerLetterDoc: staff.offerLetterDoc || "",
      identityDoc: staff.identityDoc || "",
    });
    setEditingStaff(staff);
    setShowAddForm(true);
  };

  // Get unique positions based on selected type
  const getPositions = () => {
    if (staffType === "teachers") {
      return ["Teacher"];
    }
    return Array.from(new Set(staffList.filter(s => s.position !== "Teacher").map(s => s.position)));
  };

  const positions = getPositions();

  // Filter staff based on type (teachers or other staff)
  const typeFilteredStaff = staffType === "teachers"
    ? staffList.filter(s => s.position === "Teacher")
    : staffList.filter(s => s.position !== "Teacher");

  // Filter staff based on search and position
  const filteredStaff = typeFilteredStaff.filter(staff =>
    (selectedPosition === "All" || staff.position === selectedPosition) &&
    (staff.name.toLowerCase().includes(search.toLowerCase()) ||
      staff.email.toLowerCase().includes(search.toLowerCase()) ||
      staff.position.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-red-100 text-red-800";
      case "On Leave":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => {
            setStaffType("teachers");
            setSelectedPosition("All");
            setSearch("");
          }}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            staffType === "teachers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Manage Teachers
        </button>
        <button
          onClick={() => {
            setStaffType("staff");
            setSelectedPosition("All");
            setSearch("");
          }}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            staffType === "staff"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Manage Staff
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {staffType === "teachers" ? "Teachers Management" : "Staff Management"}
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add {staffType === "teachers" ? "Teacher" : "Staff"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            placeholder={`Search ${staffType === "teachers" ? "teachers" : "staff"}...`}
            className="border p-2 w-full rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {staffType === "staff" && positions.length > 0 && (
          <select
            className="border p-2 rounded"
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
          >
            <option value="All">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingStaff 
              ? `Edit ${staffType === "teachers" ? "Teacher" : "Staff Member"}` 
              : `Add New ${staffType === "teachers" ? "Teacher" : "Staff Member"}`}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                className="border rounded p-2"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="border rounded p-2"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                className="border rounded p-2"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
              {staffType === "teachers" ? (
                <>
                  <input
                    type="text"
                    placeholder="Department (e.g., Science, Math)"
                    className="border rounded p-2"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="CBSE OSS ID"
                    className="border rounded p-2"
                    value={formData.ossId}
                    onChange={(e) => setFormData({...formData, ossId: e.target.value})}
                  />
                </>
              ) : (
                <input
                  type="text"
                  placeholder="Position (e.g., Principal, HOD, Librarian)"
                  className="border rounded p-2"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  required
                />
              )}
              <input
                type="text"
                placeholder="Qualification"
                className="border rounded p-2"
                value={formData.qualification}
                onChange={(e) => setFormData({...formData, qualification: e.target.value})}
              />
              <input
                type="date"
                placeholder="Date of Birth"
                className="border rounded p-2"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
              />
              <input
                type="date"
                placeholder="Join Date"
                className="border rounded p-2"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
              />
              <select
                className="border rounded p-2"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <select
                className="border rounded p-2"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
            <textarea
              placeholder="Address"
              className="border rounded p-2 w-full"
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />

            {/* Documents Section */}
            <div className="rounded-lg border p-4 space-y-4">
              <p className="font-medium text-sm">Documents</p>

              {/* Work History — both teacher & staff */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Past Working History Document (PDF / Image)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="border rounded p-2 w-full text-sm"
                  onChange={handleFileUpload("workHistoryDoc")}
                />
                {formData.workHistoryDoc && (
                  <div className="flex items-center gap-2 rounded bg-green-50 px-3 py-1.5 text-sm text-green-700">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">Work history document uploaded</span>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, workHistoryDoc: "" }))}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Offer Letter — teachers only */}
              {staffType === "teachers" && (
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Previous School Offer Letter (PDF / Image)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="border rounded p-2 w-full text-sm"
                    onChange={handleFileUpload("offerLetterDoc")}
                  />
                  {formData.offerLetterDoc && (
                    <div className="flex items-center gap-2 rounded bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1">Offer letter uploaded</span>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, offerLetterDoc: "" }))}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Identity Proof — both teacher & staff */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Aadhaar Card / Identity Proof (PDF / Image)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="border rounded p-2 w-full text-sm"
                  onChange={handleFileUpload("identityDoc")}
                />
                {formData.identityDoc && (
                  <div className="flex items-center gap-2 rounded bg-orange-50 px-3 py-1.5 text-sm text-orange-700">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">Identity proof uploaded</span>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, identityDoc: "" }))}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                {editingStaff ? "Update" : "Add"} {staffType === "teachers" ? "Teacher" : "Staff"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List */}
      {loading ? (
        <p className="text-center text-gray-500">Loading staff...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : filteredStaff.length === 0 ? (
        <p className="text-center text-gray-500">No staff found.</p>
      ) : (
        <div className="stat-card p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Name</th>
                  {staffType === "teachers" ? (
                    <th className="text-left p-2">Department</th>
                  ) : (
                    <th className="text-left p-2">Position</th>
                  )}
                  {staffType === "teachers" && (
                    <th className="text-left p-2">OSS ID</th>
                  )}
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Docs</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff._id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{staff.name}</td>
                    <td className="p-2">
                      {staffType === "teachers" ? (staff.department || "-") : staff.position}
                    </td>
                    {staffType === "teachers" && (
                      <td className="p-2 text-xs text-gray-600">{staff.ossId || "-"}</td>
                    )}
                    <td className="p-2">{staff.email}</td>
                    <td className="p-2">{staff.phone}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(staff.status)}`}>
                        {staff.status}
                      </span>
                    </td>
                    <td className="p-2">
                      {(staff.workHistoryDoc || staff.offerLetterDoc || staff.identityDoc) ? (
                        <button
                          onClick={() => setViewDocStaff(staff)}
                          className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                          title="View documents"
                        >
                          <FileText className="w-3 h-3" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(staff)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(staff._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && typeFilteredStaff.length > 0 && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {staffType === "teachers" ? "Teachers" : "Staff"} Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{typeFilteredStaff.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {typeFilteredStaff.filter(s => s.status === "Active").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">On Leave</p>
              <p className="text-2xl font-bold text-yellow-600">
                {typeFilteredStaff.filter(s => s.status === "On Leave").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">
                {typeFilteredStaff.filter(s => s.status === "Inactive").length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDocStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewDocStaff(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold">{viewDocStaff.name} — Documents</p>
              <button
                onClick={() => setViewDocStaff(null)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto divide-y">
              {viewDocStaff.workHistoryDoc && (
                <DocViewer
                  label="Past Working History"
                  data={viewDocStaff.workHistoryDoc}
                  fileName="work-history"
                />
              )}
              {viewDocStaff.offerLetterDoc && (
                <DocViewer
                  label="Previous School Offer Letter"
                  data={viewDocStaff.offerLetterDoc}
                  fileName="offer-letter"
                />
              )}
              {viewDocStaff.identityDoc && (
                <DocViewer
                  label="Aadhaar / Identity Proof"
                  data={viewDocStaff.identityDoc}
                  fileName="identity-proof"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocViewer({ label, data, fileName }: { label: string; data: string; fileName: string }) {
  const isPdf = data.startsWith("data:application/pdf");
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{label}</p>
        <a
          href={data}
          download={fileName}
          className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          <ExternalLink className="h-3 w-3" />
          Download
        </a>
      </div>
      {isPdf ? (
        <iframe src={data} className="h-[60vh] w-full rounded border-0" title={label} />
      ) : (
        <img src={data} alt={label} className="w-full rounded object-contain max-h-[60vh]" />
      )}
    </div>
  );
}
