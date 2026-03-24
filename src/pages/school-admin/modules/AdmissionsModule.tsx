import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

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
  createdAt?: string;
};

type AdmissionForm = {
  name: string;
  email: string;
  class: string;
  rollNumber: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
};

const emptyForm: AdmissionForm = {
  name: "",
  email: "",
  class: "",
  rollNumber: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  gender: "",
};

export default function AdmissionsModule() {
  const [formData, setFormData] = useState<AdmissionForm>(emptyForm);
  const [recentAdmissions, setRecentAdmissions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setRecentAdmissions([]);
        return;
      }

      const res = await fetch(`http://localhost:5000/api/students/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load admissions (${res.status})`);
      }

      const data = await res.json();
      const students = Array.isArray(data) ? data : [];

      setRecentAdmissions(
        [...students]
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 10)
      );
    } catch (err) {
      console.error("Admissions fetch error:", err);
      setRecentAdmissions([]);
      setError(err instanceof Error ? err.message : "Failed to load admissions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch("http://localhost:5000/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          schoolId: school._id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create admission");
      }

      setFormData(emptyForm);
      setSuccess("Student admitted successfully.");
      await fetchAdmissions();
    } catch (err) {
      console.error("Admissions save error:", err);
      setError(err instanceof Error ? err.message : "Failed to create admission");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">New Admission</h3>
        </div>

        {success && <p className="text-green-600 text-sm mb-4">{success}</p>}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              className="border rounded p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="border rounded p-2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Class"
              className="border rounded p-2"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Roll Number"
              className="border rounded p-2"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Phone"
              className="border rounded p-2"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <select
              className="border rounded p-2"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              className="border rounded p-2"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>

          <textarea
            placeholder="Address"
            className="border rounded p-2 w-full"
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {saving ? "Saving..." : "Add Admission"}
          </button>
        </form>
      </div>

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Admissions</h3>

        {loading ? (
          <p className="text-gray-500">Loading admissions...</p>
        ) : recentAdmissions.length === 0 ? (
          <p className="text-gray-500">No admissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">Roll No</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                </tr>
              </thead>
              <tbody>
                {recentAdmissions.map((student) => (
                  <tr key={student._id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{student.name}</td>
                    <td className="p-2">{student.class}</td>
                    <td className="p-2">{student.rollNumber}</td>
                    <td className="p-2">{student.email}</td>
                    <td className="p-2">{student.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
