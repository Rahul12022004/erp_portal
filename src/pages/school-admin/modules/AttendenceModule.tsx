import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const classStudents: Record<string, string[]> = {
  "Class A": ["Rahul", "Aarav", "Vivaan", "Krishna"],
  "Class B": ["Riya", "Ananya", "Diya", "Meera"],
};

const COLORS = ["#22c55e", "#ef4444"];

export default function AttendanceModule() {
  const [selectedClass, setSelectedClass] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-6">

      {/* Select Class */}

      <div>
        <label className="mr-3 font-medium">Select Class:</label>

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

      {selectedClass && (
        <>
          {/* Student Attendance Cards */}

          <div className="space-y-3">

            {students.map((student) => (
              <div
                key={student}
                className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm"
              >

                {/* Student Info */}

                <div className="flex items-center gap-3">

                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>

                  <p className="font-medium">{student}</p>

                </div>

                {/* Attendance Buttons */}

                <div className="flex gap-3">

                  <button
                    onClick={() => markAttendance(student, "present")}
                    className={`px-3 py-1 rounded text-sm ${
                      attendance[student] === "present"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Present
                  </button>

                  <button
                    onClick={() => markAttendance(student, "absent")}
                    className={`px-3 py-1 rounded text-sm ${
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

          {/* Attendance Summary */}

          <div className="grid grid-cols-4 gap-4">

            <div className="stat-card p-4">
              <p>Total Students</p>
              <h3 className="text-xl font-bold">{total}</h3>
            </div>

            <div className="stat-card p-4">
              <p>Present</p>
              <h3 className="text-xl text-green-600">{presentCount}</h3>
            </div>

            <div className="stat-card p-4">
              <p>Absent</p>
              <h3 className="text-xl text-red-500">{absentCount}</h3>
            </div>

            <div className="stat-card p-4">
              <p>Attendance %</p>
              <h3 className="text-xl">{percent}%</h3>
            </div>

          </div>

          {/* Pie Chart */}

          <div className="stat-card p-6 flex justify-center">

            <PieChart width={350} height={300}>

              <Pie
                data={chartData}
                outerRadius={100}
                dataKey="value"
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>

              <Tooltip />
              <Legend />

            </PieChart>

          </div>

        </>
      )}
    </div>
  );
}