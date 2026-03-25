import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TeacherAttendance = {
  attendanceId: string | null;
  remarks: string;
  staffId: string;
  name: string;
  position: string;
  status: string | null;
};

const COLORS = ["#22c55e", "#ef4444"];

export default function TeacherAttendanceModule() {
  const [teachers, setTeachers] = useState<TeacherAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState("");

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "{}");
    setSchoolId(school?._id || "");
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!schoolId || !selectedDate) {
        setTeachers([]);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `https://erp-portal-1-ftwe.onrender.com/api/attendance/${schoolId}/${selectedDate}?position=Teacher`
        );

        if (!res.ok) {
          throw new Error(`Failed to load attendance (${res.status})`);
        }

        const data = await res.json();
        setTeachers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Attendance fetch error:", error);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [schoolId, selectedDate]);

  const markAttendance = async (teacherId: string, status: "Present" | "Absent") => {
    if (!schoolId || !selectedDate) {
      alert("Please select date");
      return;
    }

    try {
      const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: teacherId,
          schoolId,
          date: selectedDate,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to mark attendance");
      }

      setTeachers((current) =>
        current.map((teacher) =>
          teacher.staffId === teacherId
            ? {
                ...teacher,
                attendanceId: data.data?._id || teacher.attendanceId,
                status,
              }
            : teacher
        )
      );
    } catch (error) {
      console.error("Mark attendance error:", error);
      alert("Failed to save attendance");
    }
  };

  const presentCount = teachers.filter(
    (teacher) => teacher.status?.toLowerCase() === "present"
  ).length;

  const absentCount = teachers.filter(
    (teacher) => teacher.status?.toLowerCase() === "absent"
  ).length;

  const total = teachers.length;
  const percent = total ? Math.round((presentCount / total) * 100) : 0;

  const chartData = [
    { name: "Present", value: presentCount },
    { name: "Absent", value: absentCount },
  ];

  // 📄 PDF Download
  const downloadPDF = () => {
    if (!selectedDate) {
      alert("Please select date");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Teacher Attendance Report", 14, 15);

    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate}`, 14, 25);

    const tableData = teachers.map((t) => [
      t.name,
      t.position,
      t.status || "Not Marked",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Teacher Name", "Subject", "Status"]],
      body: tableData,
    });

    doc.save(`Teacher_Attendance_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">

      {/* Top Controls */}
      <div className="flex gap-4 items-center flex-wrap">
        
        {/* Date */}
        <div>
          <label className="mr-2 font-medium">Date:</label>
          <input
            type="date"
            className="border px-3 py-2 rounded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Download */}
        <button
          onClick={downloadPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Download PDF
        </button>
      </div>

      {/* Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow flex justify-center">
        <PieChart width={350} height={300}>
          <Pie data={chartData} outerRadius={100} dataKey="value" label>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow text-center">
          <p>Total Teachers</p>
          <h3 className="text-xl font-bold">{total}</h3>
        </div>

        <div className="bg-white p-4 rounded shadow text-center">
          <p>Present</p>
          <h3 className="text-green-600 text-xl">{presentCount}</h3>
        </div>

        <div className="bg-white p-4 rounded shadow text-center">
          <p>Absent</p>
          <h3 className="text-red-500 text-xl">{absentCount}</h3>
        </div>

        <div className="bg-white p-4 rounded shadow text-center">
          <p>Attendance %</p>
          <h3 className="text-xl">{percent}%</h3>
        </div>
      </div>

      {/* Teacher List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border rounded-xl p-4 text-center text-gray-500">
            Loading attendance...
          </div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.staffId}
              className="bg-white border rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{teacher.name}</p>
                <p className="text-sm text-gray-500">{teacher.position}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => markAttendance(teacher.staffId, "Present")}
                  className={`px-3 py-1 rounded ${
                    teacher.status?.toLowerCase() === "present"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Present
                </button>

                <button
                  onClick={() => markAttendance(teacher.staffId, "Absent")}
                  className={`px-3 py-1 rounded ${
                    teacher.status?.toLowerCase() === "absent"
                      ? "bg-red-500 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Absent
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
