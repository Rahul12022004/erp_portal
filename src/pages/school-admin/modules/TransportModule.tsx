import { useEffect, useState } from "react";
import { Bus, Edit, Trash2, Users } from "lucide-react";

type Student = {
  _id: string;
  name: string;
  class: string;
  rollNumber: string;
};

type TransportBus = {
  _id: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  conductorName: string;
  pickupTime?: string;
  dropTime?: string;
  assignedStudents: Student[];
};

type TransportForm = {
  busNumber: string;
  routeName: string;
  driverName: string;
  conductorName: string;
  pickupTime: string;
  dropTime: string;
  assignedStudents: string[];
};

const emptyForm: TransportForm = {
  busNumber: "",
  routeName: "",
  driverName: "",
  conductorName: "",
  pickupTime: "",
  dropTime: "",
  assignedStudents: [],
};

export default function TransportModule() {
  const [buses, setBuses] = useState<TransportBus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState<TransportForm>(emptyForm);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTransportData();
  }, []);

  const fetchTransportData = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setBuses([]);
        setStudents([]);
        return;
      }

      const [busRes, studentRes] = await Promise.all([
        fetch(`http://localhost:5000/api/transport/${school._id}`),
        fetch(`http://localhost:5000/api/students/${school._id}`),
      ]);

      if (!busRes.ok || !studentRes.ok) {
        throw new Error(`Failed to load transport data (${busRes.status}/${studentRes.status})`);
      }

      const busData = await busRes.json();
      const studentData = await studentRes.json();

      setBuses(Array.isArray(busData) ? busData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
    } catch (err) {
      console.error("Transport fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load transport data");
      setBuses([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingBusId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch(
        editingBusId
          ? `http://localhost:5000/api/transport/${editingBusId}`
          : "http://localhost:5000/api/transport",
        {
          method: editingBusId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            schoolId: school._id,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save bus");
      }

      resetForm();
      await fetchTransportData();
    } catch (err) {
      console.error("Transport save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save bus");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (bus: TransportBus) => {
    setEditingBusId(bus._id);
    setFormData({
      busNumber: bus.busNumber,
      routeName: bus.routeName,
      driverName: bus.driverName,
      conductorName: bus.conductorName,
      pickupTime: bus.pickupTime || "",
      dropTime: bus.dropTime || "",
      assignedStudents: bus.assignedStudents.map((student) => student._id),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bus?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/transport/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete bus");
      }

      await fetchTransportData();
      if (editingBusId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Transport delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete bus");
    }
  };

  const toggleStudentAssignment = (studentId: string) => {
    setFormData((current) => ({
      ...current,
      assignedStudents: current.assignedStudents.includes(studentId)
        ? current.assignedStudents.filter((id) => id !== studentId)
        : [...current.assignedStudents, studentId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bus className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">
            {editingBusId ? "Edit Bus Assignment" : "Assign Bus To Students"}
          </h3>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Bus Number"
              className="border rounded p-2"
              value={formData.busNumber}
              onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Route Name"
              className="border rounded p-2"
              value={formData.routeName}
              onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Driver Name"
              className="border rounded p-2"
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Conductor Name"
              className="border rounded p-2"
              value={formData.conductorName}
              onChange={(e) => setFormData({ ...formData, conductorName: e.target.value })}
              required
            />
            <input
              type="time"
              className="border rounded p-2"
              value={formData.pickupTime}
              onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
            />
            <input
              type="time"
              className="border rounded p-2"
              value={formData.dropTime}
              onChange={(e) => setFormData({ ...formData, dropTime: e.target.value })}
            />
          </div>

          <div>
            <p className="font-medium mb-2">Assign Students</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded p-3">
              {students.length === 0 ? (
                <p className="text-sm text-gray-500">No students available.</p>
              ) : (
                students.map((student) => (
                  <label
                    key={student._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedStudents.includes(student._id)}
                      onChange={() => toggleStudentAssignment(student._id)}
                    />
                    <span>
                      {student.name} ({student.class} - {student.rollNumber})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : editingBusId ? "Update Bus" : "Add Bus"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading transport data...</p>
      ) : buses.length === 0 ? (
        <p className="text-center text-gray-500">No buses assigned yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {buses.map((bus) => (
            <div key={bus._id} className="stat-card p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{bus.busNumber}</h3>
                  <p className="text-sm text-gray-600">{bus.routeName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(bus)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bus._id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-gray-500">Driver</p>
                  <p className="font-semibold text-blue-700">{bus.driverName}</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3">
                  <p className="text-xs text-gray-500">Conductor</p>
                  <p className="font-semibold text-green-700">{bus.conductorName}</p>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>Pickup: {bus.pickupTime || "-"}</p>
                <p>Drop: {bus.dropTime || "-"}</p>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <p className="font-medium">
                    Assigned Students ({bus.assignedStudents.length})
                  </p>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bus.assignedStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">No students assigned.</p>
                  ) : (
                    bus.assignedStudents.map((student) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
