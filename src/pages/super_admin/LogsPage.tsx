import { useEffect, useState } from "react";

type LogEntry = {
  _id: string;
  action: string;
  message: string;
  user?: string;
  createdAt: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/logs");
    const data: unknown = await res.json();
    setLogs(Array.isArray(data) ? (data as LogEntry[]) : []);
  };

  return (
    <div className="p-6">

      <h1 className="text-xl font-bold mb-4">Activity Logs</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Message</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Time</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="border-t">
                <td className="p-3">{log.action}</td>
                <td className="p-3">{log.message}</td>
                <td className="p-3">{log.user}</td>
                <td className="p-3">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
