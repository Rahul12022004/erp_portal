import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

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
  const [downloading, setDownloading] = useState(false);
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

        const res = await fetch(`${API_URL}/api/marks/${schoolId}/${teacherId}`);

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
          `${API_URL}/api/marks/${schoolId}/${teacherId}/${selectedExamId}`
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

      const res = await fetch(`${API_URL}/api/marks`, {
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

  const downloadMarks = async () => {
    if (!selectedExamId || !schoolId) return;

    try {
      setDownloading(true);

      const res = await fetch(`${API_URL}/api/marks/download/${schoolId}/${selectedExamId}`);
      if (!res.ok) throw new Error(`Failed to fetch marks data (${res.status})`);

      const data = await res.json();

      // Dynamically import jspdf to avoid SSR issues
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ========== HEADER BAND ==========
      const headerTop = 10;
      const headerBottom = 38;

      // Light green header band
      doc.setFillColor(34, 197, 94);
      doc.rect(0, headerTop, pageWidth, headerBottom - headerTop, "F");

      // --- LEFT: School name + logo ---
      const leftMargin = 14;
      let logoY = headerTop + 4;

      if (data.school?.logo?.startsWith("data:image")) {
        try {
          doc.addImage(data.school.logo, "PNG", leftMargin, logoY, 28, 28);
        } catch (e) {
          console.warn("Logo add failed:", e);
        }
      }

      const schoolNameX = data.school?.logo?.startsWith("data:image") ? leftMargin + 34 : leftMargin;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(data.school?.name || "School Name", schoolNameX, logoY + 10);

      if (data.school?.address) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(data.school.address, schoolNameX, logoY + 18);
      }

      // --- RIGHT: Exam info stacked ---
      const rightMargin = pageWidth - 14;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Examination Marks Sheet", rightMargin, headerTop + 8, { align: "right" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const rightInfo = [
        `Exam: ${data.exam?.title || "N/A"}`,
        `Class: ${data.exam?.className || "N/A"}  |  Subject: ${data.exam?.subject || "N/A"}`,
        `Date: ${data.exam?.examDate || "N/A"}  |  Time: ${data.exam?.startTime || ""} - ${data.exam?.endTime || ""}`,
        `Teacher: ${data.teacher || "N/A"}`,
      ];
      let ry = headerTop + 15;
      rightInfo.forEach((line) => {
        doc.text(line, rightMargin, ry, { align: "right" });
        ry += 5;
      });

      // ========== MARKS TABLE ==========
      const tableTop = headerBottom + 6;
      const tableData = data.marks?.map((m: any) => [
        m.rollNumber,
        m.studentName,
        m.email,
        m.obtainedMarks,
        m.maxMarks,
        m.remarks || "-",
      ]) || [];

      autoTable(doc, {
        startY: tableTop,
        head: [["Roll No", "Student Name", "Email", "Obtained", "Max", "Remarks"]],
        body: tableData,
        styles: { fontSize: 9, halign: "center" },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center", cellWidth: 18 },
          1: { halign: "left", cellWidth: 45 },
          2: { halign: "left", cellWidth: 55 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "center", cellWidth: 18 },
          5: { halign: "left" },
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
      });

      // ========== FOOTER ==========
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | ERP Portal`,
        14,
        pageHeight - 6
      );

      const filename = `Marks_${data.exam?.title || "Exam"}_${data.exam?.className || ""}_${data.exam?.examDate || ""}.pdf`;
      doc.save(filename.replace(/[\s\/]+/g, "_"));
    } catch (err) {
      console.error("Download error:", err);
      alert(err instanceof Error ? err.message : "Failed to download marks");
    } finally {
      setDownloading(false);
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
          <div className="flex gap-2">
            <button
              onClick={downloadMarks}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              disabled={downloading || !selectedExamId || students.length === 0}
            >
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
            <button
              onClick={saveMarks}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              disabled={saving || !selectedExamId || students.length === 0}
            >
              {saving ? "Saving..." : "Save Marks"}
            </button>
          </div>
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
