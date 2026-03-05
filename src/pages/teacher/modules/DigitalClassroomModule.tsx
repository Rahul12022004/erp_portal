import { useState } from "react";

type ClassData = {
  id: number;
  date: string;
  type: string;
  teacher: string;
  className: string;
  subject: string;
  time: string;
  room: string;
};

const mockClasses: ClassData[] = [
  {
    id: 1,
    date: "2026-02-26",
    type: "Online",
    teacher: "Mr. John Smith",
    className: "Class 10-A",
    subject: "Mathematics",
    time: "8:00 AM",
    room: "Room 201",
  },
  {
    id: 2,
    date: "2026-02-26",
    type: "Online",
    teacher: "Mr. John Smith",
    className: "Class 9-B",
    subject: "Mathematics",
    time: "9:00 AM",
    room: "Room 105",
  },
  {
    id: 3,
    date: "2026-02-26",
    type: "Online",
    teacher: "Mr. John Smith",
    className: "Class 10-A",
    subject: "Advanced Math",
    time: "11:00 AM",
    room: "Lab 3",
  },
];

export default function OnlineClassModule() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [teacher, setTeacher] = useState("");
  const [filteredClasses, setFilteredClasses] = useState<ClassData[]>([]);

  const handleSearch = () => {
    const results = mockClasses.filter((c) => {
      return (
        (!selectedClass || c.className === selectedClass) &&
        (!teacher || c.teacher === teacher)
      );
    });

    setFilteredClasses(results);
  };

  return (
    <div className="space-y-6">

      {/* FILTER SECTION */}

      <div className="stat-card p-6">

        <h3 className="text-lg font-semibold mb-4">ONLINE CLASSES</h3>

        <div className="grid grid-cols-5 gap-4">

          <div>
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              className="border rounded p-2 w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              className="border rounded p-2 w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Class</label>
            <select
              className="border rounded p-2 w-full"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Select Class</option>
              <option>Class 10-A</option>
              <option>Class 9-B</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Select Teacher</label>
            <select
              className="border rounded p-2 w-full"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">Select Teacher</option>
              <option>Mr. John Smith</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              SEARCH
            </button>
          </div>

        </div>

      </div>

      {/* TODAY SCHEDULE */}

      <div className="stat-card p-6">

        <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>

        {filteredClasses.length === 0 ? (
          <p className="text-gray-500">
            No classes links available for the day
          </p>
        ) : (
          <div className="space-y-3">

            {filteredClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-gray-50 border rounded-xl p-4 flex items-center gap-6"
              >

                {/* TIME */}

                <div className="text-green-600 font-semibold w-24">
                  {cls.time}
                </div>

                {/* CLASS INFO */}

                <div>
                  <p className="font-semibold text-gray-900">
                    {cls.className}
                  </p>

                  <p className="text-sm text-gray-500">
                    {cls.subject} • {cls.room}
                  </p>
                </div>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}