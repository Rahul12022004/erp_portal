import { useState } from "react";
import { Plus } from "lucide-react";

type Leave = {
  id: number;
  from: string;
  to: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

const mockLeaves: Leave[] = [
  { id: 1, from: "2024-06-20", to: "2024-06-22", reason: "Medical Leave", status: "Approved" },
  { id: 2, from: "2024-06-25", to: "2024-06-26", reason: "Personal Work", status: "Pending" },
  { id: 3, from: "2024-06-10", to: "2024-06-11", reason: "Family Function", status: "Rejected" },
];

export default function LeaveModule() {
  const [leaves, setLeaves] = useState(mockLeaves);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    from: "",
    to: "",
    reason: "",
  });

  const handleApply = () => {
    if (!form.from || !form.to || !form.reason) return;

    const newLeave: Leave = {
      id: Date.now(),
      ...form,
      status: "Pending",
    };

    setLeaves([newLeave, ...leaves]);
    setForm({ from: "", to: "", reason: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Apply Leave
        </button>
      </div>

      {/* Apply Form */}
      {showForm && (
        <div className="stat-card p-4 space-y-4">
          <h3 className="font-semibold">Apply for Leave</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="date"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              className="px-3 py-2 bg-muted rounded-lg"
            />

            <input
              type="date"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              className="px-3 py-2 bg-muted rounded-lg"
            />

            <input
              type="text"
              placeholder="Reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="px-3 py-2 bg-muted rounded-lg"
            />
          </div>

          <button
            onClick={handleApply}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Submit
          </button>
        </div>
      )}

      {/* Leave Table */}
      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">From</th>
              <th className="p-3 text-left">To</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {leaves.map((leave) => (
              <tr key={leave.id} className="border-b hover:bg-muted/30">
                <td className="p-3">{leave.from}</td>
                <td className="p-3">{leave.to}</td>
                <td className="p-3">{leave.reason}</td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      leave.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : leave.status === "Pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {leave.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}