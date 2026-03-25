import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Bus, Edit, Trash2, Users, FileText, X, ExternalLink } from "lucide-react";

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ||
  "https://your-backend-url.com";

const API_ENDPOINTS = {
  TRANSPORT: `${API_BASE_URL}/api/transport`,
  STUDENTS: (schoolId: string) => `${API_BASE_URL}/api/students/${schoolId}`,
};

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
  driverPhone: string;
  driverLicenseNumber: string;
  driverLicensePhoto?: string;
  conductorName: string;
  conductorPhone?: string;
  conductorInfo?: string;
  routeStops?: string[];
  assignedStudents: Student[];
};

type TransportForm = {
  busNumber: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  driverLicenseNumber: string;
  driverLicensePhoto: string;
  conductorName: string;
  conductorPhone: string;
  conductorInfo: string;
  routeStops: string[];
  assignedStudents: string[];
};

const emptyForm: TransportForm = {
  busNumber: "",
  routeName: "",
  driverName: "",
  driverPhone: "",
  driverLicenseNumber: "",
  driverLicensePhoto: "",
  conductorName: "",
  conductorPhone: "",
  conductorInfo: "",
  routeStops: [],
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
  const [routeStopInput, setRouteStopInput] = useState("");
  const [viewLicence, setViewLicence] = useState<string | null>(null);

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
        fetch(`${API_ENDPOINTS.TRANSPORT}/${school._id}`),
        fetch(API_ENDPOINTS.STUDENTS(school._id)),
      ]);

      if (!busRes.ok || !studentRes.ok) {
        throw new Error(`Failed to load transport data (${busRes.status}/${studentRes.status})`);
      }

      const busData: TransportBus[] = await busRes.json();
      const studentData: Array<Student & { needsTransport?: boolean }> = await studentRes.json();

      setBuses(Array.isArray(busData) ? busData : []);
      // Only show students who requested transport
      setStudents(Array.isArray(studentData) ? studentData.filter((s) => s.needsTransport) : []);
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
          ? `${API_ENDPOINTS.TRANSPORT}/${editingBusId}`
          : API_ENDPOINTS.TRANSPORT,
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
      driverPhone: bus.driverPhone || "",
      driverLicenseNumber: bus.driverLicenseNumber || "",
      driverLicensePhoto: bus.driverLicensePhoto || "",
      conductorName: bus.conductorName,
      conductorPhone: bus.conductorPhone || "",
      conductorInfo: bus.conductorInfo || "",
      routeStops: Array.isArray(bus.routeStops) ? bus.routeStops : [],
      assignedStudents: bus.assignedStudents.map((student) => student._id),
    });
  };

  const handleDriverLicensePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = typeof reader.result === "string" ? reader.result : "";
      setFormData((current) => ({ ...current, driverLicensePhoto: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const addRouteStop = () => {
    const stop = routeStopInput.trim();
    if (!stop) return;

    setFormData((current) => {
      if (current.routeStops.some((item) => item.toLowerCase() === stop.toLowerCase())) {
        return current;
      }
      return { ...current, routeStops: [...current.routeStops, stop] };
    });
    setRouteStopInput("");
  };

  const removeRouteStop = (stop: string) => {
    setFormData((current) => ({
      ...current,
      routeStops: current.routeStops.filter((item) => item !== stop),
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bus?")) return;

    try {
      const res = await fetch(`${API_ENDPOINTS.TRANSPORT}/${id}`, {
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
              type="tel"
              placeholder="Driver Phone Number"
              className="border rounded p-2"
              value={formData.driverPhone}
              onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Driver Driving Licence Number"
              className="border rounded p-2"
              value={formData.driverLicenseNumber}
              onChange={(e) =>
                setFormData({ ...formData, driverLicenseNumber: e.target.value })
              }
              required
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Driver Licence (Photo or PDF)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="border rounded p-2 w-full"
                onChange={handleDriverLicensePhotoUpload}
              />
              {formData.driverLicensePhoto && (
                formData.driverLicensePhoto.startsWith("data:application/pdf") ? (
                  <div className="flex items-center gap-2 rounded border bg-red-50 px-3 py-2">
                    <FileText className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-700 flex-1">PDF uploaded</span>
                    <button
                      type="button"
                      onClick={() => setViewLicence(formData.driverLicensePhoto)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Preview
                    </button>
                  </div>
                ) : (
                  <img
                    src={formData.driverLicensePhoto}
                    alt="Driver licence"
                    className="h-20 w-full rounded border object-cover"
                  />
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Conductor Name"
              className="border rounded p-2"
              value={formData.conductorName}
              onChange={(e) => setFormData({ ...formData, conductorName: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Conductor Phone Number"
              className="border rounded p-2"
              value={formData.conductorPhone}
              onChange={(e) => setFormData({ ...formData, conductorPhone: e.target.value })}
            />
            <input
              type="text"
              placeholder="Conductor Info (ID/Notes)"
              className="border rounded p-2"
              value={formData.conductorInfo}
              onChange={(e) => setFormData({ ...formData, conductorInfo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">Route Stops</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add stop name"
                className="border rounded p-2 w-full"
                value={routeStopInput}
                onChange={(e) => setRouteStopInput(e.target.value)}
              />
              <button
                type="button"
                onClick={addRouteStop}
                className="bg-blue-100 text-blue-700 px-3 rounded"
              >
                Add Stop
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.routeStops.length === 0 ? (
                <p className="text-sm text-gray-500">No stops added yet.</p>
              ) : (
                formData.routeStops.map((stop) => (
                  <span
                    key={stop}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm"
                  >
                    {stop}
                    <button
                      type="button"
                      onClick={() => removeRouteStop(stop)}
                      className="text-red-600"
                      title="Remove stop"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
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

              <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
                <p>
                  <span className="font-medium">Driver:</span> {bus.driverName}
                </p>
                <p>
                  <span className="font-medium">Driver Phone:</span> {bus.driverPhone || "-"}
                </p>
                <p>
                  <span className="font-medium">Driver Licence:</span> {bus.driverLicenseNumber || "-"}
                </p>
                <p>
                  <span className="font-medium">Route Stops:</span>{" "}
                  {bus.routeStops?.length ? bus.routeStops.join(", ") : "-"}
                </p>
                <p>
                  <span className="font-medium">Conductor:</span> {bus.conductorName}
                </p>
                <p>
                  <span className="font-medium">Conductor Phone:</span> {bus.conductorPhone || "-"}
                </p>
                <p>
                  <span className="font-medium">Conductor Info:</span> {bus.conductorInfo || "-"}
                </p>
              </div>

              {bus.driverLicensePhoto && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Driver Licence</p>
                  {bus.driverLicensePhoto.startsWith("data:application/pdf") ? (
                    <button
                      type="button"
                      onClick={() => setViewLicence(bus.driverLicensePhoto!)}
                      className="flex w-full items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                    >
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="flex-1 text-left">View Licence PDF</span>
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="relative">
                      <img
                        src={bus.driverLicensePhoto}
                        alt="Driver licence"
                        className="h-28 w-full cursor-pointer rounded object-cover hover:opacity-90"
                        onClick={() => setViewLicence(bus.driverLicensePhoto!)}
                        title="Click to view full size"
                      />
                      <button
                        type="button"
                        onClick={() => setViewLicence(bus.driverLicensePhoto!)}
                        className="absolute bottom-1 right-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
                      >
                        View Full
                      </button>
                    </div>
                  )}
                </div>
              )}

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

      {/* Licence Viewer Modal */}
      {viewLicence && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewLicence(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold text-sm">Driver Licence</p>
              <div className="flex items-center gap-2">
                <a
                  href={viewLicence}
                  download="driver-licence"
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Download
                </a>
                <button
                  onClick={() => setViewLicence(null)}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-auto">
              {viewLicence.startsWith("data:application/pdf") ? (
                <iframe
                  src={viewLicence}
                  className="h-[75vh] w-full border-0"
                  title="Driver Licence PDF"
                />
              ) : (
                <img
                  src={viewLicence}
                  alt="Driver licence"
                  className="w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
