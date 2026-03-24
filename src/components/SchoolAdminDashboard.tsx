import { useEffect, useState } from "react";
import { Users, BookOpen, GraduationCap, Clock, Bell } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type DashboardStats = {
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  attendance: number;
};

type ClassData = {
  name: string;
  students: number;
};

type FinanceData = {
  month: string;
  fees: number;
  expense: number;
  profit: number;
};

type NotificationItem = {
  id?: string;
  title: string;
  desc: string;
  time: string;
  author?: string;
};

export default function SchoolAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    attendance: 0,
  });
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [financeData, setFinanceData] = useState<FinanceData[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const COLORS = [
    "hsl(168, 80%, 36%)",
    "hsl(217, 91%, 60%)",
    "hsl(38, 92%, 50%)",
    "hsl(280, 65%, 55%)",
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const school = JSON.parse(localStorage.getItem("school") || "{}");

        if (!school?._id) {
          setError("School not found. Please log in again.");
          return;
        }

        const res = await fetch(
          `http://localhost:5000/api/dashboard/${school._id}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load dashboard (${res.status})`);
        }

        const data = await res.json();

        setStats({
          totalClasses: data.stats?.totalClasses || 0,
          totalStudents: data.stats?.totalStudents || 0,
          totalTeachers: data.stats?.totalTeachers || 0,
          attendance: data.stats?.attendance || 0,
        });
        setClassData(Array.isArray(data.classData) ? data.classData : []);
        setFinanceData(Array.isArray(data.financeData) ? data.financeData : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Cards (dynamic only, no static trend) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={BookOpen}
          color="primary"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="info"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={GraduationCap}
          color="warning"
        />
        <StatCard
          title="Avg Attendance"
          value={`${stats.attendance}%`}
          icon={Clock}
          color="success"
        />
      </div>

      {/* Charts Row (no static titles) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stat-card">
          {loading ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              Loading class distribution...
            </div>
          ) : error ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-red-600">
              {error}
            </div>
          ) : classData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              No class data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={classData}
                  dataKey="students"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={4}
                >
                  {classData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="stat-card">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Recent Announcements</h3>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading announcements...
            </p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((item, i) => (
                <div
                  key={item.id || i}
                  className="p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition"
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.time}
                  </p>
                  {item.author && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Posted by {item.author}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="stat-card">
        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
            Loading finance overview...
          </div>
        ) : error ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : financeData.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
            No finance data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={financeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="fees" fill="hsl(142, 76%, 36%)" />
              <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" />
              <Bar dataKey="profit" fill="hsl(217, 91%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
