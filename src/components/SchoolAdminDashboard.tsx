import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen, GraduationCap, Clock, Bell, CalendarDays, X } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { type DateClickArg, type EventInput, type EventClickArg } from "@fullcalendar/core";
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

type ExamItem = {
  _id: string;
  title: string;
  examType: string;
  className: string;
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
};

type CalendarFeedItem = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  type: "exam" | "finance";
  meta: string;
};

const API_BASE =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ||
  "http://localhost:5000";

const getDismissedAnnouncementsKey = (schoolId: string) =>
  `school-dashboard-dismissed-announcements:${schoolId}`;

const loadDismissedAnnouncementIds = (schoolId: string): string[] => {
  if (!schoolId) return [];

  try {
    const raw = localStorage.getItem(getDismissedAnnouncementsKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const saveDismissedAnnouncementIds = (schoolId: string, ids: string[]) => {
  if (!schoolId) return;
  localStorage.setItem(getDismissedAnnouncementsKey(schoolId), JSON.stringify(ids));
};

const parseDateTime = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCalendarDate = (value: Date) =>
  value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const toDateKey = (value: Date) => value.toLocaleDateString("en-CA");

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
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>([]);
  const [slidingAnnouncementId, setSlidingAnnouncementId] = useState<string | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState("");
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

        const schoolId = String(school._id);
        setActiveSchoolId(schoolId);
        setDismissedAnnouncementIds(loadDismissedAnnouncementIds(schoolId));

        const [dashboardRes, examsRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/${schoolId}`),
          fetch(`${API_BASE}/api/exams/school/${schoolId}`),
        ]);

        if (!dashboardRes.ok) {
          throw new Error(`Failed to load dashboard (${dashboardRes.status})`);
        }

        const data = await dashboardRes.json();

        setStats({
          totalClasses: data.stats?.totalClasses || 0,
          totalStudents: data.stats?.totalStudents || 0,
          totalTeachers: data.stats?.totalTeachers || 0,
          attendance: data.stats?.attendance || 0,
        });
        setClassData(Array.isArray(data.classData) ? data.classData : []);
        setFinanceData(Array.isArray(data.financeData) ? data.financeData : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);

        if (examsRes.ok) {
          const examData = await examsRes.json();
          setExams(Array.isArray(examData) ? examData : []);
        } else {
          setExams([]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleDismissAnnouncement = (announcementId?: string) => {
    if (!announcementId) return;

    setSlidingAnnouncementId(announcementId);

    window.setTimeout(() => {
      setDismissedAnnouncementIds((current) => {
        const next = current.includes(announcementId) ? current : [...current, announcementId];
        saveDismissedAnnouncementIds(activeSchoolId, next);
        return next;
      });
      setSlidingAnnouncementId(null);
    }, 220);
  };

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !item.id || !dismissedAnnouncementIds.includes(item.id)),
    [notifications, dismissedAnnouncementIds]
  );

  const calendarFeed = useMemo<CalendarFeedItem[]>(() => {
    const examEvents: CalendarFeedItem[] = exams
      .map((exam) => {
        const start = parseDateTime(`${exam.examDate}T${exam.startTime || "09:00"}:00`);
        if (!start) return null;

        const end = parseDateTime(`${exam.examDate}T${exam.endTime || "10:00"}:00`) || undefined;

        return {
          id: `exam-${exam._id}`,
          title: `${exam.subject} (${exam.className})`,
          start,
          end,
          allDay: false,
          type: "exam",
          meta: `${exam.examType} • ${exam.title}`,
        } satisfies CalendarFeedItem;
      })
      .filter((item): item is CalendarFeedItem => Boolean(item));

    const financeEvents: CalendarFeedItem[] = financeData.map((item, index) => {
      const start = new Date();
      start.setDate(1);
      start.setHours(9, 0, 0, 0);
      start.setMonth(start.getMonth() - (financeData.length - 1 - index));

      return {
        id: `finance-${item.month}-${index}`,
        title: `Finance Snapshot: ${item.month}`,
        start,
        allDay: false,
        type: "finance",
        meta: `Fees ${item.fees.toLocaleString("en-IN")} | Expense ${item.expense.toLocaleString("en-IN")} | Profit ${item.profit.toLocaleString("en-IN")}`,
      };
    });

    return [...examEvents, ...financeEvents].sort(
      (left, right) => left.start.getTime() - right.start.getTime()
    );
  }, [exams, financeData]);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      calendarFeed.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        allDay: item.allDay,
        classNames: [`event-${item.type}`],
        extendedProps: { meta: item.meta, type: item.type },
      })),
    [calendarFeed]
  );

  const eventsByDateKey = useMemo(() => {
    const map = new Map<string, CalendarFeedItem[]>();
    calendarFeed.forEach((item) => {
      const key = toDateKey(item.start);
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });
    return map;
  }, [calendarFeed]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDateKey.get(toDateKey(selectedDate)) || [];
  }, [selectedDate, eventsByDateKey]);

  const handleDateClick = (info: DateClickArg) => {
    setSelectedDate(info.date);
  };

  const handleEventClick = (info: EventClickArg) => {
    setSelectedDate(info.event.start || new Date());
  };

  const upcomingEvents = useMemo(
    () =>
      calendarFeed
        .filter((item) => item.start.getTime() >= Date.now())
        .slice(0, 6),
    [calendarFeed]
  );

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
          ) : visibleNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleNotifications.map((item, i) => (
                <div
                  key={item.id || i}
                  className={`p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all duration-200 ${
                    slidingAnnouncementId === item.id ? "-translate-x-5 opacity-0" : "translate-x-0 opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <button
                      onClick={() => handleDismissAnnouncement(item.id)}
                      disabled={!item.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-40"
                      aria-label="Dismiss from dashboard"
                      title="Dismiss from dashboard"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 stat-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">School Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Unified view of exam schedule and finance checkpoints.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              {calendarEvents.length} events
            </div>
          </div>

          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-sm text-muted-foreground">
              Loading calendar...
            </div>
          ) : error ? (
            <div className="h-[520px] flex items-center justify-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-2">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek",
                }}
                height={500}
                events={calendarEvents}
                eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
                dayMaxEvents={3}
                eventDisplay="block"
                dateClick={handleDateClick}
                eventClick={handleEventClick}
              />
            </div>
          )}
        </div>

        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-3">Upcoming Schedule</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading upcoming events...</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events in the current feed.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-border p-3 bg-muted/20">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatCalendarDate(event.start)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{event.meta}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div className="w-full max-w-xl rounded-xl border border-border bg-background p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Date Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDate.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm" onClick={() => setSelectedDate(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedDateEvents.length === 0 ? (
                <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">No events are scheduled for this date.</p>
              ) : (
                selectedDateEvents.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <span className="text-xs text-muted-foreground">{item.type === "exam" ? "Exam" : "Finance"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatCalendarDate(item.start)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fc {
          --fc-border-color: hsl(var(--border));
          --fc-page-bg-color: hsl(var(--background));
          --fc-neutral-bg-color: hsl(var(--muted));
          --fc-today-bg-color: hsl(var(--accent) / 0.22);
        }

        .fc .fc-toolbar-title {
          color: hsl(var(--foreground));
          font-size: 1rem;
          font-weight: 700;
        }

        .fc .fc-button {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          box-shadow: none;
        }

        .fc .fc-button:hover,
        .fc .fc-button.fc-button-active {
          background: hsl(var(--primary) / 0.88);
          border-color: hsl(var(--primary) / 0.88);
        }

        .fc .event-exam {
          background: hsl(168 80% 36%);
          border-color: hsl(168 80% 36%);
          color: hsl(0 0% 100%);
        }

        .fc .event-finance {
          background: hsl(32 95% 44%);
          border-color: hsl(32 95% 44%);
          color: hsl(0 0% 100%);
        }
      `}</style>
    </div>
  );
}
