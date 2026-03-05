import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const moduleNames = {
  communication: "Communication",
  academics: "Academics",
  attendance: "Attendance",
  "digital-classroom": "Digital Classroom",
  exams: "Exams",
  finance: "Finance",
  admissions: "Admissions",
  hr: "Human Resources",
  transport: "Transport",
  hostel: "Hostel Management",
  library: "Library",
  inventory: "Inventory",
  store: "Store",
  cafeteria: "Cafeteria",
  bookstore: "Bookstore",
  "virtual-classes": "Virtual Classes",
  sports: "Sports",
  approvals: "Approvals",
  maintenance: "Maintenance",
  discipline: "Discipline",
  survey: "Survey",
  downloads: "Downloads",
  support: "Support",
  logs: "Activity Logs",
  settings: "Settings",
  timetable: "Time Table",
};

const attendanceRecords = [
  { id: 1, student: "Aisha Patel", className: "10-A", roll: "S1001", status: "Present", updatedAt: "09:00 AM" },
  { id: 2, student: "Rohan Sharma", className: "10-A", roll: "S1002", status: "Absent", updatedAt: "09:03 AM" },
  { id: 3, student: "Priya Singh", className: "9-B", roll: "S1003", status: "Present", updatedAt: "08:58 AM" },
  { id: 4, student: "Karan Mehta", className: "9-B", roll: "S1004", status: "Late", updatedAt: "09:12 AM" },
  { id: 5, student: "Sneha Gupta", className: "8-A", roll: "S1005", status: "Present", updatedAt: "08:55 AM" },
  { id: 6, student: "Mohammed Ali", className: "8-A", roll: "S1006", status: "Absent", updatedAt: "09:05 AM" },
];

const COLORS = {
  Present: "#22c55e",
  Absent: "#ef4444",
  Late: "#f59e0b",
};

function AttendanceModule() {
  const classes = useMemo(
    () => Array.from(new Set(attendanceRecords.map((record) => record.className))),
    []
  );

  const [selectedClass, setSelectedClass] = useState(classes[0] ?? "");

  const classAttendance = attendanceRecords.filter(
    (record) => record.className === selectedClass
  );

  const attendanceSummary = useMemo(() => {
    const summary = { Present: 0, Absent: 0, Late: 0 };

    classAttendance.forEach((record) => {
      summary[record.status]++;
    });

    return Object.keys(summary).map((key) => ({
      name: key,
      value: summary[key],
    }));
  }, [classAttendance]);

  return (
    <div className="stat-card space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Class Attendance</h3>
          <p className="text-sm text-muted-foreground">
            Select a class to view today's attendance
          </p>
        </div>

        <div className="w-full sm:w-56">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((className) => (
                <SelectItem key={className} value={className}>
                  Class {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClass ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Updated At</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {classAttendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.student}
                  </TableCell>

                  <TableCell>{record.roll}</TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        record.status === "Absent" ? "destructive" : "default"
                      }
                      className={
                        record.status === "Late"
                          ? "bg-yellow-500 text-white"
                          : ""
                      }
                    >
                      {record.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right text-muted-foreground">
                    {record.updatedAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="w-full h-80">
            <h3 className="text-base font-semibold mb-4">
              Attendance Distribution
            </h3>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceSummary}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {attendanceSummary.map((entry, index) => (
                    <Cell key={index} fill={COLORS[entry.name]} />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No classes are available for attendance.
        </p>
      )}
    </div>
  );
}

export default function SchoolModulePage() {
  const { module } = useParams();
  const title = moduleNames[module || ""] || module || "Module";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foregroaund">
          Manage {title.toLowerCase()} for your school
        </p>
      </div>

      {module === "attendance" ? (
        <AttendanceModule />
      ) : (
        <div className="stat-card flex items-center justify-center h-64">
          <p className="text-lg text-muted-foreground">
            {title} — Coming Soon
          </p>
        </div>
      )}
    </div>
  );
}