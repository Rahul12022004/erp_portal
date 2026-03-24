<<<<<<< HEAD
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ApprovalsModule() {
  const [requests, setRequests] = useState([]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Approvals</h1>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["Total", "Pending", "Approved", "Rejected", "Cancel"].map((item) => (
            <div key={item} className="p-4 bg-muted rounded-xl text-center">
              <p className="text-sm text-muted-foreground">{item}</p>
              <p className="text-xl font-bold">0</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create Request */}
      <Card>
        <CardHeader>
          <CardTitle>Create Request</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4">
          <Select>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Stationary</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger><SelectValue placeholder="Requester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="Amount" />
          <Input placeholder="Description" />

          <Button
            onClick={() => setRequests([...requests, { id: Date.now() }])}
          >
            Submit
          </Button>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r, i) => (
                <div key={r.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <span>Request #{i + 1}</span>
                  <span className="text-sm text-yellow-500">Pending</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
=======
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

        const res = await fetch(`http://localhost:5000/api/leaves/school/${school._id}`);

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

      const res = await fetch(`http://localhost:5000/api/leaves/${leaveId}/status`, {
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

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Teacher Leave Approvals</h3>

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
                className="rounded-xl border border-border bg-muted/20 p-5 space-y-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{leave.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {leave.description}
                    </p>
                  </div>

                  <span
                    className={`w-fit px-2 py-1 rounded-full text-xs ${statusClasses[leave.status]}`}
                  >
                    {leave.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                      >
                        <FileText className="w-4 h-4" />
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
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateLeaveStatus(leave._id, "Rejected")}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                      disabled={updatingId === leave._id || leave.status === "Rejected"}
                    >
                      <X className="w-4 h-4" />
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
>>>>>>> 0bc2111 (Added academics module changes)
