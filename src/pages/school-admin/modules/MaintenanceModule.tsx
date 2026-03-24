<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MaintenanceModule() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">

        {/* FILTER SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tech1">Technician 1</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="block1">Block 1</SelectItem>
            </SelectContent>
          </Select>

          <Button>Search</Button>
        </div>

        {/* TICKETS TABLE */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Ref</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Assign Supervisor</th>
                <th className="p-3 text-left">Assign Technician</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3">1001</td>
                <td className="p-3">Electrical</td>
                <td className="p-3">Admin</td>

                <td className="p-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sup1">Supervisor 1</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech1">Technician 1</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-3">Pending</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ADD SUPERVISOR */}
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Add Supervisor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="Supervisor Name" />
            <Input placeholder="Mobile Number" />
            <Input placeholder="Password" type="password" />
          </div>
          <Button>Add Supervisor</Button>
        </div>

        {/* ADD TECHNICIAN */}
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Add Technician</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="Technician Name" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electrical">Electrical</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Mobile Number" />
          </div>
          <Button>Add Technician</Button>
        </div>

      </CardContent>
    </Card>
  );
}
=======
import { useEffect, useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowForm((current) => !current)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {showForm ? "Close Form" : "Add Maintenance"}
        </button>
      </div>

      {showForm && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">Add Maintenance Record</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Complaint / Maintenance Title"
                className="border rounded p-2"
                value={formData.title}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, title: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Location"
                className="border rounded p-2"
                value={formData.location}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, location: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Raised By"
                className="border rounded p-2"
                value={formData.raisedBy}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, raisedBy: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Technician Name"
                className="border rounded p-2"
                value={formData.technician}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, technician: e.target.value }))
                }
                required
              />
              <input
                type="date"
                className="border rounded p-2"
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
              className="border rounded p-2 w-full"
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
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Record"}
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

      {loading ? (
        <p className="text-center text-gray-500">Loading maintenance records...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : records.length === 0 ? (
        <p className="text-center text-gray-500">No maintenance records yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {records.map((record) => (
            <div key={record._id} className="stat-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{record.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {record.maintenanceDate}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(record._id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete maintenance record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{record.location}</span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Work Done
                </p>
                <p className="mt-1 text-sm">{record.workDone}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Raised By
                  </p>
                  <p className="mt-1 text-sm font-medium inline-flex items-center gap-2">
                    <UserRound className="w-4 h-4" />
                    {record.raisedBy}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Technician
                  </p>
                  <p className="mt-1 text-sm font-medium inline-flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
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
>>>>>>> 0bc2111 (Added academics module changes)
