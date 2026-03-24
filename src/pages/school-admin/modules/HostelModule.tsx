import { useEffect, useState } from "react";
import { Building, Edit, Home, Users } from "lucide-react";

type Student = {
  _id: string;
  name: string;
  class: string;
  rollNumber: string;
};

type Hostel = {
  _id: string;
  name: string;
  assignedStudents: Student[];
};

type HostelForm = {
  hostelId: string;
  hostelName: string;
  assignedStudents: string[];
};

export default function HostelModule() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [editingHostel, setEditingHostel] = useState<HostelForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHostelData();
  }, []);

  const fetchHostelData = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setHostels([]);
        setStudents([]);
        return;
      }

      const [hostelRes, studentRes] = await Promise.all([
        fetch(`http://localhost:5000/api/hostels/${school._id}`),
        fetch(`http://localhost:5000/api/students/${school._id}`),
      ]);

      if (!hostelRes.ok || !studentRes.ok) {
        throw new Error(`Failed to load hostel data (${hostelRes.status}/${studentRes.status})`);
      }

      const hostelData = await hostelRes.json();
      const studentData = await studentRes.json();

      setHostels(Array.isArray(hostelData) ? hostelData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
    } catch (err) {
      console.error("Hostel fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load hostel data");
      setHostels([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (hostel: Hostel) => {
    setEditingHostel({
      hostelId: hostel._id,
      hostelName: hostel.name,
      assignedStudents: hostel.assignedStudents.map((student) => student._id),
    });
  };

  const toggleStudent = (studentId: string) => {
    if (!editingHostel) {
      return;
    }

    setEditingHostel({
      ...editingHostel,
      assignedStudents: editingHostel.assignedStudents.includes(studentId)
        ? editingHostel.assignedStudents.filter((id) => id !== studentId)
        : [...editingHostel.assignedStudents, studentId],
    });
  };

  const studentHostelMap = hostels.reduce((acc, hostel) => {
    hostel.assignedStudents.forEach((student) => {
      acc[student._id] = hostel.name;
    });
    return acc;
  }, {} as Record<string, string>);

  const assignmentCards = hostels.flatMap((hostel) =>
    hostel.assignedStudents.map((student) => ({
      id: `${hostel._id}-${student._id}`,
      hostelName: hostel.name,
      student,
    }))
  );

  const saveAssignments = async () => {
    if (!editingHostel) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch(
        `http://localhost:5000/api/hostels/${editingHostel.hostelId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedStudents: editingHostel.assignedStudents,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save hostel assignments");
      }

      setEditingHostel(null);
      await fetchHostelData();
    } catch (err) {
      console.error("Hostel save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save hostel assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {editingHostel && (
        <div className="stat-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">
                Assign Students to {editingHostel.hostelName}
              </h3>
            </div>
            <button
              onClick={() => setEditingHostel(null)}
              className="text-sm text-gray-500"
            >
              Close
            </button>
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto border rounded p-3">
            {students.length === 0 ? (
              <p className="text-sm text-gray-500">No students available.</p>
            ) : (
              students.map((student) => {
                const assignedHostel = studentHostelMap[student._id];
                const isAssignedElsewhere =
                  assignedHostel && assignedHostel !== editingHostel.hostelName;
                const isSelected = editingHostel.assignedStudents.includes(student._id);

                return (
                  <label
                    key={student._id}
                    className={`flex items-center gap-2 text-sm ${
                      isAssignedElsewhere ? "opacity-60" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={Boolean(isAssignedElsewhere)}
                      onChange={() => toggleStudent(student._id)}
                    />
                    <span>
                      {student.name} ({student.class} - {student.rollNumber})
                      {isAssignedElsewhere ? ` - Already in ${assignedHostel}` : ""}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={saveAssignments}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : "Save Assignments"}
            </button>
            <button
              onClick={() => setEditingHostel(null)}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading hostels...</p>
      ) : hostels.length === 0 ? (
        <p className="text-center text-gray-500">No hostels found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {hostels.map((hostel) => (
            <div key={hostel._id} className="stat-card p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold">{hostel.name}</h3>
                    <p className="text-sm text-gray-500">Default Hostel</p>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(hostel)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit assignments"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-blue-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-700">
                    Assigned Students
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {hostel.assignedStudents.length}
                </p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {hostel.assignedStudents.length === 0 ? (
                  <p className="text-sm text-gray-500">No students assigned yet.</p>
                ) : (
                  hostel.assignedStudents.map((student) => (
                    <div key={student._id} className="bg-gray-50 rounded p-2 text-sm">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-gray-500">
                        {student.class} - Roll {student.rollNumber}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Student Hostel Assignments</h3>
          </div>

          {assignmentCards.length === 0 ? (
            <p className="text-sm text-gray-500">No student hostel assignments yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {assignmentCards.map((assignment) => (
                <div key={assignment.id} className="stat-card p-4 space-y-2">
                  <p className="text-xs text-gray-500">Student</p>
                  <p className="font-semibold">{assignment.student.name}</p>
                  <p className="text-sm text-gray-500">
                    {assignment.student.class} - Roll {assignment.student.rollNumber}
                  </p>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">Hostel</p>
                    <p className="font-medium text-blue-700">{assignment.hostelName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
