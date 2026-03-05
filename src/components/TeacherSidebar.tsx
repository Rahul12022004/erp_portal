import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, ClipboardCheck, FileText, BookOpen,
  Monitor, Clock, MessageSquare, PenTool, LogOut, GraduationCap, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { useRole } from "@/contexts/RoleContext";

const allTeacherModules = [
  { id: "dashboard", title: "Dashboard", path: "/teacher", icon: LayoutDashboard },
  { id: "students", title: "Students", path: "/teacher/students", icon: Users },
  { id: "attendance", title: "Attendance", path: "/teacher/attendance", icon: ClipboardCheck },
  { id: "assignments", title: "Assignments", path: "/teacher/assignments", icon: PenTool },
  { id: "marks", title: "Marks", path: "/teacher/marks", icon: FileText },
  { id: "exams", title: "Exams", path: "/teacher/exams", icon: BookOpen },
  { id: "digital-classroom", title: "Digital Classroom", path: "/teacher/digital-classroom", icon: Monitor },
  { id: "timetable", title: "Time Table", path: "/teacher/timetable", icon: Clock },
  { id: "communication", title: "Communication", path: "/teacher/communication", icon: MessageSquare },
];

export function TeacherSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { teacherPermissions } = useRole();

  const visibleModules = allTeacherModules.filter(
    (m) => m.id === "dashboard" || teacherPermissions.modules.includes(m.id)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-bg))" }}>
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
            Teacher Portal
          </h1>
          <p className="text-xs" style={{ color: "hsl(var(--sidebar-fg))" }}>Mr. John Smith</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}>
          My Modules
        </p>
        {visibleModules.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/teacher"}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${
              (item.path === "/teacher" ? location.pathname === "/teacher" : location.pathname.startsWith(item.path))
                ? "active" : ""
            }`}
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <button className="sidebar-link w-full hover:!text-destructive">
          <LogOut className="w-[18px] h-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-sm"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col z-40">
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">{sidebarContent}</aside>
        </>
      )}
    </>
  );
}
