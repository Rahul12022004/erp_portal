import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const teachers = [
  { name: "Mr. Sharma", subject: "Math" },
  { name: "Ms. Gupta", subject: "Science" },
  { name: "Mr. Verma", subject: "English" },
  { name: "Ms. Iyer", subject: "Computer" },
];

const COLORS = ["#22c55e", "#ef4444"];

export default function TeacherAttendanceModule() {
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState("");

  const markAttendance = (teacher: string, status: string) => {
    setAttendance({
      ...attendance,
      [teacher]: status,
    });
  };

  const presentCount = Object.values(attendance).filter(
    (v) => v === "present"
  ).length;

  const absentCount = Object.values(attendance).filter(
    (v) => v === "absent"
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
      t.subject,
      attendance[t.name] || "Not Marked",
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
        {teachers.map((teacher) => (
          <div
            key={teacher.name}
            className="bg-white border rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{teacher.name}</p>
              <p className="text-sm text-gray-500">{teacher.subject}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => markAttendance(teacher.name, "present")}
                className={`px-3 py-1 rounded ${
                  attendance[teacher.name] === "present"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                Present
              </button>

              <button
                onClick={() => markAttendance(teacher.name, "absent")}
                className={`px-3 py-1 rounded ${
                  attendance[teacher.name] === "absent"
                    ? "bg-red-500 text-white"
                    : "bg-gray-100"
                }`}
              >
                Absent
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}