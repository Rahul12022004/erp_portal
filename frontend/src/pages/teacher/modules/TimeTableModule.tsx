import { useState } from "react";

type TimeTable = {
  id: number;
  day: string;
  teacher: string;
  time: string;
  className: string;
  subject: string;
  room: string;
};

const timetableData: TimeTable[] = [
  {
    id: 1,
    day: "Monday",
    teacher: "Mr. John Smith",
    time: "8:00 AM",
    className: "Class 10-A",
    subject: "Mathematics",
    room: "Room 201",
  },
  {
    id: 2,
    day: "Monday",
    teacher: "Mr. John Smith",
    time: "9:00 AM",
    className: "Class 9-B",
    subject: "Mathematics",
    room: "Room 105",
  },
  {
    id: 3,
    day: "Monday",
    teacher: "Mr. John Smith",
    time: "11:00 AM",
    className: "Class 10-A",
    subject: "Advanced Math",
    room: "Lab 3",
  },
  {
    id: 4,
    day: "Tuesday",
    teacher: "Ms. Sarah Lee",
    time: "10:00 AM",
    className: "Class 8-A",
    subject: "Science",
    room: "Room 102",
  },
];

export default function TimeTableModule() {
  const [day, setDay] = useState("");
  const [teacher, setTeacher] = useState("");
  const [results, setResults] = useState<TimeTable[]>([]);

  const handleSearch = () => {
    const filtered = timetableData.filter((t) => {
      return (
        (!day || t.day === day) &&
        (!teacher || t.teacher === teacher)
      );
    });

    setResults(filtered);
  };

  return (
    <div className="space-y-6">

      {/* FILTER SECTION */}

      <div className="stat-card p-6">

        <h3 className="text-lg font-semibold mb-4">
          TEACHER TIMETABLE
        </h3>

        <div className="grid grid-cols-3 gap-4">

          {/* Select Day */}

          <div>
            <label className="text-sm font-medium">
              Select Day
            </label>

            <select
              className="border rounded p-2 w-full"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              <option value="">Select Day</option>
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
            </select>
          </div>

          {/* Select Teacher */}

          <div>
            <label className="text-sm font-medium">
              Select Teacher
            </label>

            <select
              className="border rounded p-2 w-full"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">Select Teacher</option>
              <option>Mr. John Smith</option>
              <option>Ms. Sarah Lee</option>
            </select>
          </div>

          {/* Search Button */}

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

      {/* TIMETABLE RESULT */}

      <div className="stat-card p-6">

        <h3 className="text-lg font-semibold mb-4">
          Schedule
        </h3>

        {results.length === 0 ? (
          <p className="text-gray-500">
            No timetable available
          </p>
        ) : (
          <div className="space-y-3">

            {results.map((cls) => (
              <div
                key={cls.id}
                className="bg-gray-50 border rounded-xl p-4 flex items-center gap-6"
              >

                {/* Time */}

                <div className="text-green-600 font-semibold w-24">
                  {cls.time}
                </div>

                {/* Class Info */}

                <div>
                  <p className="font-semibold">
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