import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  Monitor,
  Users,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";

type TeacherDashboardStats = {
  assignedClasses: number;
  totalStudents: number;
  digitalClasses: number;
  attendanceToday: string;
  attendanceRate: number;
};

type TeacherClassItem = {
  id: string;
  name: string;
  section: string;
  stream: string;
  academicYear: string;
  meetLink: string;
  students: number;
};

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  author?: string;
};

const defaultStats: TeacherDashboardStats = {
  assignedClasses: 0,
  totalStudents: 0,
  digitalClasses: 0,
  attendanceToday: "Not Marked",
  attendanceRate: 0,
};

export default function TeacherDashboard() {
  const [stats, setStats] = useState<TeacherDashboardStats>(defaultStats);
  const [classes, setClasses] = useState<TeacherClassItem[]>([]);
  const [digitalClasses, setDigitalClasses] = useState<TeacherClassItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const school = JSON.parse(localStorage.getItem("school") || "null");
        const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

        if (!school?._id || !teacher?._id) {
          throw new Error("Teacher session not found. Please log in again.");
        }

        const res = await fetch(
          `http://localhost:5000/api/dashboard/teacher/${school._id}/${teacher._id}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load teacher dashboard (${res.status})`);
        }

        const data = await res.json();

        setStats({
          assignedClasses: data.stats?.assignedClasses || 0,
          totalStudents: data.stats?.totalStudents || 0,
          digitalClasses: data.stats?.digitalClasses || 0,
          attendanceToday: data.stats?.attendanceToday || "Not Marked",
          attendanceRate: data.stats?.attendanceRate || 0,
        });
        setClasses(Array.isArray(data.classes) ? data.classes : []);
        setDigitalClasses(Array.isArray(data.digitalClasses) ? data.digitalClasses : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      } catch (err) {
        console.error("Teacher dashboard fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load teacher dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Classes"
          value={loading ? "..." : stats.assignedClasses}
          icon={BookOpen}
          color="primary"
        />
        <StatCard
          title="My Students"
          value={loading ? "..." : stats.totalStudents}
          icon={Users}
          color="info"
        />
        <StatCard
          title="Digital Classes"
          value={loading ? "..." : stats.digitalClasses}
          icon={Monitor}
          color="warning"
        />
        <StatCard
          title="Attendance Today"
          value={loading ? "..." : stats.attendanceToday}
          icon={ClipboardCheck}
          trend={loading ? undefined : `${stats.attendanceRate}% overall attendance`}
          trendUp={stats.attendanceRate >= 75}
          color="success"
        />
      </div>

      {error && (
        <div className="stat-card p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="stat-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">My Classes</h3>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading classes...</p>
          ) : classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes are assigned to this teacher yet.
            </p>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{classItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {classItem.section
                          ? `Section ${classItem.section}`
                          : "Section not set"}
                        {classItem.stream ? ` • ${classItem.stream}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      {classItem.students} Students
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Academic Year: {classItem.academicYear || "Not set"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stat-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Digital Classroom</h3>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading digital classes...
            </p>
          ) : digitalClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No online class links have been added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {digitalClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
                >
                  <div>
                    <p className="font-semibold">{classItem.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {classItem.section
                        ? `Section ${classItem.section}`
                        : "Section not set"}
                      {classItem.stream ? ` • ${classItem.stream}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {classItem.students} students
                    </span>
                    <a
                      href={classItem.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Join Link
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stat-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Announcements</h3>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading announcements...
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements available right now.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 space-y-2"
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                  {item.author && (
                    <p className="text-xs text-muted-foreground">
                      Posted by {item.author}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
