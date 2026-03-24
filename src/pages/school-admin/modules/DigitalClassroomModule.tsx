import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, ChevronDown } from "lucide-react";

type Staff = {
  _id: string;
  name: string;
  email: string;
  position: string;
};

type Student = {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  phone?: string;
  class: string;
};

type Class = {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  classTeacher?: {
    _id: string;
    name: string;
    email: string;
    position: string;
  };
  studentCount: number;
  academicYear?: string;
  description?: string;
  meetLink?: string;
};

type ClassDetails = {
  class: Class;
  students: Student[];
  studentCount: number;
};

export default function DigitalClassroomModule() {
  const [classList, setClassList] = useState<Class[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [classDetails, setClassDetails] = useState<Record<string, ClassDetails>>({});

  const [formData, setFormData] = useState({
    name: "",
    section: "",
    stream: "",
    classTeacher: "",
    academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    description: "",
    meetLink: "",
  });

  useEffect(() => {
    fetchClasses();
    fetchStaff();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setClassList([]);
        return;
      }

      const res = await fetch(`http://localhost:5000/api/classes/${school._id}`);

      if (!res.ok) {
        throw new Error(`Failed to load classes (${res.status})`);
      }

      const data = await res.json();
      setClassList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch classes error:", err);
      setClassList([]);
      setError(err instanceof Error ? err.message : "Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) return;

      const res = await fetch(`http://localhost:5000/api/staff/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load staff (${res.status})`);
      }

      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch staff error:", err);
      setStaffList([]);
    }
  };

  const fetchClassDetails = async (classId: string, className: string) => {
    try {
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) return;

      const res = await fetch(
        `http://localhost:5000/api/classes/${school._id}/${className}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load class details (${res.status})`);
      }

      const data = await res.json();
      setClassDetails((current) => ({ ...current, [classId]: data }));
    } catch (err) {
      console.error("Fetch class details error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) return;

      const url = editingClass
        ? `http://localhost:5000/api/classes/${editingClass._id}`
        : "http://localhost:5000/api/classes";

      const method = editingClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, schoolId: school._id }),
      });

      if (res.ok) {
        await fetchClasses();
        resetForm();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Failed to save class");
      }
    } catch (err) {
      console.error("Save class error:", err);
      alert("Error saving class");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete class ${name}?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/classes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchClasses();
        setClassDetails((current) => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
        if (expandedClass === id) {
          setExpandedClass(null);
        }
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Failed to delete class");
      }
    } catch (err) {
      console.error("Delete class error:", err);
      alert("Error deleting class");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      section: "",
      stream: "",
      classTeacher: "",
      academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      description: "",
      meetLink: "",
    });
    setShowAddForm(false);
    setEditingClass(null);
  };

  const startEdit = (cls: Class) => {
    setFormData({
      name: cls.name,
      section: cls.section || "",
      stream: cls.stream || "",
      classTeacher: cls.classTeacher?._id || "",
      academicYear: cls.academicYear || "",
      description: cls.description || "",
      meetLink: cls.meetLink || "",
    });
    setEditingClass(cls);
    setShowAddForm(true);
  };

  const toggleClassDetails = (classId: string, className: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      if (!classDetails[classId]) {
        fetchClassDetails(classId, className);
      }
    }
  };

  const teacherOptions = staffList.filter((staff) => staff.position === "Teacher");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Digital Classroom Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingClass ? "Edit Class" : "Add New Class"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                >
                  <option value="">Select Class</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={`Class ${num}`}>
                      Class {num}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.section}
                  onChange={(e) =>
                    setFormData({ ...formData, section: e.target.value })
                  }
                >
                  <option value="">Select Section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stream
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.stream}
                  onChange={(e) =>
                    setFormData({ ...formData, stream: e.target.value })
                  }
                >
                  <option value="">Select Stream</option>
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Teacher
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.classTeacher}
                  onChange={(e) =>
                    setFormData({ ...formData, classTeacher: e.target.value })
                  }
                >
                  <option value="">Select Class Teacher</option>
                  {teacherOptions.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} - {staff.position}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2024-2025"
                  className="border rounded p-2 w-full"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Meet Link
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="border rounded p-2 w-full"
                value={formData.meetLink}
                onChange={(e) =>
                  setFormData({ ...formData, meetLink: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Additional notes about the class..."
                className="border rounded p-2 w-full"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                {editingClass ? "Update" : "Add"} Class
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

      {/* Classes Grid */}
      {loading ? (
        <p className="text-center text-gray-500">Loading classes...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : classList.length === 0 ? (
        <p className="text-center text-gray-500">No classes found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classList.map((cls) => (
            <div key={cls._id} className="stat-card p-6 space-y-4">
              {/* Class Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{cls.name}</h3>
                  {cls.section && (
                    <p className="text-sm text-gray-600">Section: {cls.section}</p>
                  )}
                  {cls.stream && (
                    <p className="text-sm text-gray-600">Stream: {cls.stream}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(cls)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls._id, cls.name)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Google Meet Link */}
              {cls.meetLink && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600 mb-1">Google Meet:</p>
                  <a
                    href={cls.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                  >
                    {cls.meetLink}
                  </a>
                </div>
              )}

              {/* Class Teacher */}
              {cls.classTeacher && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600 mb-1">Class Teacher</p>
                  <p className="font-medium">{cls.classTeacher.name}</p>
                  <p className="text-xs text-gray-500">{cls.classTeacher.email}</p>
                </div>
              )}

              {/* Student Count */}
              <div className="border-t pt-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {cls.studentCount} Students
                  </span>
                </div>
              </div>

              {/* Academic Year */}
              {cls.academicYear && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600">
                    Academic Year: {cls.academicYear}
                  </p>
                </div>
              )}

              {/* Expand Details Button */}
              <button
                onClick={() => toggleClassDetails(cls._id, cls.name)}
                className="w-full border-t pt-3 flex items-center justify-between text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <span>
                  {expandedClass === cls._id ? "Hide" : "View"} Details
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition ${
                    expandedClass === cls._id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Class Details (Expanded) */}
              {expandedClass === cls._id && classDetails[cls._id] && (
                <div className="border-t pt-3 space-y-2">
                  <h4 className="font-semibold text-sm">Students:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {classDetails[cls._id].students.length > 0 ? (
                      classDetails[cls._id].students.map(
                        (student: Student, idx: number) => (
                          <div
                            key={idx}
                            className="bg-gray-50 p-2 rounded text-sm"
                          >
                            <p className="font-medium">
                              {student.rollNumber}. {student.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {student.email}
                            </p>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-sm text-gray-500">
                        No students in this class yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {classList.length > 0 && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">Classroom Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold">{classList.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold">
                {classList.reduce((sum, cls) => sum + cls.studentCount, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Classes with Teachers</p>
              <p className="text-2xl font-bold">
                {classList.filter((cls) => cls.classTeacher).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Classes with Meet Links</p>
              <p className="text-2xl font-bold">
                {classList.filter((cls) => cls.meetLink).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
