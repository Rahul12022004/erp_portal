import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

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

      const res = await fetch(`http://localhost:5000/api/staff/${school._id}`);
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
        ? `http://localhost:5000/api/staff/${editingStaff._id}`
        : "http://localhost:5000/api/staff";

      const method = editingStaff ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submitData, schoolId: school._id }),
      });

      if (res.ok) {
        await fetchStaff();
        resetForm();
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
      const res = await fetch(`http://localhost:5000/api/staff/${id}`, {
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
    });
    setShowAddForm(false);
    setEditingStaff(null);
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
                <input
                  type="text"
                  placeholder="Department (e.g., Science, Math)"
                  className="border rounded p-2"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
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
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Status</th>
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
                    <td className="p-2">{staff.email}</td>
                    <td className="p-2">{staff.phone}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(staff.status)}`}>
                        {staff.status}
                      </span>
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

    </div>
  );
}
