import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { readStoredSchoolSession } from "@/lib/auth";
import { API_URL } from "@/lib/api";

type TeacherAttendance = {
  attendanceId: string | null;
  remarks: string;
  staffId: string;
  name: string;
  position: string;
  status: string | null;
};

type AttendanceRecord = {
  _id: string;
  date: string;
  status: "Present" | "Absent" | "Leave" | "Half Day";
  remarks?: string;
  staffId:
    | string
    | {
        _id?: string;
        name?: string;
        position?: string;
      };
};

type LeaveRecord = {
  _id: string;
  leaveType: "Paid" | "Unpaid" | "Emergency";
  status: "Pending" | "Approved" | "Rejected";
  teacherId:
    | string
    | {
        _id?: string;
      };
  createdAt?: string;
  title?: string;
  description?: string;
};

type TeacherMonthlyStat = {
  staffId: string;
  name: string;
  position: string;
  present: number;
  absent: number;
  leaveDays: number;
  halfDay: number;
  totalMarkedDays: number;
  attendancePercent: number;
  monthLeavesTaken: number;
  yearLeavesTaken: number;
  paidTaken: number;
  unpaidTaken: number;
  emergencyTaken: number;
  paidRemaining: number;
  unpaidRemaining: number;
  emergencyRemaining: number;
};

type StaffRecord = {
  _id: string;
  name: string;
  position: string;
  department?: string;
};

type TeacherCalendarTarget = {
  staffId: string;
  name: string;
  position: string;
};

type CalendarDayCell = {
  date: Date | null;
  iso: string | null;
  status: string | null;
  remarks?: string;
};

