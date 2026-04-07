import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL } from "@/lib/api";

type SchoolClass = {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  classTeacher?:
    | string
    | {
        _id: string;
        name: string;
      };
};

type StudentAttendance = {
  attendanceId: string | null;
  class: string;
  email: string;
  name: string;
  remarks: string;
  rollNumber: string;
  studentId: string;
  status: string | null;
};

const COLORS = ["#22c55e", "#ef4444"];

export default function AttendanceModule() {
  const [teacherClasses, setTeacherClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [selfAttendanceStatus, setSelfAttendanceStatus] = useState<string | null>(null);
  const [selfAttendanceLocked, setSelfAttendanceLocked] = useState(false);
  const [selfAttendanceLoading, setSelfAttendanceLoading] = useState(false);
  const [selfAttendanceMeta, setSelfAttendanceMeta] = useState<{
    isOutsideSchool?: boolean;
    distanceFromSchoolMeters?: number | null;
  }>({});
  const [selfAttendanceMessage, setSelfAttendanceMessage] = useState("");

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

    setSchoolId(school?._id || "");
    setTeacherId(teacher?._id || "");
    setTeacherName(teacher?.name || "Teacher");
  }, []);

  useEffect(() => {
    const fetchSelfAttendance = async () => {
      if (!schoolId || !teacherId || !selectedDate) {
        setSelfAttendanceStatus(null);
        setSelfAttendanceLocked(false);
        setSelfAttendanceMeta({});
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/attendance/self/${schoolId}/${teacherId}/${selectedDate}`);
        if (!res.ok) {
          return;
        }

        const payload = await res.json();
        const entry = payload?.data;

        if (!entry) {
          setSelfAttendanceStatus(null);
          setSelfAttendanceLocked(false);
          setSelfAttendanceMeta({});
          return;
        }

        setSelfAttendanceStatus(entry.status || null);
        setSelfAttendanceLocked(Boolean(entry.selfLocked));
        setSelfAttendanceMeta({
          isOutsideSchool: Boolean(entry.isOutsideSchool),
          distanceFromSchoolMeters:
            typeof entry.distanceFromSchoolMeters === "number"
              ? entry.distanceFromSchoolMeters
              : null,
        });
      } catch (err) {
        console.error("Self attendance fetch error:", err);
      }
    };

    fetchSelfAttendance();
  }, [schoolId, teacherId, selectedDate]);

  useEffect(() => {
    const fetchTeacherClasses = async () => {
      if (!schoolId || !teacherId) {
        setTeacherClasses([]);
        setLoadingClasses(false);
        return;
      }

      try {
        setLoadingClasses(true);
        setError("");

        const res = await fetch(`${API_URL}/api/classes/${schoolId}`);

        if (!res.ok) {
          throw new Error(`Failed to load classes (${res.status})`);
        }

        const data = await res.json();
        const allClasses = Array.isArray(data) ? data : [];

        const assignedClasses = allClasses.filter((classItem: SchoolClass) => {
          if (!classItem.classTeacher) {
            return false;
          }

          if (typeof classItem.classTeacher === "string") {
            return classItem.classTeacher === teacherId;
          }

          return classItem.classTeacher._id === teacherId;
        });

        setTeacherClasses(assignedClasses);

        if (assignedClasses.length > 0) {
          setSelectedClass((current) =>
            current && assignedClasses.some((item: SchoolClass) => item.name === current)
              ? current
              : assignedClasses[0].name
          );
        } else {
          setSelectedClass("");
        }
      } catch (err) {
        console.error("Teacher class fetch error:", err);
        setTeacherClasses([]);
        setSelectedClass("");
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchTeacherClasses();
  }, [schoolId, teacherId]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!schoolId || !selectedClass || !selectedDate) {
        setStudents([]);
        return;
      }

      try {
        setLoadingStudents(true);
        setError("");

        const res = await fetch(
          `${API_URL}/api/attendance/students/${schoolId}/${encodeURIComponent(selectedClass)}/${selectedDate}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load attendance (${res.status})`);
        }

        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Student attendance fetch error:", err);
        setStudents([]);
        setError(err instanceof Error ? err.message : "Failed to load attendance");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchAttendance();
  }, [schoolId, selectedClass, selectedDate]);

  const markAttendance = async (
    studentId: string,
    status: "Present" | "Absent"
  ) => {
    if (!schoolId || !selectedClass || !selectedDate) {
      alert("Please select class and date");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/attendance/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          schoolId,
          date: selectedDate,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save attendance");
      }

      setStudents((current) =>
        current.map((student) =>
          student.studentId === studentId
            ? {
                ...student,
                attendanceId: data.data?._id || student.attendanceId,
                status,
              }
            : student
        )
      );
    } catch (err) {
      console.error("Student attendance save error:", err);
      alert("Failed to save attendance");
    }
  };

  const getCurrentLocation = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported in this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    });

  const markSelfAttendance = async (status: "Present" | "Absent") => {
    if (!schoolId || !teacherId || !selectedDate) {
      alert("Please select date");
      return;
    }

    if (selfAttendanceLocked) {
      setSelfAttendanceMessage("Attendance is locked for this date and cannot be changed.");
      return;
    }

    try {
      setSelfAttendanceLoading(true);
      setSelfAttendanceMessage("");

      const position = await getCurrentLocation();
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      const res = await fetch(`${API_URL}/api/attendance/self`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          schoolId,
          date: selectedDate,
          status,
          location,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to mark self attendance");
      }

      setSelfAttendanceStatus(status);
      setSelfAttendanceLocked(Boolean(payload?.data?.selfLocked));
      setSelfAttendanceMeta(payload?.meta || {});

      if (payload?.meta?.isOutsideSchool) {
        setSelfAttendanceMessage("Attendance marked, but location detected outside school geofence.");
      } else {
        setSelfAttendanceMessage("Self attendance marked successfully with location.");
      }
    } catch (err) {
      console.error("Self attendance save error:", err);
      alert(err instanceof Error ? err.message : "Failed to mark self attendance");
    } finally {
      setSelfAttendanceLoading(false);
    }
  };

  const lockSelfAttendance = async () => {
    if (!schoolId || !teacherId || !selectedDate) {
      alert("Please select date");
      return;
    }

    if (!selfAttendanceStatus) {
      alert("Please mark attendance first, then lock it.");
      return;
    }

    if (selfAttendanceLocked) {
      setSelfAttendanceMessage("Attendance is already locked for this date.");
      return;
    }

    try {
      setSelfAttendanceLoading(true);
      setSelfAttendanceMessage("");

      const res = await fetch(`${API_URL}/api/attendance/self/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          schoolId,
          date: selectedDate,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to lock self attendance");
      }

      setSelfAttendanceLocked(Boolean(payload?.data?.selfLocked));
      setSelfAttendanceMessage("Attendance locked for this date.");
    } catch (err) {
      console.error("Self attendance lock error:", err);
      alert(err instanceof Error ? err.message : "Failed to lock self attendance");
    } finally {
      setSelfAttendanceLoading(false);
    }
  };

  const presentCount = students.filter((student) => student.status === "Present").length;
  const absentCount = students.filter((student) => student.status === "Absent").length;
  const total = students.length;
  const percent = total ? Math.round((presentCount / total) * 100) : 0;

  const chartData = [
    { name: "Present", value: presentCount },
    { name: "Absent", value: absentCount },
  ];

  const downloadPDF = () => {
    if (!selectedClass || !selectedDate) {
      alert("Please select class and date");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Student Attendance Report", 14, 15);

    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass}`, 14, 25);
    doc.text(`Date: ${selectedDate}`, 14, 32);

    const tableData = students.map((student) => [
      student.rollNumber,
      student.name,
      student.status || "Not Marked",
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Roll No", "Student Name", "Status"]],
      body: tableData,
    });

    doc.save(`Attendance_${selectedClass}_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">My Attendance</p>
            <p className="text-sm text-gray-500">
              {teacherName} • {selectedDate}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              Status: {selfAttendanceStatus || "Not Marked"}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              Lock: {selfAttendanceLocked ? "Locked" : "Unlocked"}
            </p>
            {typeof selfAttendanceMeta.distanceFromSchoolMeters === "number" && (
              <p className="text-xs text-gray-600">
                Distance from school: {Math.round(selfAttendanceMeta.distanceFromSchoolMeters)} m
              </p>
            )}
            {selfAttendanceMeta.isOutsideSchool && (
              <p className="text-xs mt-1 text-red-600 font-medium">Outside school area detected</p>
            )}
            {!selfAttendanceMeta.isOutsideSchool && selfAttendanceStatus && (
              <p className="text-xs mt-1 text-green-600 font-medium">Within school area</p>
            )}
            {selfAttendanceMessage && (
              <p className="text-xs mt-1 text-blue-600">{selfAttendanceMessage}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={selfAttendanceLoading || selfAttendanceLocked}
              onClick={() => markSelfAttendance("Present")}
              className={`px-3 py-1.5 rounded ${
                selfAttendanceStatus === "Present" ? "bg-green-600 text-white" : "bg-gray-100"
              }`}
            >
              {selfAttendanceLoading ? "Marking..." : "Mark Present"}
            </button>
            <button
              type="button"
              disabled={selfAttendanceLoading || selfAttendanceLocked}
              onClick={() => markSelfAttendance("Absent")}
              className={`px-3 py-1.5 rounded ${
                selfAttendanceStatus === "Absent" ? "bg-red-500 text-white" : "bg-gray-100"
              }`}
            >
              {selfAttendanceLoading ? "Marking..." : "Mark Absent"}
            </button>
            <button
              type="button"
              disabled={selfAttendanceLoading || selfAttendanceLocked || !selfAttendanceStatus}
              onClick={lockSelfAttendance}
              className={`px-3 py-1.5 rounded ${
                selfAttendanceLocked ? "bg-slate-700 text-white" : "bg-amber-500 text-white"
              }`}
            >
              {selfAttendanceLoading ? "Saving..." : selfAttendanceLocked ? "Locked" : "Lock"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div>
          <label className="mr-2 font-medium">Class:</label>
          <select
            className="border rounded px-3 py-2"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadingClasses || teacherClasses.length === 0}
          >
            <option value="">Choose Class</option>
            {teacherClasses.map((classItem) => (
              <option key={classItem._id} value={classItem.name}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Date:</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <button
          onClick={downloadPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={!selectedClass}
        >
          Download PDF
        </button>
      </div>

      {error && (
        <div className="bg-white border rounded-xl p-4 text-red-600">
          {error}
        </div>
      )}

      {loadingClasses ? (
        <div className="bg-white border rounded-xl p-4 text-center text-gray-500">
          Loading classes...
        </div>
      ) : teacherClasses.length === 0 ? (
        <div className="bg-white border rounded-xl p-4 text-center text-gray-500">
          No classes are assigned to this teacher yet.
        </div>
      ) : !selectedClass ? (
        <div className="bg-white border rounded-xl p-4 text-center text-gray-500">
          Select a class to view attendance.
        </div>
      ) : (
        <>
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

          <div className="space-y-3">
            {loadingStudents ? (
              <div className="bg-white border rounded-xl p-4 text-center text-gray-500">
                Loading attendance...
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white border rounded-xl p-4 text-center text-gray-500">
                No students found in this class.
              </div>
            ) : (
              students.map((student) => (
                <div
                  key={student.studentId}
                  className="bg-white border rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-500">
                      Roll No: {student.rollNumber} • {student.email}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => markAttendance(student.studentId, "Present")}
                      className={`px-3 py-1 rounded ${
                        student.status === "Present"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      Present
                    </button>

                    <button
                      onClick={() => markAttendance(student.studentId, "Absent")}
                      className={`px-3 py-1 rounded ${
                        student.status === "Absent"
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
        </>
      )}
    </div>
  );
}
