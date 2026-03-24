import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

type Assignment = {
  _id: string;
  title: string;
  description: string;
  className: string;
  fileName?: string;
  fileData?: string;
  dueDate?: string;
  createdAt?: string;
};

type SchoolClass = {
  _id: string;
  name: string;
  classTeacher?:
    | string
    | {
        _id: string;
        name: string;
      };
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function AssignmentsModule() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [className, setClassName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
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
    const fetchData = async () => {
      if (!schoolId || !teacherId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [classesRes, assignmentsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/classes/${schoolId}`),
          fetch(`http://localhost:5000/api/assignments/${schoolId}/${teacherId}`),
        ]);

        if (!classesRes.ok) {
          throw new Error(`Failed to load classes (${classesRes.status})`);
        }

        if (!assignmentsRes.ok) {
          throw new Error(`Failed to load assignments (${assignmentsRes.status})`);
        }

        const [classesData, assignmentsData] = await Promise.all([
          classesRes.json(),
          assignmentsRes.json(),
        ]);

        const teacherClasses = (Array.isArray(classesData) ? classesData : []).filter(
          (classItem: SchoolClass) => {
            if (!classItem.classTeacher) {
              return false;
            }

            if (typeof classItem.classTeacher === "string") {
              return classItem.classTeacher === teacherId;
            }

            return classItem.classTeacher._id === teacherId;
          }
        );

        setClasses(teacherClasses);
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      } catch (err) {
        console.error("Assignment module fetch error:", err);
        setClasses([]);
        setAssignments([]);
        setError(err instanceof Error ? err.message : "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, teacherId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setClassName("");
    setFile(null);
    setDueDate("");
  };

  const addAssignment = async () => {
    if (!title.trim() || !className || !schoolId || !teacherId) {
      alert("Title and class are required");
      return;
    }

    try {
      setSaving(true);

      const fileData = file ? await readFileAsDataUrl(file) : "";

      const res = await fetch("http://localhost:5000/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          className,
          dueDate,
          fileName: file?.name || "",
          fileData,
          teacherId,
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create assignment");
      }

      setAssignments((current) => [data.data, ...current]);
      resetForm();
    } catch (err) {
      console.error("Create assignment error:", err);
      alert(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to delete assignment");
      }

      setAssignments((current) =>
        current.filter((assignment) => assignment._id !== assignmentId)
      );
    } catch (err) {
      console.error("Delete assignment error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete assignment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Add Assignment</h3>

        <input
          type="text"
          placeholder="Assignment Title"
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Description"
          className="border p-2 rounded w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="border p-2 rounded w-full"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          disabled={loading || classes.length === 0}
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls._id} value={cls.name}>
              {cls.name}
            </option>
          ))}
        </select>

        <label className="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
          <span className="text-sm text-gray-600">
            {file ? file.name : "Click to upload PDF"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <input
          type="date"
          className="border p-2 rounded w-full"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <button
          onClick={addAssignment}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          disabled={saving || loading || classes.length === 0}
        >
          {saving ? "Saving..." : "Add Assignment"}
        </button>

        {classes.length === 0 && !loading && (
          <p className="text-sm text-amber-600">
            No classes are assigned to this teacher yet.
          </p>
        )}
      </div>

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Assignments</h3>

        {loading ? (
          <p className="text-gray-500">Loading assignments...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-500">No assignments created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Class</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-left">PDF</th>
                  <th className="p-2 text-left">Due Date</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment._id} className="border-t">
                    <td className="p-2">{assignment.title}</td>
                    <td className="p-2">{assignment.className}</td>
                    <td className="p-2 text-sm text-gray-600">
                      {assignment.description || "-"}
                    </td>
                    <td className="p-2">
                      {assignment.fileData ? (
                        <a
                          href={assignment.fileData}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {assignment.fileName || "View PDF"}
                        </a>
                      ) : (
                        "No file"
                      )}
                    </td>
                    <td className="p-2">{assignment.dueDate || "-"}</td>
                    <td className="p-2">
                      <button
                        onClick={() => deleteAssignment(assignment._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
