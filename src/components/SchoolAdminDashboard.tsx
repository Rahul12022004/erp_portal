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

export default function SchoolAdminDashboard() {
  const [stats, setStats] = useState<any>({
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    attendance: 0,
  });

  const [classData, setClassData] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const COLORS = [
    "hsl(168, 80%, 36%)",
    "hsl(217, 91%, 60%)",
    "hsl(38, 92%, 50%)",
    "hsl(280, 65%, 55%)",
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const school = JSON.parse(localStorage.getItem("school") || "{}");

        if (!school?._id) {
          console.error("No school found in localStorage");
          return;
        }

        const res = await fetch(
          `http://localhost:5000/api/dashboard/${school._id}`
        );

        const data = await res.json();

        setStats(data.stats || {});
        setClassData(data.classData || []);
        setFinanceData(data.financeData || []);
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={BookOpen}
          trend="4 new this term"
          trendUp
          color="primary"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          trend="12% this year"
          trendUp
          color="info"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={GraduationCap}
          trend="5 new hires"
          trendUp
          color="success"
        />
        <StatCard
          title="Avg Attendance"
          value={`${stats.attendance}%`}
          icon={Clock}
          trend="1.5% improvement"
          trendUp
          color="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pie Chart */}
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base font-semibold mb-4">
            Class Distribution
          </h3>

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
        </div>

        {/* Notifications */}
        <div className="stat-card">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h3>

          <div className="space-y-3">
            {notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No notifications
              </p>
            )}

            {notifications.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.desc}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Finance Bar Chart */}
      <div className="stat-card">
        <h3 className="text-base font-semibold mb-4">
          Finance Overview
        </h3>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={financeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />

            <Bar
              dataKey="fees"
              name="Fees Collected"
              fill="hsl(142, 76%, 36%)"
            />
            <Bar
              dataKey="expense"
              name="Expenses"
              fill="hsl(0, 84%, 60%)"
            />
            <Bar
              dataKey="profit"
              name="Profit"
              fill="hsl(217, 91%, 60%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}