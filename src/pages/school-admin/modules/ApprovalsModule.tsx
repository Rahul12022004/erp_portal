import { useEffect, useState } from "react";
import { Check, FileText, X } from "lucide-react";

type TeacherInfo = {
  _id: string;
  name: string;
  email: string;
  position: string;
};

type LeaveApplication = {
  _id: string;
  title: string;
  description: string;
  leaveType: "Paid" | "Unpaid" | "Emergency";
  fileName?: string;
  fileData?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  teacherId?: TeacherInfo;
};

const statusClasses: Record<LeaveApplication["status"], string> = {
  Approved: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function ApprovalsModule() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaves = async () => {
      const school = JSON.parse(localStorage.getItem("school") || "null");

      if (!school?._id) {
        setError("School not found. Please log in again.");
        setLeaves([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/leaves/school/${school._id}`);

        if (!res.ok) {
          throw new Error(`Failed to load approvals (${res.status})`);
        }

        const data = await res.json();
        setLeaves(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Approval leaves fetch error:", err);
        setLeaves([]);
        setError(err instanceof Error ? err.message : "Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  const updateLeaveStatus = async (
    leaveId: string,
    status: LeaveApplication["status"]
  ) => {
    try {
      setUpdatingId(leaveId);
      setError("");

      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/leaves/${leaveId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update status");
      }

      setLeaves((current) =>
        current.map((leave) =>
          leave._id === leaveId ? { ...leave, status: data.data.status } : leave
        )
      );
    } catch (err) {
      console.error("Approval status update error:", err);
      setError(err instanceof Error ? err.message : "Failed to update leave");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = leaves.filter((leave) => leave.status === "Pending").length;
  const approvedCount = leaves.filter((leave) => leave.status === "Approved").length;
  const rejectedCount = leaves.filter((leave) => leave.status === "Rejected").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="stat-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Teacher Leave Approvals</h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading leave requests...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : leaves.length === 0 ? (
          <p className="text-sm text-gray-500">No teacher leave requests yet.</p>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div
                key={leave._id}
                className="space-y-4 rounded-xl border border-border bg-muted/20 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{leave.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {leave.description}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-2 py-1 text-xs ${statusClasses[leave.status]}`}
                  >
                    {leave.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Teacher</p>
                    <p className="font-medium">{leave.teacherId?.name || "Unknown Teacher"}</p>
                    <p className="text-xs text-muted-foreground">
                      {leave.teacherId?.email || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Leave Type</p>
                    <p className="font-medium">{leave.leaveType}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied on {new Date(leave.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    {leave.fileData ? (
                      <a
                        href={leave.fileData}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {leave.fileName || "View Attachment"}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No attachment</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateLeaveStatus(leave._id, "Approved")}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                      disabled={updatingId === leave._id || leave.status === "Approved"}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateLeaveStatus(leave._id, "Rejected")}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                      disabled={updatingId === leave._id || leave.status === "Rejected"}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
