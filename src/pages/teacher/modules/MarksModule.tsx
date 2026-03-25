import { useEffect, useState } from "react";

type Exam = {
  _id: string;
  title: string;
  examType: string;
  className: string;
  examDate: string;
  startTime: string;
  endTime: string;
};

type StudentMark = {
  markId: string | null;
  studentId: string;
  name: string;
  rollNumber: string;
  email: string;
  obtainedMarks: number | "";
  maxMarks: number;
  remarks: string;
};

type ExamMarksResponse = {
  exam: Exam;
  students: StudentMark[];
};

export default function MarksModule() {
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

    setSchoolId(school?._id || "");
    setTeacherId(teacher?._id || "");
  }, []);

  useEffect(() => {
    const fetchCompletedExams = async () => {
      if (!schoolId || !teacherId) {
        setLoadingExams(false);
        return;
      }

      try {
        setLoadingExams(true);
        setError("");

        const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/marks/${schoolId}/${teacherId}`);

        if (!res.ok) {
          throw new Error(`Failed to load completed exams (${res.status})`);
        }

        const data = await res.json();
        const completedExams = Array.isArray(data) ? data : [];

        setExams(completedExams);
        setSelectedExamId((current) =>
          current && completedExams.some((exam) => exam._id === current)
            ? current
            : completedExams[0]?._id || ""
        );
      } catch (err) {
        console.error("Completed exams fetch error:", err);
        setExams([]);
        setSelectedExamId("");
        setError(
          err instanceof Error ? err.message : "Failed to load completed exams"
        );
      } finally {
        setLoadingExams(false);
      }
    };

    fetchCompletedExams();
  }, [schoolId, teacherId]);

  useEffect(() => {
    const fetchExamMarks = async () => {
      if (!schoolId || !teacherId || !selectedExamId) {
        setSelectedExam(null);
        setStudents([]);
        return;
      }

      try {
        setLoadingStudents(true);
        setError("");

        const res = await fetch(
          `https://erp-portal-1-ftwe.onrender.com/api/marks/${schoolId}/${teacherId}/${selectedExamId}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load marks data (${res.status})`);
        }

        const data: ExamMarksResponse = await res.json();
        setSelectedExam(data.exam || null);
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (err) {
        console.error("Exam marks fetch error:", err);
        setSelectedExam(null);
        setStudents([]);
        setError(err instanceof Error ? err.message : "Failed to load marks data");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchExamMarks();
  }, [schoolId, teacherId, selectedExamId]);

  const updateStudentMark = (
    studentId: string,
    field: "obtainedMarks" | "maxMarks" | "remarks",
    value: string
  ) => {
    setStudents((current) =>
      current.map((student) => {
        if (student.studentId !== studentId) {
          return student;
        }

        if (field === "remarks") {
          return { ...student, remarks: value };
        }

        if (value === "") {
          return {
            ...student,
            [field]: field === "obtainedMarks" ? "" : student[field],
          };
        }

        const numericValue = Number(value);

        return {
          ...student,
          [field]: Number.isNaN(numericValue) ? student[field] : numericValue,
        };
      })
    );
  };

  const saveMarks = async () => {
    if (!selectedExamId || !schoolId || !teacherId) {
      return;
    }

    const invalidEntry = students.find(
      (student) =>
        student.obtainedMarks !== "" &&
        (Number(student.maxMarks) <= 0 ||
          Number(student.obtainedMarks) < 0 ||
          Number(student.obtainedMarks) > Number(student.maxMarks))
    );

    if (invalidEntry) {
      alert("Each obtained mark must be between 0 and maximum marks.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          teacherId,
          schoolId,
          entries: students.map((student) => ({
            studentId: student.studentId,
            obtainedMarks: student.obtainedMarks,
            maxMarks: student.maxMarks,
            remarks: student.remarks,
          })),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to save marks");
      }

      alert("Marks saved successfully");
    } catch (err) {
      console.error("Save marks error:", err);
      alert(err instanceof Error ? err.message : "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Select Completed Exam</h3>

        <select
          className="border p-2 rounded w-full"
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          disabled={loadingExams || exams.length === 0}
        >
          <option value="">Select Exam</option>
          {exams.map((exam) => (
            <option key={exam._id} value={exam._id}>
              {exam.title} - {exam.className} - {exam.examType} - {exam.examDate}
            </option>
          ))}
        </select>

        {selectedExam && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-1">
            <p className="font-medium">{selectedExam.title}</p>
            <p className="text-muted-foreground">
              {selectedExam.className} • {selectedExam.examType}
            </p>
            <p className="text-muted-foreground">
              {selectedExam.examDate} • {selectedExam.startTime} - {selectedExam.endTime}
            </p>
          </div>
        )}
      </div>

      <div className="stat-card p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Student Wise Marks</h3>
          <button
            onClick={saveMarks}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            disabled={saving || !selectedExamId || students.length === 0}
          >
            {saving ? "Saving..." : "Save Marks"}
          </button>
        </div>

        {loadingExams ? (
          <p className="text-gray-500">Loading completed exams...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : exams.length === 0 ? (
          <p className="text-gray-500">
            No completed exams are available yet. Scheduled exams appear here after they finish.
          </p>
        ) : !selectedExamId ? (
          <p className="text-gray-500">Select an exam to enter marks.</p>
        ) : loadingStudents ? (
          <p className="text-gray-500">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-gray-500">No students found for this exam class.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Roll No</th>
                  <th className="p-2 text-left">Student</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Obtained Marks</th>
                  <th className="p-2 text-left">Max Marks</th>
                  <th className="p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.studentId} className="border-t">
                    <td className="p-2">{student.rollNumber}</td>
                    <td className="p-2 font-medium">{student.name}</td>
                    <td className="p-2 text-sm text-gray-600">{student.email}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        className="border rounded p-2 w-28"
                        value={student.obtainedMarks}
                        onChange={(e) =>
                          updateStudentMark(
                            student.studentId,
                            "obtainedMarks",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        className="border rounded p-2 w-28"
                        value={student.maxMarks}
                        onChange={(e) =>
                          updateStudentMark(student.studentId, "maxMarks", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Remarks"
                        className="border rounded p-2 w-full min-w-[180px]"
                        value={student.remarks}
                        onChange={(e) =>
                          updateStudentMark(student.studentId, "remarks", e.target.value)
                        }
                      />
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
