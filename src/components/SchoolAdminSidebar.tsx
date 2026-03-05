import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, BookOpen, ClipboardCheck, Users, UserCog,
  Monitor, FileText, DollarSign, UserPlus, Briefcase, Download, Building,
  Library, HeadphonesIcon, Bus, Package, ShoppingCart, UtensilsCrossed,
  MessageCircle, CheckSquare, ScrollText, Shield, Wrench, Settings,
  Trophy, Video, BarChart3, Store, Clock, LogOut, GraduationCap, Menu, X,
} from "lucide-react";
import { useState } from "react";

const menuGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", path: "/school", icon: LayoutDashboard },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Communication", path: "/school/communication", icon: MessageSquare },
      { title: "Academics", path: "/school/academics", icon: BookOpen },
      { title: "Attendance", path: "/school/attendance", icon: ClipboardCheck },
      { title: "Students", path: "/school/students", icon: Users },
      { title: "Staff", path: "/school/staff", icon: UserCog },
      { title: "Digital Classroom", path: "/school/digital-classroom", icon: Monitor },
      { title: "Exams", path: "/school/exams", icon: FileText },
      { title: "Time Table", path: "/school/timetable", icon: Clock },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Finance", path: "/school/finance", icon: DollarSign },
      { title: "Admissions", path: "/school/admissions", icon: UserPlus },
      { title: "HR", path: "/school/hr", icon: Briefcase },
      { title: "Transport", path: "/school/transport", icon: Bus },
      { title: "Hostel", path: "/school/hostel", icon: Building },
      { title: "Library", path: "/school/library", icon: Library },
      { title: "Inventory", path: "/school/inventory", icon: Package },
    ],
  },
  {
    label: "Services",
    items: [
      { title: "Store", path: "/school/store", icon: ShoppingCart },
      { title: "Cafeteria", path: "/school/cafeteria", icon: UtensilsCrossed },
      { title: "Bookstore", path: "/school/bookstore", icon: Store },
      { title: "Virtual Classes", path: "/school/virtual-classes", icon: Video },
      { title: "Sports", path: "/school/sports", icon: Trophy },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Approvals", path: "/school/approvals", icon: CheckSquare },
      { title: "Maintenance", path: "/school/maintenance", icon: Wrench },
      { title: "Discipline", path: "/school/discipline", icon: Shield },
      { title: "Survey", path: "/school/survey", icon: BarChart3 },
      { title: "Downloads", path: "/school/downloads", icon: Download },
      { title: "Support", path: "/school/support", icon: HeadphonesIcon },
      { title: "Logs", path: "/school/logs", icon: ScrollText },
      { title: "Settings", path: "/school/settings", icon: Settings },
    ],
  },
];

export function SchoolAdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-bg))" }}>
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
            Greenwood Academy
          </h1>
          <p className="text-xs" style={{ color: "hsl(var(--sidebar-fg))" }}>School Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/school"}
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-link ${
                    (item.path === "/school" ? location.pathname === "/school" : location.pathname.startsWith(item.path))
                      ? "active" : ""
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span className="text-[13px]">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
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