const COLORS = ["#22c55e", "#ef4444"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const LEAVE_LIMITS = {
  Paid: 12,
  Unpaid: 4,
  Emergency: 3,
} as const;

function DownloadDropdown({
  onDailyPDF,
  onDailyExcel,
  onMonthlyPDF,
  onMonthlyExcel,
}: {
  onDailyPDF: () => void;
  onDailyExcel: () => void;
  onMonthlyPDF: () => void;
  onMonthlyExcel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
      >
        Download
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[170px] py-1">
          <button
            onClick={() => { onDailyPDF(); setOpen(false); }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            <span className="text-red-500">📄</span> Daily PDF
          </button>
          <button
            onClick={() => { onDailyExcel(); setOpen(false); }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            <span className="text-green-600">📊</span> Daily Excel
          </button>
          <hr className="my-1" />
          <button
            onClick={() => { onMonthlyPDF(); setOpen(false); }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            <span className="text-red-500">📄</span> Monthly PDF
          </button>
          <button
            onClick={() => { onMonthlyExcel(); setOpen(false); }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            <span className="text-green-600">📊</span> Monthly Excel
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeacherAttendanceModule() {
  const now = new Date();
  const [teachers, setTeachers] = useState<TeacherAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split("T")[0]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [monthlyStats, setMonthlyStats] = useState<TeacherMonthlyStat[]>([]);
  const [teacherLeavesMap, setTeacherLeavesMap] = useState<Record<string, LeaveRecord[]>>({});
  const [teacherAttendanceMap, setTeacherAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});
  const [selectedTeacherForCalendar, setSelectedTeacherForCalendar] = useState<TeacherCalendarTarget | null>(null);
  const [calendarEditingDate, setCalendarEditingDate] = useState<string | null>(null);
  const [calendarEditStatus, setCalendarEditStatus] = useState<AttendanceRecord["status"]>("Present");
  const [calendarEditReason, setCalendarEditReason] = useState("");
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [monthlyRefreshKey, setMonthlyRefreshKey] = useState(0);
  const [geoLatitude, setGeoLatitude] = useState("");
  const [geoLongitude, setGeoLongitude] = useState("");
  const [geoRadiusMeters, setGeoRadiusMeters] = useState("200");
  const [geoLocked, setGeoLocked] = useState(false);
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [geofenceMessage, setGeofenceMessage] = useState("");

  const selectedMonth = useMemo(
    () => `${selectedYear}-${String(selectedMonthNumber).padStart(2, "0")}`,
    [selectedYear, selectedMonthNumber]
  );

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, index) => current - 5 + index);
  }, []);

  useEffect(() => {
    const school = readStoredSchoolSession();
    setSchoolId(school?._id || "");
    const location = (school as unknown as {
      schoolInfo?: {
        location?: {
          latitude?: number;
          longitude?: number;
          radiusMeters?: number;
          locked?: boolean;
        };
      };
    })?.schoolInfo?.location;
    if (location) {
      const typedLocation = location as {
        latitude?: number;
        longitude?: number;
        radiusMeters?: number;
        locked?: boolean;
      };
      if (typeof typedLocation.latitude === "number") setGeoLatitude(String(typedLocation.latitude));
      if (typeof typedLocation.longitude === "number") setGeoLongitude(String(typedLocation.longitude));
      if (typeof typedLocation.radiusMeters === "number") setGeoRadiusMeters(String(typedLocation.radiusMeters));
      setGeoLocked(Boolean(typedLocation.locked));
    }
  }, []);

  useEffect(() => {
    const fetchSchoolLocation = async () => {
      if (!schoolId) return;
      try {
        const response = await fetch(`${API_URL}/api/schools/${schoolId}`);
        if (!response.ok) return;
        const schoolData = (await response.json()) as {
          schoolInfo?: {
            location?: {
              latitude?: number;
              longitude?: number;
              radiusMeters?: number;
              locked?: boolean;
            };
          };
        };
        const location = schoolData?.schoolInfo?.location;
        if (!location) return;
        if (typeof location.latitude === "number") setGeoLatitude(String(location.latitude));
        if (typeof location.longitude === "number") setGeoLongitude(String(location.longitude));
        if (typeof location.radiusMeters === "number") setGeoRadiusMeters(String(location.radiusMeters));
        setGeoLocked(Boolean(location.locked));
      } catch (error) {
        console.error("Failed to fetch school geofence:", error);
      }
    };

    fetchSchoolLocation();
  }, [schoolId]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!schoolId || !selectedDate) {
        setTeachers([]);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `${API_URL}/api/attendance/${schoolId}/${selectedDate}?position=Teacher`
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

  useEffect(() => {
    const fetchMonthlyStats = async () => {
      if (!schoolId || !selectedMonth) {
        setMonthlyStats([]);
        setTeacherLeavesMap({});
        setTeacherAttendanceMap({});
        return;
      }

      try {
        const monthStart = `${selectedMonth}-01`;
        const monthEnd = new Date(selectedYear, selectedMonthNumber, 0).toISOString().slice(0, 10);
        const yearStart = `${selectedYear}-01-01`;
        const yearEnd = `${selectedYear}-12-31`;

        const [staffRes, attendanceRes, leavesRes] = await Promise.all([
          fetch(`${API_URL}/api/staff/${schoolId}`),
          fetch(
            `${API_URL}/api/attendance/report/${schoolId}?startDate=${monthStart}&endDate=${monthEnd}&position=Teacher`
          ),
          fetch(`${API_URL}/api/leaves/school/${schoolId}`),
        ]);

        if (!staffRes.ok || !attendanceRes.ok || !leavesRes.ok) {
          throw new Error("Failed to load monthly attendance insights");
        }

        const staffData = (await staffRes.json()) as StaffRecord[];
        const attendanceData = (await attendanceRes.json()) as AttendanceRecord[];
        const leaveData = (await leavesRes.json()) as LeaveRecord[];

        const teachersOnly = staffData.filter(
          (item) => String(item.position || "").toLowerCase() === "teacher"
        );

        const leavesByTeacher: Record<string, LeaveRecord[]> = {};
        const attendanceByTeacher: Record<string, AttendanceRecord[]> = {};
        teachersOnly.forEach((teacher) => {
          leavesByTeacher[teacher._id] = [];
          attendanceByTeacher[teacher._id] = [];
        });

        const approvedLeaves = leaveData.filter((leave) => leave.status === "Approved");

        approvedLeaves.forEach((leave) => {
          const teacherId =
            typeof leave.teacherId === "string"
              ? leave.teacherId
              : leave.teacherId?._id || "";
          if (!teacherId) return;
          if (!leavesByTeacher[teacherId]) {
            leavesByTeacher[teacherId] = [];
          }
          leavesByTeacher[teacherId].push(leave);
        });

        attendanceData.forEach((record) => {
          const teacherId =
            typeof record.staffId === "string"
              ? record.staffId
              : record.staffId?._id || "";
          if (!teacherId) return;
          if (!attendanceByTeacher[teacherId]) {
            attendanceByTeacher[teacherId] = [];
          }
          attendanceByTeacher[teacherId].push(record);
        });

        const stats: TeacherMonthlyStat[] = teachersOnly.map((teacher) => {
          const teacherAttendance = attendanceByTeacher[teacher._id] || [];

          const present = teacherAttendance.filter((row) => row.status === "Present").length;
          const absent = teacherAttendance.filter((row) => row.status === "Absent").length;
          const leaveDays = teacherAttendance.filter((row) => row.status === "Leave").length;
          const halfDay = teacherAttendance.filter((row) => row.status === "Half Day").length;
          const totalMarkedDays = teacherAttendance.length;
          const attendancePercent = totalMarkedDays
            ? Math.round(((present + halfDay * 0.5) / totalMarkedDays) * 100)
            : 0;

          const approvedLeavesForTeacher = leavesByTeacher[teacher._id] || [];

          const approvedLeavesThisMonth = approvedLeavesForTeacher.filter((leave) => {
            if (!leave.createdAt) return false;
            const leaveDate = leave.createdAt.slice(0, 10);
            return leaveDate >= monthStart && leaveDate <= monthEnd;
          });

          const approvedLeavesThisYear = approvedLeavesForTeacher.filter((leave) => {
            if (!leave.createdAt) return false;
            const leaveDate = leave.createdAt.slice(0, 10);
            return leaveDate >= yearStart && leaveDate <= yearEnd;
          });

          const paidTaken = approvedLeavesThisYear.filter((leave) => leave.leaveType === "Paid").length;
          const unpaidTaken = approvedLeavesThisYear.filter((leave) => leave.leaveType === "Unpaid").length;
          const emergencyTaken = approvedLeavesThisYear.filter((leave) => leave.leaveType === "Emergency").length;

          return {
            staffId: teacher._id,
            name: teacher.name,
            position: teacher.department || teacher.position,
            present,
            absent,
            leaveDays,
            halfDay,
            totalMarkedDays,
            attendancePercent,
            monthLeavesTaken: approvedLeavesThisMonth.length,
            yearLeavesTaken: approvedLeavesThisYear.length,
            paidTaken,
            unpaidTaken,
            emergencyTaken,
            paidRemaining: Math.max(LEAVE_LIMITS.Paid - paidTaken, 0),
            unpaidRemaining: Math.max(LEAVE_LIMITS.Unpaid - unpaidTaken, 0),
            emergencyRemaining: Math.max(LEAVE_LIMITS.Emergency - emergencyTaken, 0),
          };
        });

        setTeacherLeavesMap(leavesByTeacher);
        setTeacherAttendanceMap(attendanceByTeacher);
        setMonthlyStats(stats);
      } catch (error) {
        console.error("Monthly stats fetch error:", error);
        setTeacherLeavesMap({});
        setTeacherAttendanceMap({});
        setMonthlyStats([]);
      }
    };

    fetchMonthlyStats();
  }, [schoolId, selectedMonth, selectedYear, selectedMonthNumber, monthlyRefreshKey]);

  const markAttendance = async (teacherId: string, status: "Present" | "Absent") => {
    if (!schoolId || !selectedDate) {
      alert("Please select date");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/attendance`, {
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
      setMonthlyRefreshKey((value) => value + 1);
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

  const downloadDailyPDF = () => {
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

  const downloadDailyExcel = () => {
    if (!selectedDate) {
      alert("Please select date");
      return;
    }
    const wsData = [
      ["Teacher Name", "Subject", "Status"],
      ...teachers.map((t) => [t.name, t.position, t.status || "Not Marked"]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Teacher_Attendance_${selectedDate}.xlsx`);
  };

  const downloadMonthlyPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(
      `Teacher Monthly Attendance & Leave Report - ${MONTH_NAMES[selectedMonthNumber - 1]} ${selectedYear}`,
      14,
      14
    );

    const rows = monthlyStats.map((item) => [
      item.name,
      item.position,
      String(item.present),
      String(item.absent),
      String(item.leaveDays),
      String(item.halfDay),
      `${item.attendancePercent}%`,
      String(item.monthLeavesTaken),
      String(item.yearLeavesTaken),
      String(item.paidRemaining),
      String(item.unpaidRemaining),
      String(item.emergencyRemaining),
    ]);

    autoTable(doc, {
      startY: 22,
      head: [[
        "Teacher",
        "Role",
        "Present",
        "Absent",
        "Leave",
        "Half Day",
        "Attendance %",
        "Month Leaves",
        "Year Leaves",
        "Paid Rem.",
        "Unpaid Rem.",
        "Emergency Rem.",
      ]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Teacher_Monthly_Attendance_${selectedMonth}_${selectedYear}.pdf`);
  };

  const downloadMonthlyExcel = () => {
    const rows = monthlyStats.map((item) => ({
      Teacher: item.name,
      Role: item.position,
      Present: item.present,
      Absent: item.absent,
      Leave: item.leaveDays,
      "Half Day": item.halfDay,
      "Attendance %": item.attendancePercent,
      "Month Leaves": item.monthLeavesTaken,
      "Year Leaves": item.yearLeavesTaken,
      "Paid Remaining": item.paidRemaining,
      "Unpaid Remaining": item.unpaidRemaining,
      "Emergency Remaining": item.emergencyRemaining,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `Teacher_Monthly_Attendance_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const monthlyStatsMap = useMemo(
    () => Object.fromEntries(monthlyStats.map((item) => [item.staffId, item])),
    [monthlyStats]
  );

  const selectedTeacherLeaves = selectedTeacherForCalendar
    ? (teacherLeavesMap[selectedTeacherForCalendar.staffId] || []).filter((leave) => {
        if (!leave.createdAt) return false;
        return leave.createdAt.startsWith(String(selectedYear));
      })
    : [];

  const selectedTeacherMonthAttendance = selectedTeacherForCalendar
    ? (teacherAttendanceMap[selectedTeacherForCalendar.staffId] || []).filter((record) =>
        record.date.startsWith(selectedMonth)
      )
    : [];

  const mergedTeacherCards = useMemo(() => {
    return teachers.map((teacher) => ({
      ...teacher,
      monthly: monthlyStatsMap[String(teacher.staffId)] || null,
    }));
  }, [teachers, monthlyStatsMap]);

  const calendarDays = useMemo(() => {
    if (!selectedTeacherForCalendar) {
      return [] as CalendarDayCell[];
    }

    const firstDay = new Date(selectedYear, selectedMonthNumber - 1, 1);
    const daysInMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const approvedLeaveDates = new Set(
      (teacherLeavesMap[selectedTeacherForCalendar.staffId] || [])
        .filter((leave) => leave.status === "Approved" && leave.createdAt)
        .map((leave) => leave.createdAt!.slice(0, 10))
        .filter((iso) => iso.startsWith(selectedMonth))
    );
    const attendanceByDate = new Map(
      (teacherAttendanceMap[selectedTeacherForCalendar.staffId] || [])
        .filter((record) => record.date.startsWith(selectedMonth))
        .map((record) => [record.date, record.status])
    );

    const remarksByDate = new Map(
      (teacherAttendanceMap[selectedTeacherForCalendar.staffId] || [])
        .filter((record) => record.date.startsWith(selectedMonth))
        .map((record) => [record.date, record.remarks || ""])
    );

    const cells: CalendarDayCell[] = [];

    for (let index = 0; index < startOffset; index += 1) {
      cells.push({ date: null, iso: null, status: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(selectedYear, selectedMonthNumber - 1, day);
      const iso = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      let status = attendanceByDate.get(iso) || null;

      if (approvedLeaveDates.has(iso)) {
        status = "Approved Leave";
      }

      cells.push({ date, iso, status, remarks: remarksByDate.get(iso) || "" });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, iso: null, status: null });
    }

    return cells;
  }, [selectedTeacherForCalendar, selectedYear, selectedMonthNumber, selectedMonth, teacherLeavesMap, teacherAttendanceMap]);

  const getCalendarTone = (status: string | null) => {
    if (status === "Approved Leave" || status === "Leave") {
      return "bg-red-100 border-red-300 text-red-700";
    }
    if (status === "Present") {
      return "bg-green-100 border-green-300 text-green-700";
    }
    if (status) {
      return "bg-yellow-100 border-yellow-300 text-yellow-700";
    }
    return "bg-white border-slate-200 text-slate-400";
  };

  const changeCalendarMonth = (direction: -1 | 1) => {
    const next = new Date(selectedYear, selectedMonthNumber - 1 + direction, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonthNumber(next.getMonth() + 1);
    setCalendarEditingDate(null);
    setCalendarEditReason("");
    setCalendarMessage("");
  };

  const startCalendarEdit = (cell: CalendarDayCell) => {
    if (!cell.iso) {
      return;
    }

    setCalendarEditingDate(cell.iso);
    setCalendarEditStatus((cell.status as AttendanceRecord["status"]) || "Present");
    setCalendarEditReason(cell.remarks || "");
    setCalendarMessage("");
  };

  const saveCalendarEdit = async () => {
    if (!selectedTeacherForCalendar || !calendarEditingDate) {
      return;
    }

    const trimmedReason = calendarEditReason.trim();
    if (!trimmedReason) {
      setCalendarMessage("Reason is required before saving changes.");
      return;
    }

    try {
      setCalendarSaving(true);
      setCalendarMessage("");
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedTeacherForCalendar.staffId,
          schoolId,
          date: calendarEditingDate,
          status: calendarEditStatus,
          remarks: trimmedReason,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to update attendance");
      }

      if (calendarEditingDate === selectedDate) {
        setTeachers((current) =>
          current.map((teacher) =>
            String(teacher.staffId) === selectedTeacherForCalendar.staffId
              ? { ...teacher, status: calendarEditStatus, remarks: trimmedReason }
              : teacher
          )
        );
      }

      setMonthlyRefreshKey((value) => value + 1);
      setCalendarMessage("Attendance updated successfully.");
    } catch (error) {
      console.error("Calendar attendance update error:", error);
      setCalendarMessage(error instanceof Error ? error.message : "Failed to update attendance");
    } finally {
      setCalendarSaving(false);
    }
  };

  const lowBalanceClass = (remaining: number) => {
    if (remaining <= 1) return "bg-red-100 text-red-700";
    if (remaining <= 3) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const saveGeofence = async () => {
    if (!schoolId) {
      alert("School session not found");
      return;
    }

    const latitude = Number(geoLatitude);
    const longitude = Number(geoLongitude);
    const radiusMeters = Number(geoRadiusMeters);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      alert("Please enter valid latitude and longitude");
      return;
    }

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      alert("Please enter a valid radius in meters");
      return;
    }

    if (geoLocked) {
      setGeofenceMessage("Geofence is locked. Unlock it before making changes.");
      return;
    }

    try {
      setSavingGeofence(true);
      setGeofenceMessage("");
      const response = await fetch(`${API_URL}/api/schools/${schoolId}/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, radiusMeters }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to save geofence");
      }

      setGeofenceMessage("School geofence saved successfully.");
      try {
        localStorage.setItem("school", JSON.stringify(payload.data));
      } catch {
        // ignore localStorage errors
      }
    } catch (error) {
      console.error("Save geofence error:", error);
      setGeofenceMessage(error instanceof Error ? error.message : "Failed to save geofence");
    } finally {
      setSavingGeofence(false);
    }
  };

  const toggleGeofenceLock = async () => {
    if (!schoolId) {
      alert("School session not found");
      return;
    }

    const nextLocked = !geoLocked;

    try {
      setSavingGeofence(true);
      setGeofenceMessage("");
      const response = await fetch(`${API_URL}/api/schools/${schoolId}/location-lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: nextLocked }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to update geofence lock");
      }

      setGeoLocked(nextLocked);
      setGeofenceMessage(nextLocked ? "Geofence locked in place." : "Geofence unlocked. You can edit values now.");

      try {
        localStorage.setItem("school", JSON.stringify(payload.data));
      } catch {
        // ignore localStorage errors
      }
    } catch (error) {
      console.error("Toggle geofence lock error:", error);
      setGeofenceMessage(error instanceof Error ? error.message : "Failed to update geofence lock");
    } finally {
      setSavingGeofence(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold mb-3">School Geofence Settings</h3>
        <p className="text-sm text-gray-600 mb-3">
          Teachers marking self attendance outside this geofence will be flagged.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={geoLatitude}
              onChange={(e) => setGeoLatitude(e.target.value)}
              disabled={geoLocked || savingGeofence}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 23.0225"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={geoLongitude}
              onChange={(e) => setGeoLongitude(e.target.value)}
              disabled={geoLocked || savingGeofence}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 72.5714"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Radius (meters)</label>
            <input
              type="number"
              min={10}
              value={geoRadiusMeters}
              onChange={(e) => setGeoRadiusMeters(e.target.value)}
              disabled={geoLocked || savingGeofence}
              className="w-full border rounded px-3 py-2"
              placeholder="200"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={saveGeofence}
              disabled={savingGeofence || geoLocked}
              className="w-full bg-slate-900 text-white rounded px-3 py-2"
            >
              {savingGeofence ? "Saving..." : "Save Geofence"}
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={toggleGeofenceLock}
              disabled={savingGeofence}
              className={`w-full rounded px-3 py-2 text-white ${geoLocked ? "bg-amber-600" : "bg-emerald-600"}`}
            >
              {savingGeofence ? "Saving..." : geoLocked ? "Unlock Geofence" : "Lock Geofence"}
            </button>
          </div>
        </div>
        <p className={`mt-2 text-sm ${geoLocked ? "text-amber-700" : "text-blue-700"}`}>
          {geoLocked ? "Geofence is locked in place." : "Geofence is editable."}
        </p>
        {geofenceMessage && <p className="mt-1 text-sm text-blue-700">{geofenceMessage}</p>}
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div>
          <label className="mr-2 font-medium">Date:</label>
          <input
            type="date"
            className="border px-3 py-2 rounded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mr-2 font-medium">Year:</label>
          <select
            className="border px-3 py-2 rounded"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Month:</label>
          <select
            className="border px-3 py-2 rounded"
            value={selectedMonthNumber}
            onChange={(e) => setSelectedMonthNumber(Number(e.target.value))}
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <DownloadDropdown
          onDailyPDF={downloadDailyPDF}
          onDailyExcel={downloadDailyExcel}
          onMonthlyPDF={downloadMonthlyPDF}
          onMonthlyExcel={downloadMonthlyExcel}
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow flex justify-center">
        <PieChart width={350} height={300}>
          <Pie data={chartData} outerRadius={100} dataKey="value" label>
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

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

      <div className="bg-white rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Teacher Attendance & Leave Analytics</h3>
            <p className="text-sm text-gray-500">
              Daily attendance actions and monthly analytics are merged into one view.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="border rounded-xl p-4 text-center text-gray-500">
            Loading attendance...
          </div>
        ) : mergedTeacherCards.length === 0 ? (
          <div className="border rounded-xl p-4 text-center text-gray-500">
            No teacher attendance data available.
          </div>
        ) : (
          <div className="space-y-3">
            {mergedTeacherCards.map((teacher) => (
              <div
                key={teacher.staffId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-[180px]">
                    <p className="text-lg font-semibold">{teacher.name}</p>
                    <p className="text-sm text-slate-500">{teacher.position}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Today: {teacher.status || "Not Marked"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-slate-900 px-3 py-1.5 text-white"
                      onClick={() =>
                        setSelectedTeacherForCalendar({
                          staffId: String(teacher.staffId),
                          name: teacher.name,
                          position: teacher.position,
                        })
                      }
                    >
                      Open Calendar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
                  <MetricCard label="Present" value={teacher.monthly?.present ?? 0} />
                  <MetricCard label="Absent" value={teacher.monthly?.absent ?? 0} />
                  <MetricCard label="Leave" value={teacher.monthly?.leaveDays ?? 0} />
                  <MetricCard label="Half Day" value={teacher.monthly?.halfDay ?? 0} />
                  <MetricCard label="Attendance %" value={`${teacher.monthly?.attendancePercent ?? 0}%`} strong />
                  <MetricCard label="Month Leaves" value={teacher.monthly?.monthLeavesTaken ?? 0} />
                  <MetricCard label="Year Leaves" value={teacher.monthly?.yearLeavesTaken ?? 0} />
                  <MetricCard
                    label="Paid Remaining"
                    value={teacher.monthly?.paidRemaining ?? 0}
                    tone={lowBalanceClass(teacher.monthly?.paidRemaining ?? 0)}
                  />
                  <MetricCard
                    label="Unpaid/Emergency"
                    value={`${teacher.monthly?.unpaidRemaining ?? 0}/${teacher.monthly?.emergencyRemaining ?? 0}`}
                    tone={lowBalanceClass(
                      Math.min(
                        teacher.monthly?.unpaidRemaining ?? 0,
                        teacher.monthly?.emergencyRemaining ?? 0
                      )
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTeacherForCalendar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold">
                {selectedTeacherForCalendar.name} - {MONTH_NAMES[selectedMonthNumber - 1]} {selectedYear}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm"
                  onClick={() => changeCalendarMonth(-1)}
                >
                  Prev
                </button>
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={selectedMonthNumber}
                  onChange={(e) => setSelectedMonthNumber(Number(e.target.value))}
                >
                  {MONTH_NAMES.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm"
                  onClick={() => changeCalendarMonth(1)}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="text-sm px-2 py-1 rounded border"
                  onClick={() => setSelectedTeacherForCalendar(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div className="rounded border p-2">
                  <p className="text-gray-500">Role</p>
                  <p className="font-semibold">{selectedTeacherForCalendar.position}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-gray-500">Present Days</p>
                  <p className="font-semibold">{selectedTeacherMonthAttendance.filter((item) => item.status === "Present").length}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-gray-500">Leave Days</p>
                  <p className="font-semibold">{selectedTeacherLeaves.length}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-gray-500">Other Status</p>
                  <p className="font-semibold">{selectedTeacherMonthAttendance.filter((item) => item.status !== "Present" && item.status !== "Leave").length}</p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded border border-green-300 bg-green-100 px-2 py-1 text-green-700">Present</span>
                  <span className="rounded border border-red-300 bg-red-100 px-2 py-1 text-red-700">Leave</span>
                  <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-yellow-700">Absent / Half Day / Other</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="rounded border bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600">
                      {day}
                    </div>
                  ))}

                  {calendarDays.map((cell, index) => (
                    <div
                      key={cell.iso || `blank-${index}`}
                      className={`min-h-[78px] rounded border p-2 ${getCalendarTone(cell.status)} ${cell.iso ? "cursor-pointer" : ""}`}
                      onClick={() => startCalendarEdit(cell)}
                    >
                      {cell.date ? (
                        <>
                          <p className="text-sm font-semibold">{cell.date.getDate()}</p>
                          <p className="mt-2 text-[11px] leading-4">{cell.status || "No Mark"}</p>
                          {cell.remarks ? (
                            <p className="mt-1 line-clamp-2 text-[10px] leading-4 opacity-80">{cell.remarks}</p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {calendarEditingDate && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">Edit Attendance for {calendarEditingDate}</p>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => {
                        setCalendarEditingDate(null);
                        setCalendarEditReason("");
                        setCalendarMessage("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                    <select
                      className="rounded border px-3 py-2 text-sm"
                      value={calendarEditStatus}
                      onChange={(e) => setCalendarEditStatus(e.target.value as AttendanceRecord["status"])}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Leave">Leave</option>
                      <option value="Half Day">Half Day</option>
                    </select>

                    <input
                      type="text"
                      className="rounded border px-3 py-2 text-sm"
                      value={calendarEditReason}
                      onChange={(e) => setCalendarEditReason(e.target.value)}
                      placeholder="Reason is required for calendar edits"
                    />

                    <button
                      type="button"
                      onClick={saveCalendarEdit}
                      disabled={calendarSaving}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
                    >
                      {calendarSaving ? "Saving..." : "Save Change"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    All calendar edits require a reason and are saved directly to attendance records.
                  </p>
                  {calendarMessage ? <p className="mt-2 text-sm text-blue-700">{calendarMessage}</p> : null}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-2 py-2 text-left">Date</th>
                      <th className="border px-2 py-2 text-left">Type</th>
                      <th className="border px-2 py-2 text-left">Status</th>
                      <th className="border px-2 py-2 text-left">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeacherLeaves.length === 0 ? (
                      <tr>
                        <td className="border px-2 py-3 text-center text-gray-500" colSpan={4}>
                          No approved leave records found for this month.
                        </td>
                      </tr>
                    ) : (
                      selectedTeacherLeaves
                        .filter((leave) => leave.createdAt?.startsWith(selectedMonth))
                        .map((leave) => (
                          <tr key={leave._id}>
                            <td className="border px-2 py-2">{leave.createdAt?.slice(0, 10) || "-"}</td>
                            <td className="border px-2 py-2">{leave.leaveType}</td>
                            <td className="border px-2 py-2">{leave.status}</td>
                            <td className="border px-2 py-2">{leave.title || "-"}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${tone || "border-slate-200 bg-slate-50"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-base ${strong ? "font-bold" : "font-semibold"}`}>{value}</p>
    </div>
  );
}
