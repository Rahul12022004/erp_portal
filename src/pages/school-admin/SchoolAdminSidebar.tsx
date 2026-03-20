import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, BookOpen, ClipboardCheck, Users, UserCog,
  Monitor, FileText, DollarSign, UserPlus, Briefcase, Download, Building,
  Library, HeadphonesIcon, Bus, Package, ShoppingCart, UtensilsCrossed,
  CheckSquare, ScrollText, Shield, Wrench, Settings,
  Trophy, Video, BarChart3, Store, Clock, LogOut, GraduationCap, Menu, X,
} from "lucide-react";
import { useState, useEffect } from "react";

// 🔥 ICON MAP (same as before)
const iconMap: Record<string, any> = {
  Dashboard: LayoutDashboard,
  Communication: MessageSquare,
  Academics: BookOpen,
  Attendance: ClipboardCheck,
  Students: Users,
  Staff: UserCog,
  "Digital Classroom": Monitor,
  Exams: FileText,
  "Time Table": Clock,
  Finance: DollarSign,
  Admissions: UserPlus,
  HR: Briefcase,
  Transport: Bus,
  Hostel: Building,
  Library: Library,
  Inventory: Package,
  Store: ShoppingCart,
  Cafeteria: UtensilsCrossed,
  Bookstore: Store,
  "Virtual Classes": Video,
  Sports: Trophy,
  Approvals: CheckSquare,
  Maintenance: Wrench,
  Discipline: Shield,
  Survey: BarChart3,
  Downloads: Download,
  Support: HeadphonesIcon,
  Logs: ScrollText,
  Settings: Settings,
};

// 🔥 SAME GROUP STRUCTURE (NO UI CHANGE)
const menuGroups = [
  { label: "Overview", items: ["Dashboard"] },
  { label: "Academics", items: ["Communication", "Academics", "Attendance", "Students", "Staff", "Digital Classroom", "Exams", "Time Table"] },
  { label: "Administration", items: ["Finance", "Admissions", "HR", "Transport", "Hostel", "Library", "Inventory"] },
  { label: "Services", items: ["Store", "Cafeteria", "Bookstore", "Virtual Classes", "Sports"] },
  { label: "Management", items: ["Approvals", "Maintenance", "Discipline", "Survey", "Downloads", "Support", "Logs", "Settings"] },
];

export function SchoolAdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const location = useLocation();

  // 🔥 LOAD DATA
  useEffect(() => {
    const data = localStorage.getItem("school");
    if (data) setSchoolData(JSON.parse(data));
  }, []);

  const modules = schoolData?.modules || [];

  const schoolName = schoolData?.schoolInfo?.name || "School";
  const logo = schoolData?.schoolInfo?.logo;

  const isValidLogo =
    logo &&
    (logo.startsWith("data:image") || logo.startsWith("http"));

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-bg))" }}>

      {/* 🔥 HEADER (ONLY DATA CHANGED) */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        
        {isValidLogo ? (
          <img src={logo} className="w-9 h-9 rounded-lg object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
        )}

        <div>
          <h1 className="text-sm font-display font-bold" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
            {schoolName}
          </h1>
          <p className="text-xs" style={{ color: "hsl(var(--sidebar-fg))" }}>
            School Admin
          </p>
        </div>
      </div>

      {/* 🔥 MENU (FILTER FROM BACKEND) */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => {

          // ✅ FILTER ONLY ENABLED MODULES
          const filteredItems = group.items.filter((item) =>
            modules.includes(item)
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}>
                {group.label}
              </p>

              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const Icon = iconMap[item] || LayoutDashboard;

                  const path =
                    item === "Dashboard"
                      ? "/school"
                      : `/school/${item.toLowerCase().replace(/\s/g, "-")}`;

                  return (
                    <NavLink
                      key={item}
                      to={path}
                      end={path === "/school"}
                      onClick={() => setMobileOpen(false)}
                      className={`sidebar-link ${
                        (path === "/school"
                          ? location.pathname === "/school"
                          : location.pathname.startsWith(path))
                          ? "active"
                          : ""
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="text-[13px]">{item}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* LOGOUT (UNCHANGED UI) */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <button
          onClick={() => {
            localStorage.removeItem("school");
            localStorage.removeItem("role");
            window.location.reload();
          }}
          className="sidebar-link w-full hover:!text-destructive"
        >
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
          <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}