import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const classStudents: Record<string, string[]> = {
  "Class A": ["Rahul", "Aarav", "Vivaan", "Krishna"],
  "Class B": ["Riya", "Ananya", "Diya", "Meera"],
};

const COLORS = ["#22c55e", "#ef4444"];

export default function AttendanceModule() {
  const [selectedClass, setSelectedClass] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState("");

  const students = selectedClass ? classStudents[selectedClass] : [];

  const markAttendance = (student: string, status: string) => {
    setAttendance({
      ...attendance,
      [student]: status,
    });
  };

  const presentCount = Object.values(attendance).filter(
    (v) => v === "present"
  ).length;

  const absentCount = Object.values(attendance).filter(
    (v) => v === "absent"
  ).length;

  const total = students.length;
  const percent = total ? Math.round((presentCount / total) * 100) : 0;

  const chartData = [
    { name: "Present", value: presentCount },
    { name: "Absent", value: absentCount },
  ];

  // 📄 Generate PDF
  const downloadPDF = () => {
    if (!selectedClass || !selectedDate) {
      alert("Please select class and date");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Attendance Report", 14, 15);

    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass}`, 14, 25);
    doc.text(`Date: ${selectedDate}`, 14, 32);

    const tableData = students.map((student) => [
      student,
      attendance[student] || "Not Marked",
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Student Name", "Status"]],
      body: tableData,
    });

    doc.save(`Attendance_${selectedClass}_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">

      {/* Top Controls */}
      <div className="flex gap-4 flex-wrap items-center">

        {/* Class Select */}
        <div>
          <label className="mr-2 font-medium">Class:</label>
          <select
            className="border rounded px-3 py-2"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setAttendance({});
            }}
          >
            <option value="">Choose Class</option>
            {Object.keys(classStudents).map((cls) => (
              <option key={cls}>{cls}</option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div>
          <label className="mr-2 font-medium">Date:</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Download Button */}
        <button
          onClick={downloadPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Download PDF
        </button>
      </div>

      {selectedClass && (
        <>
          {/* Pie Chart */}
          <div className="bg-white rounded-xl shadow p-6 flex justify-center">
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
              <p>Total</p>
              <h3 className="font-bold text-xl">{total}</h3>
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
              <p>%</p>
              <h3 className="text-xl">{percent}%</h3>
            </div>
          </div>

          {/* Students */}
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student}
                className="bg-white border rounded-xl p-4 flex justify-between items-center"
              >
                <p className="font-medium">{student}</p>

                <div className="flex gap-3">
                  <button
                    onClick={() => markAttendance(student, "present")}
                    className={`px-3 py-1 rounded ${
                      attendance[student] === "present"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Present
                  </button>

                  <button
                    onClick={() => markAttendance(student, "absent")}
                    className={`px-3 py-1 rounded ${
                      attendance[student] === "absent"
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
        </>
      )}
    </div>
  );
}