import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

type Student = {
  _id: string;
  name: string;
  email: string;
  class: string;
  rollNumber: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
};

type SchoolClass = {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  academicYear?: string;
};

const getClassLabel = (schoolClass: Pick<SchoolClass, "name" | "section">) =>
  schoolClass.section ? `${schoolClass.name} - ${schoolClass.section}` : schoolClass.name;

export default function StudentModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    class: "",
    rollNumber: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setStudents([]);
        setClasses([]);
        return;
      }

      const [studentsRes, classesRes] = await Promise.all([
        fetch(`http://localhost:5000/api/students/${school._id}`),
        fetch(`http://localhost:5000/api/classes/${school._id}`),
      ]);

      if (!studentsRes.ok) {
        throw new Error(`Failed to load students (${studentsRes.status})`);
      }

      if (!classesRes.ok) {
        throw new Error(`Failed to load classes (${classesRes.status})`);
      }

      const [studentsData, classesData] = await Promise.all([
        studentsRes.json(),
        classesRes.json(),
      ]);

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (err) {
      console.error("Fetch student module data error:", err);
      setStudents([]);
      setClasses([]);
      setError(err instanceof Error ? err.message : "Failed to fetch student data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) return;

      const url = editingStudent
        ? `http://localhost:5000/api/students/${editingStudent._id}`
        : "http://localhost:5000/api/students";

      const method = editingStudent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, schoolId: school._id }),
      });

      if (res.ok) {
        await fetchData();
        resetForm();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Failed to save student");
      }
    } catch (err) {
      console.error("Save student error:", err);
      alert("Error saving student");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || "Failed to delete student");
      }
    } catch (err) {
      console.error("Delete student error:", err);
      alert("Error deleting student");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      class: "",
      rollNumber: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      gender: "",
    });
    setShowAddForm(false);
    setEditingStudent(null);
  };

  const startEdit = (student: Student) => {
    setFormData({
      name: student.name,
      email: student.email,
      class: student.class,
      rollNumber: student.rollNumber,
      phone: student.phone || "",
      address: student.address || "",
      dateOfBirth: student.dateOfBirth || "",
      gender: student.gender || "",
    });
    setEditingStudent(student);
    setShowAddForm(true);
  };

  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));

  const groupedStudents = sortedClasses.reduce((acc, schoolClass) => {
    const classLabel = getClassLabel(schoolClass);
    acc[classLabel] = students
      .filter((student) => student.class === classLabel)
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    return acc;
  }, {} as Record<string, Student[]>);

  const orphanStudents = students
    .filter((student) => !sortedClasses.some((schoolClass) => getClassLabel(schoolClass) === student.class))
    .sort((a, b) => a.class.localeCompare(b.class) || a.rollNumber.localeCompare(b.rollNumber));

  if (orphanStudents.length > 0) {
    const orphanGroups = orphanStudents.reduce((acc, student) => {
      if (!acc[student.class]) {
        acc[student.class] = [];
      }
      acc[student.class].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    Object.assign(groupedStudents, orphanGroups);
  }

  // Filter students
  const filteredClasses = Object.keys(groupedStudents).filter(cls =>
    selectedClass === "All" || cls === selectedClass
  );

  const filteredStudents = filteredClasses.reduce((acc, cls) => {
    const classStudents = groupedStudents[cls].filter(student =>
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.rollNumber.includes(search) ||
      student.email.toLowerCase().includes(search.toLowerCase())
    );
    if (classStudents.length > 0) {
      acc[cls] = classStudents;
    }
    return acc;
  }, {} as Record<string, Student[]>);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Student Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            placeholder="Search students..."
            className="border p-2 w-full rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border p-2 rounded"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="All">All Classes</option>
          {Object.keys(groupedStudents).map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingStudent ? "Edit Student" : "Add New Student"}
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
              <select
                className="border rounded p-2"
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: e.target.value})}
                required
              >
                <option value="">Select Class</option>
                {sortedClasses.map((schoolClass) => (
                  <option key={schoolClass._id} value={getClassLabel(schoolClass)}>
                    {getClassLabel(schoolClass)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Roll Number"
                className="border rounded p-2"
                value={formData.rollNumber}
                onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                className="border rounded p-2"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
              <input
                type="date"
                placeholder="Date of Birth"
                className="border rounded p-2"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
              />
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
                {editingStudent ? "Update" : "Add"} Student
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

          {sortedClasses.length === 0 && (
            <p className="mt-4 text-sm text-amber-600">
              No classes have been created yet. Create a class first, then add students to it.
            </p>
          )}
        </div>
      )}

      {/* Students by Class */}
      {loading ? (
        <p className="text-center text-gray-500">Loading students...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : Object.keys(groupedStudents).length === 0 ? (
        <p className="text-center text-gray-500">No classes found. Create a class first.</p>
      ) : Object.keys(filteredStudents).length === 0 ? (
        <p className="text-center text-gray-500">No students found for the selected filters.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredStudents).map(([className, classStudents]) => (
            <div key={className} className="stat-card p-6">
              <h3 className="text-xl font-semibold mb-4 text-blue-600">
                {className} ({classStudents.length} students)
              </h3>

              {classStudents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No students are attached to this class yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Roll No</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Gender</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((student) => (
                        <tr key={student._id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{student.rollNumber}</td>
                          <td className="p-2 font-medium">{student.name}</td>
                          <td className="p-2">{student.email}</td>
                          <td className="p-2">{student.phone || "-"}</td>
                          <td className="p-2">{student.gender || "-"}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(student)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(student._id)}
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
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
