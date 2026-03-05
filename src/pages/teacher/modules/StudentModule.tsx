import { useState } from "react";

const classStudents: Record<string, any[]> = {
  "Class A": [
    { id: 1, name: "Rahul Patel", roll: 1, email: "rahul@mail.com" },
    { id: 2, name: "Aarav Shah", roll: 2, email: "aarav@mail.com" },
    { id: 3, name: "Vivaan Mehta", roll: 3, email: "vivaan@mail.com" },
  ],

  "Class B": [
    { id: 4, name: "Riya Patel", roll: 1, email: "riya@mail.com" },
    { id: 5, name: "Ananya Shah", roll: 2, email: "ananya@mail.com" },
    { id: 6, name: "Diya Mehta", roll: 3, email: "diya@mail.com" },
  ],
};

export default function StudentsModule() {
  const [selectedClass, setSelectedClass] = useState("");

  const students = selectedClass ? classStudents[selectedClass] : [];

  return (
    <div className="space-y-6">

      {/* Select Class */}

      <div>
        <label className="mr-3 font-medium">Select Class:</label>

        <select
          className="border rounded px-3 py-2"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Choose Class</option>

          {Object.keys(classStudents).map((cls) => (
            <option key={cls}>{cls}</option>
          ))}
        </select>
      </div>

      {/* Student Cards */}

      {selectedClass && (
        <div className="space-y-3">

          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm"
            >
              
              {/* Left side */}

              <div className="flex items-start gap-3">

                {/* Green Dot */}
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full mt-2"></div>

                <div>
                  <p className="font-medium text-gray-900">
                    {student.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {student.email}
                  </p>
                </div>

              </div>

              {/* Right side */}

              <div className="text-sm text-gray-500">
                Roll No: {student.roll}
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}