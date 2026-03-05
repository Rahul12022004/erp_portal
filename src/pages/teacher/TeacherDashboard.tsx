import { Clock, Users, FileText, Bell } from "lucide-react";
import { StatCard } from "@/components/StatCard";

const todayClasses = [
  { time: "8:00 AM", class: "Class 10-A", subject: "Mathematics", room: "Room 201" },
  { time: "9:00 AM", class: "Class 9-B", subject: "Mathematics", room: "Room 105" },
  { time: "11:00 AM", class: "Class 10-A", subject: "Advanced Math", room: "Lab 3" },
  { time: "1:00 PM", class: "Class 9-B", subject: "Mathematics", room: "Room 105" },
];

const announcements = [
  { title: "Staff Meeting", desc: "All teachers meeting at 4 PM in conference hall", time: "Today" },
  { title: "Exam Schedule", desc: "Mid-term exams start from March 15", time: "2 days ago" },
  { title: "Holiday Notice", desc: "School closed on March 10 for Holi", time: "3 days ago" },
];

const upcomingExams = [
  { subject: "Mathematics", class: "10-A", date: "Mar 15", type: "Mid-term" },
  { subject: "Mathematics", class: "9-B", date: "Mar 16", type: "Mid-term" },
  { subject: "Advanced Math", class: "10-A", date: "Mar 20", type: "Practical" },
];

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Classes" value={4} icon={Clock} trend="2 remaining" color="primary" />
        <StatCard title="My Students" value={165} icon={Users} trend="Across 2 classes" color="info" />
        <StatCard title="Upcoming Exams" value={3} icon={FileText} trend="This month" color="warning" />
        <StatCard title="Attendance Today" value="92%" icon={Users} trend="10-A: 95%, 9-B: 89%" trendUp color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="stat-card">
          <h3 className="text-base font-display font-semibold mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            {todayClasses.map((cls, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="text-xs font-semibold text-primary w-16">{cls.time}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{cls.class}</p>
                  <p className="text-xs text-muted-foreground">{cls.subject} · {cls.room}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="stat-card">
          <h3 className="text-base font-display font-semibold mb-4">Upcoming Exams</h3>
          <div className="space-y-3">
            {upcomingExams.map((exam, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{exam.subject}</p>
                  <p className="text-xs text-muted-foreground">{exam.class} · {exam.type}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{exam.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="stat-card">
          <h3 className="text-base font-display font-semibold mb-4">Announcements</h3>
          <div className="space-y-3">
            {announcements.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-info" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
