import { useEffect, useState } from "react";
import {
  ChevronDown,
  Edit,
  ExternalLink,
  MonitorPlay,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

type Student = {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  class: string;
};

type ClassItem = {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  classTeacher?: {
    _id: string;
    name: string;
    email: string;
    position: string;
  };
  studentCount: number;
  academicYear?: string;
  description?: string;
  meetLink?: string;
};

type ClassDetails = {
  class: ClassItem;
  students: Student[];
  studentCount: number;
};

export default function DigitalClassroomModule() {
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [classDetails, setClassDetails] = useState<Record<string, ClassDetails>>({});
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    stream: "",
    academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    description: "",
    meetLink: "",
  });

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

    setSchoolId(school?._id || "");
    setTeacherId(teacher?._id || "");
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId || !teacherId) {
        setClassList([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`http://localhost:5000/api/classes/${schoolId}`);

        if (!res.ok) {
          throw new Error(`Failed to load classes (${res.status})`);
        }

        const data = await res.json();
        const allClasses = Array.isArray(data) ? data : [];

        const teacherClasses = allClasses.filter((cls: ClassItem) => {
          if (!cls.classTeacher) {
            return false;
          }

          return cls.classTeacher._id === teacherId;
        });

        setClassList(teacherClasses);
      } catch (err) {
        console.error("Teacher digital classroom fetch error:", err);
        setClassList([]);
        setError(err instanceof Error ? err.message : "Failed to fetch classes");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [schoolId, teacherId]);

  const resetForm = () => {
    setFormData({
      name: "",
      section: "",
      stream: "",
      academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      description: "",
      meetLink: "",
    });
    setEditingClass(null);
    setShowForm(false);
  };

  const startEdit = (cls: ClassItem) => {
    setFormData({
      name: cls.name,
      section: cls.section || "",
      stream: cls.stream || "",
      academicYear: cls.academicYear || "",
      description: cls.description || "",
      meetLink: cls.meetLink || "",
    });
    setEditingClass(cls);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolId || !teacherId) {
      alert("Teacher session not found");
      return;
    }

    try {
      setSaving(true);

      const url = editingClass
        ? `http://localhost:5000/api/classes/${editingClass._id}`
        : "http://localhost:5000/api/classes";

      const method = editingClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          classTeacher: teacherId,
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || "Failed to save classroom");
      }

      const savedClass = data?.data || data;

      setClassList((current) => {
        if (editingClass) {
          return current.map((cls) =>
            cls._id === editingClass._id
              ? {
                  ...cls,
                  ...savedClass,
                  studentCount: cls.studentCount,
                }
              : cls
          );
        }

        return [
          {
            ...savedClass,
            studentCount: savedClass?.studentCount || 0,
          },
          ...current,
        ];
      });

      resetForm();
    } catch (err) {
      console.error("Teacher digital classroom save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save classroom");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete ${className}?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/classes/${classId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || "Failed to delete classroom");
      }

      setClassList((current) => current.filter((cls) => cls._id !== classId));
      setClassDetails((current) => {
        const updated = { ...current };
        delete updated[classId];
        return updated;
      });

      if (expandedClass === classId) {
        setExpandedClass(null);
      }
    } catch (err) {
      console.error("Teacher digital classroom delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete classroom");
    }
  };

  const fetchClassDetails = async (classId: string, className: string) => {
    try {
      if (!schoolId) {
        return;
      }

      const res = await fetch(
        `http://localhost:5000/api/classes/${schoolId}/${encodeURIComponent(className)}`
      );

      if (!res.ok) {
        throw new Error(`Failed to load class details (${res.status})`);
      }

      const data = await res.json();
      setClassDetails((current) => ({ ...current, [classId]: data }));
    } catch (err) {
      console.error("Teacher class details fetch error:", err);
    }
  };

  const toggleClassDetails = (classId: string, className: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
      return;
    }

    setExpandedClass(classId);

    if (!classDetails[classId]) {
      fetchClassDetails(classId, className);
    }
  };

  const classesWithMeetLinks = classList.filter((cls) => cls.meetLink).length;
  const totalStudents = classList.reduce((sum, cls) => sum + cls.studentCount, 0);
  const teacherName =
    JSON.parse(localStorage.getItem("teacher") || "null")?.name || "Teacher";

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-bold">My Digital Classrooms</h3>
            <p className="text-sm text-muted-foreground">
              Manage your online classes, open meeting links, and keep track of the students learning with you.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary font-medium">
              {teacherName}
            </div>
            <button
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setEditingClass(null);
                  setShowForm(true);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Classroom
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingClass ? "Edit Digital Classroom" : "Create Digital Classroom"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((current) => ({ ...current, name: e.target.value }))
                  }
                  required
                >
                  <option value="">Select Class</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={`Class ${num}`}>
                      Class {num}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.section}
                  onChange={(e) =>
                    setFormData((current) => ({ ...current, section: e.target.value }))
                  }
                >
                  <option value="">Select Section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stream
                </label>
                <select
                  className="border rounded p-2 w-full"
                  value={formData.stream}
                  onChange={(e) =>
                    setFormData((current) => ({ ...current, stream: e.target.value }))
                  }
                >
                  <option value="">Select Stream</option>
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-2027"
                  className="border rounded p-2 w-full"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      academicYear: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Meet Link
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="border rounded p-2 w-full"
                value={formData.meetLink}
                onChange={(e) =>
                  setFormData((current) => ({ ...current, meetLink: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teaching Notes
              </label>
              <textarea
                placeholder="Add a short note for this classroom..."
                className="border rounded p-2 w-full"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingClass
                  ? "Update Classroom"
                  : "Create Classroom"}
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
        <p className="text-center text-gray-500">Loading classes...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : classList.length === 0 ? (
        <p className="text-center text-gray-500">
          No digital classroom classes are assigned to this teacher yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classList.map((cls) => (
            <div key={cls._id} className="stat-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">{cls.name}</h3>
                  <p className="text-sm text-gray-600">
                    {cls.section ? `Section ${cls.section}` : "Section not set"}
                    {cls.stream ? ` • ${cls.stream}` : ""}
                  </p>
                </div>
                {cls.meetLink && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Live Ready
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => startEdit(cls)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit classroom"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cls._id, cls.name)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete classroom"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {cls.meetLink ? (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600 mb-2">Meeting Link</p>
                  <a
                    href={cls.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <MonitorPlay className="w-4 h-4" />
                    Join Classroom
                  </a>
                </div>
              ) : (
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-500">
                    No live class link has been added yet.
                  </p>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {cls.studentCount} Students
                  </span>
                </div>
              </div>

              {cls.academicYear && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600">
                    Academic Year: {cls.academicYear}
                  </p>
                </div>
              )}

              {cls.description && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600 mb-1">Teaching Notes</p>
                  <p className="text-sm text-gray-700">{cls.description}</p>
                </div>
              )}

              {cls.meetLink && (
                <div className="border-t pt-3">
                  <a
                    href={cls.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {cls.meetLink}
                  </a>
                </div>
              )}

              <button
                onClick={() => toggleClassDetails(cls._id, cls.name)}
                className="w-full border-t pt-3 flex items-center justify-between text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <span>
                  {expandedClass === cls._id ? "Hide" : "View"} Student List
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition ${
                    expandedClass === cls._id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedClass === cls._id && classDetails[cls._id] && (
                <div className="border-t pt-3 space-y-2">
                  <h4 className="font-semibold text-sm">Students in this class</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {classDetails[cls._id].students.length > 0 ? (
                      classDetails[cls._id].students.map((student) => (
                        <div
                          key={student._id}
                          className="bg-gray-50 p-2 rounded text-sm"
                        >
                          <p className="font-medium">
                            {student.rollNumber}. {student.name}
                          </p>
                          <p className="text-xs text-gray-600">{student.email}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No students in this class yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {classList.length > 0 && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">Teaching Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">My Classes</p>
              <p className="text-2xl font-bold">{classList.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">My Students</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Live Links Ready</p>
              <p className="text-2xl font-bold">{classesWithMeetLinks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Classes Without Links</p>
              <p className="text-2xl font-bold">
                {classList.length - classesWithMeetLinks}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
