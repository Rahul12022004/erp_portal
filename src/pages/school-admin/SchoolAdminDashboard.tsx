import { Users, BookOpen, GraduationCap, Clock } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const classData = [
  { name: "Primary (1-5)", students: 420, color: "hsl(168, 80%, 36%)" },
  { name: "Middle (6-8)", students: 310, color: "hsl(217, 91%, 60%)" },
  { name: "Secondary (9-10)", students: 245, color: "hsl(38, 92%, 50%)" },
  { name: "Senior (11-12)", students: 180, color: "hsl(280, 65%, 55%)" },
];

const classes = [
  { name: "Class 1-A", students: 42, section: "Primary" },
  { name: "Class 1-B", students: 40, section: "Primary" },
  { name: "Class 2-A", students: 44, section: "Primary" },
  { name: "Class 3-A", students: 38, section: "Primary" },
  { name: "Class 6-A", students: 45, section: "Middle" },
  { name: "Class 6-B", students: 43, section: "Middle" },
  { name: "Class 7-A", students: 41, section: "Middle" },
  { name: "Class 9-A", students: 40, section: "Secondary" },
  { name: "Class 9-B", students: 38, section: "Secondary" },
  { name: "Class 10-A", students: 42, section: "Secondary" },
  { name: "Class 11-A", students: 35, section: "Senior" },
  { name: "Class 12-A", students: 37, section: "Senior" },
];

export default function SchoolAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Classes" value={32} icon={BookOpen} trend="4 new this term" trendUp color="primary" />
        <StatCard title="Total Students" value="1,155" icon={Users} trend="12% this year" trendUp color="info" />
        <StatCard title="Total Teachers" value={68} icon={GraduationCap} trend="5 new hires" trendUp color="success" />
        <StatCard title="Avg Attendance" value="94.2%" icon={Clock} trend="1.5% improvement" trendUp color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="stat-card">
          <h3 className="text-base font-display font-semibold mb-4">Class Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={classData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="students" nameKey="name" paddingAngle={4}>
                {classData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Class Cards */}
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base font-display font-semibold mb-4">Classes Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {classes.map((cls) => (
              <div
                key={cls.name}
                className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <p className="text-sm font-semibold">{cls.name}</p>
                <p className="text-xs text-muted-foreground">{cls.section}</p>
                <p className="text-lg font-bold text-primary mt-1">{cls.students}</p>
                <p className="text-xs text-muted-foreground">students</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
