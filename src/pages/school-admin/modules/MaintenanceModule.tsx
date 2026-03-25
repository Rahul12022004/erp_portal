import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Trash2, UserRound, Wrench } from "lucide-react";

type MaintenanceRecord = {
  _id: string;
  title: string;
  location: string;
  workDone: string;
  raisedBy: string;
  technician: string;
  maintenanceDate: string;
};

export default function MaintenanceModule() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    workDone: "",
    raisedBy: "",
    technician: "",
    maintenanceDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchRecords = async () => {
      const school = JSON.parse(localStorage.getItem("school") || "null");

      if (!school?._id) {
        setError("School not found. Please log in again.");
        setRecords([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`http://localhost:5000/api/maintenance/${school._id}`);

        if (!res.ok) {
          throw new Error(`Failed to load maintenance (${res.status})`);
        }

        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Maintenance fetch error:", err);
        setRecords([]);
        setError(err instanceof Error ? err.message : "Failed to load maintenance");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      location: "",
      workDone: "",
      raisedBy: "",
      technician: "",
      maintenanceDate: new Date().toISOString().split("T")[0],
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const school = JSON.parse(localStorage.getItem("school") || "null");

    if (!school?._id) {
      alert("School not found. Please log in again.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("http://localhost:5000/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          schoolId: school._id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to save maintenance record");
      }

      setRecords((current) => [data.data, ...current]);
      resetForm();
    } catch (err) {
      console.error("Maintenance save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save maintenance record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this maintenance record?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/maintenance/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to delete maintenance record");
      }

      setRecords((current) => current.filter((record) => record._id !== id));
    } catch (err) {
      console.error("Maintenance delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete maintenance record");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowForm((current) => !current)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showForm ? "Close Form" : "Add Maintenance"}
        </button>
      </div>

      {showForm && (
        <div className="stat-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Add Maintenance Record</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Complaint / Maintenance Title"
                className="rounded border p-2"
                value={formData.title}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, title: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Location"
                className="rounded border p-2"
                value={formData.location}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, location: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Raised By"
                className="rounded border p-2"
                value={formData.raisedBy}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, raisedBy: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Technician Name"
                className="rounded border p-2"
                value={formData.technician}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, technician: e.target.value }))
                }
                required
              />
              <input
                type="date"
                className="rounded border p-2"
                value={formData.maintenanceDate}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    maintenanceDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <textarea
              placeholder="What maintenance was done?"
              className="w-full rounded border p-2"
              rows={4}
              value={formData.workDone}
              onChange={(e) =>
                setFormData((current) => ({ ...current, workDone: e.target.value }))
              }
              required
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Record"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading maintenance records...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : records.length === 0 ? (
        <p className="text-center text-gray-500">No maintenance records yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <div key={record._id} className="stat-card space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{record.title}</h3>
                  <p className="text-sm text-muted-foreground">{record.maintenanceDate}</p>
                </div>
                <button
                  onClick={() => handleDelete(record._id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete maintenance record"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{record.location}</span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Work Done
                </p>
                <p className="mt-1 text-sm">{record.workDone}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Raised By
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                    <UserRound className="h-4 w-4" />
                    {record.raisedBy}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Technician
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                    <Wrench className="h-4 w-4" />
                    {record.technician}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
