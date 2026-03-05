import { useState } from "react";

export default function AssignmentsModule() {
  const [title, setTitle] = useState("");
  const [assignments, setAssignments] = useState<any[]>([]);

  const addAssignment = () => {
    const newAssignment = {
      id: Date.now(),
      title,
    };

    setAssignments([...assignments, newAssignment]);
    setTitle("");
  };

  return (
    <div className="space-y-6">

      <input
        type="text"
        placeholder="Assignment Title"
        className="border p-2 rounded w-full"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <button
        onClick={addAssignment}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Add Assignment
      </button>

      <table className="w-full border">
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id}>
              <td className="p-2">{a.title}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}