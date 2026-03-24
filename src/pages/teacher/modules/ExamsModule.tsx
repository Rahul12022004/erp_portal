import { useEffect, useState } from "react";
import { CalendarDays, Clock3, FileText, Trash2 } from "lucide-react";

type Exam = {
  _id: string;
  title: string;
  examType: string;
  className: string;
  examDate: string;
  startTime: string;
  endTime: string;
  documentName?: string;
  documentData?: string;
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

const examTypes = [
  "Unit Test",
  "Weekly Test",
  "Monthly Test",
  "Quarterly Exam",
  "Half Yearly",
  "Pre Board",
  "Final Exam",
  "Practical Exam",
];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function ExamsModule() {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("");
  const [className, setClassName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
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

        const [classesRes, examsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/classes/${schoolId}`),
          fetch(`http://localhost:5000/api/exams/${schoolId}/${teacherId}`),
        ]);

        if (!classesRes.ok) {
          throw new Error(`Failed to load classes (${classesRes.status})`);
        }

        if (!examsRes.ok) {
          throw new Error(`Failed to load exams (${examsRes.status})`);
        }

        const [classesData, examsData] = await Promise.all([
          classesRes.json(),
          examsRes.json(),
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
        setExams(Array.isArray(examsData) ? examsData : []);
      } catch (err) {
        console.error("Exam module fetch error:", err);
        setClasses([]);
        setExams([]);
        setError(err instanceof Error ? err.message : "Failed to load exams");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, teacherId]);

  const resetForm = () => {
    setTitle("");
    setExamType("");
    setClassName("");
    setExamDate("");
    setStartTime("");
    setEndTime("");
    setDocument(null);
  };

  const addExam = async () => {
    if (
      !title.trim() ||
      !examType ||
      !className ||
      !examDate ||
      !startTime ||
      !endTime ||
      !schoolId ||
      !teacherId
    ) {
      alert("Please fill exam title, type, class, date, start time and end time");
      return;
    }

    if (endTime <= startTime) {
      alert("End time must be after start time");
      return;
    }

    try {
      setSaving(true);

      const documentData = document ? await readFileAsDataUrl(document) : "";

      const res = await fetch("http://localhost:5000/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          examType,
          className,
          examDate,
          startTime,
          endTime,
          documentName: document?.name || "",
          documentData,
          teacherId,
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to schedule exam");
      }

      setExams((current) => {
        const next = [data.data, ...current];
        return next.sort(
          (a, b) =>
            a.examDate.localeCompare(b.examDate) ||
            a.startTime.localeCompare(b.startTime)
        );
      });
      resetForm();
    } catch (err) {
      console.error("Create exam error:", err);
      alert(err instanceof Error ? err.message : "Failed to schedule exam");
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/exams/${examId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to delete exam");
      }

      setExams((current) => current.filter((exam) => exam._id !== examId));
    } catch (err) {
      console.error("Delete exam error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete exam");
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Schedule Exam</h3>

        <input
          type="text"
          placeholder="Exam Name"
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="border p-2 rounded w-full"
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
        >
          <option value="">Select Exam Type</option>
          {examTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

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

        <input
          type="date"
          className="border p-2 rounded w-full"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="time"
            className="border p-2 rounded w-full"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <input
            type="time"
            className="border p-2 rounded w-full"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <label className="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
          <span className="text-sm text-gray-600">
            {document ? document.name : "Click to upload exam document"}
          </span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => setDocument(e.target.files?.[0] || null)}
          />
        </label>

        <button
          onClick={addExam}
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={saving || loading || classes.length === 0}
        >
          {saving ? "Saving..." : "Schedule Exam"}
        </button>

        {classes.length === 0 && !loading && (
          <p className="text-sm text-amber-600">
            No classes are assigned to this teacher yet.
          </p>
        )}
      </div>

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Scheduled Exams</h3>

        {loading ? (
          <p className="text-gray-500">Loading exams...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : exams.length === 0 ? (
          <p className="text-gray-500">No exams scheduled yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <div key={exam._id} className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-lg">{exam.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.examType} • {exam.className}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteExam(exam._id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    <span>{exam.examDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="w-4 h-4" />
                    <span>
                      {exam.startTime} - {exam.endTime}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-background/70 border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Exam Type
                  </p>
                  <p className="font-medium mt-1">{exam.examType}</p>
                </div>

                <div className="rounded-lg bg-background/70 border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Document
                  </p>
                  {exam.documentData ? (
                    <a
                      href={exam.documentData}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      {exam.documentName || "View Document"}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No document uploaded</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
