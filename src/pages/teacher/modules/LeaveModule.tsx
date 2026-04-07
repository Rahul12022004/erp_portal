import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";

type LeaveApplication = {
  _id: string;
  title: string;
  description: string;
  leaveType: "Paid" | "Unpaid" | "Emergency";
  fileName?: string;
  fileData?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const statusClasses: Record<LeaveApplication["status"], string> = {
  Approved: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function LeaveModule() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveApplication["leaveType"]>("Paid");
  const [file, setFile] = useState<File | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

    setSchoolId(school?._id || "");
    setTeacherId(teacher?._id || "");
  }, []);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!schoolId || !teacherId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/leaves/${schoolId}/${teacherId}`);

        if (!res.ok) {
          throw new Error(`Failed to load leaves (${res.status})`);
        }

        const data = await res.json();
        setLeaves(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Leave fetch error:", err);
        setLeaves([]);
        setError(
          err instanceof Error ? err.message : "Failed to load leave applications"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [schoolId, teacherId]);

  const handleApply = async () => {
    if (!title.trim() || !description.trim() || !leaveType || !schoolId || !teacherId) {
      alert("Title, description and leave type are required");
      return;
    }

    try {
      setSaving(true);

      const fileData = file ? await readFileAsDataUrl(file) : "";

      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          leaveType,
          fileName: file?.name || "",
          fileData,
          teacherId,
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to submit leave application");
      }

      setLeaves((current) => [data.data, ...current]);
      setTitle("");
      setDescription("");
      setLeaveType("Paid");
      setFile(null);
      setShowForm(false);
    } catch (err) {
      console.error("Leave apply error:", err);
      alert(err instanceof Error ? err.message : "Failed to submit leave application");
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = leaves.filter((leave) => leave.status === "Pending").length;
  const approvedCount = leaves.filter((leave) => leave.status === "Approved").length;
  const rejectedCount = leaves.filter((leave) => leave.status === "Rejected").length;
  const unpaidUsed = leaves.filter(
    (leave) => leave.leaveType === "Unpaid" && leave.status !== "Rejected"
  ).length;
  const emergencyUsed = leaves.filter(
    (leave) => leave.leaveType === "Emergency" && leave.status !== "Rejected"
  ).length;
  const paidUsed = leaves.filter((leave) => leave.leaveType === "Paid").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Apply Leave
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Pending</p>
          <h3 className="text-2xl font-semibold text-yellow-600">{pendingCount}</h3>
        </div>
        <div className="stat-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Approved</p>
          <h3 className="text-2xl font-semibold text-green-600">{approvedCount}</h3>
        </div>
        <div className="stat-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <h3 className="text-2xl font-semibold text-red-600">{rejectedCount}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Unpaid Leave Used</p>
          <h3 className="text-2xl font-semibold">{unpaidUsed}/4</h3>
        </div>
        <div className="stat-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Emergency Leave Used</p>
          <h3 className="text-2xl font-semibold">{emergencyUsed}/3</h3>
        </div>
        <div className="stat-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Paid Leave Applied</p>
          <h3 className="text-2xl font-semibold">{paidUsed}</h3>
        </div>
      </div>

      {showForm && (
        <div className="stat-card p-4 space-y-4">
          <h3 className="font-semibold">Apply for Leave</h3>

          <input
            type="text"
            placeholder="Leave Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg w-full"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg w-full"
            rows={4}
          />

          <select
            value={leaveType}
            onChange={(e) =>
              setLeaveType(e.target.value as LeaveApplication["leaveType"])
            }
            className="px-3 py-2 bg-muted rounded-lg w-full"
          >
            <option value="Paid">Paid Leave</option>
            <option value="Unpaid">Unpaid Leave</option>
            <option value="Emergency">Emergency Leave</option>
          </select>

          <label className="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
            <span className="text-sm text-gray-600">
              {file ? file.name : "Click to upload supporting document"}
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <button
            onClick={handleApply}
            className="px-4 py-2 bg-primary text-white rounded-lg"
            disabled={saving}
          >
            {saving ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}

      <div className="stat-card overflow-x-auto">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Leave Applications</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Only 4 unpaid leaves and 3 emergency leaves are allowed. All other leave applications should use paid leave.
          </p>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading leave applications...</p>
        ) : error ? (
          <p className="p-4 text-sm text-red-600">{error}</p>
        ) : leaves.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No leave applications yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">File</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Applied On</th>
              </tr>
            </thead>

            <tbody>
              {leaves.map((leave) => (
                <tr key={leave._id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{leave.title}</td>
                  <td className="p-3">{leave.description}</td>
                  <td className="p-3">{leave.leaveType}</td>
                  <td className="p-3">
                    {leave.fileData ? (
                      <a
                        href={leave.fileData}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {leave.fileName || "View File"}
                      </a>
                    ) : (
                      "No file"
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${statusClasses[leave.status]}`}
                    >
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {new Date(leave.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
