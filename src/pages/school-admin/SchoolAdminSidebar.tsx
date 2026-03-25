import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, BookOpen, ClipboardCheck, Users, UserCog,
  Monitor, FileText, DollarSign, UserPlus, Briefcase, Download, Building,
  Library, HeadphonesIcon, Bus, Package, ShoppingCart, UtensilsCrossed,
  CheckSquare, ScrollText, Shield, Wrench, Settings,
  Trophy, Video, BarChart3, Store, Clock, LogOut, GraduationCap, Menu, X, Share2,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRole } from "@/contexts/RoleContext";

// 🔥 ICON MAP (same as before)
const iconMap: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Communication: MessageSquare,
  Academics: BookOpen,
  Attendance: ClipboardCheck,
  Classes: Monitor,
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
  House: Shield,
  Approvals: CheckSquare,
  Maintenance: Wrench,
  Discipline: Shield,
  Survey: BarChart3,
  Downloads: Download,
  Support: HeadphonesIcon,
  Logs: ScrollText,
  Settings: Settings,
  "Social Media": Share2,
};

// 🔥 SAME GROUP STRUCTURE (NO UI CHANGE)
const menuGroups = [
  { label: "Overview", items: ["Dashboard"] },
  { label: "Academics", items: ["Communication", "Academics", "Attendance", "Classes", "Students", "Staff", "Exams", "Time Table"] },
  { label: "Administration", items: ["Finance", "Admissions", "HR", "Transport", "Hostel", "Library", "Inventory", "Social Media"] },
  { label: "Services", items: ["Sports", "House"] },
  { label: "Management", items: ["Approvals", "Maintenance", "Survey", "Downloads", "Support", "Logs", "Settings"] },
];

type SchoolSidebarData = {
  modules?: string[];
  schoolInfo?: {
    name?: string;
    logo?: string;
  };
};

export function SchoolAdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolSidebarData | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { setRole } = useRole();

  // 🔥 LOAD DATA
  useEffect(() => {
    const loadSchoolData = () => {
      const data = localStorage.getItem("school");
      setSchoolData(data ? JSON.parse(data) : null);
    };

    loadSchoolData();

    const onStorage = () => loadSchoolData();
    const onSessionUpdate = () => loadSchoolData();

    window.addEventListener("storage", onStorage);
    window.addEventListener("school-session-updated", onSessionUpdate);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("school-session-updated", onSessionUpdate);
    };
  }, []);

  const modules = schoolData?.modules || [];

  const normalizeModuleName = (value: string) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const normalizedModules = new Set(modules.map((moduleName) => normalizeModuleName(moduleName)));

  const hasModule = (moduleName: string) => normalizedModules.has(normalizeModuleName(moduleName));

  const hasModuleAccess = (item: string) =>
    item === "Social Media" ||
    hasModule(item) ||
    (item === "House" && hasModule("Discipline")) ||
    (item === "Classes" && hasModule("Digital Classroom")) ||
    (item === "Digital Classroom" && hasModule("Classes"));

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
            hasModuleAccess(item)
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
                      : item === "House"
                      ? "/school/discipline"
                      : item === "Classes"
                      ? "/school/classes"
                      : `/school/${item.toLowerCase().replace(/\s/g, "-")}`;

                  const isActive =
                    path === "/school"
                      ? location.pathname === "/school"
                      : item === "Classes"
                      ? location.pathname.startsWith("/school/classes") ||
                        location.pathname.startsWith("/school/digital-classroom")
                      : location.pathname.startsWith(path);

                  return (
                    <NavLink
                      key={item}
                      to={path}
                      end={path === "/school"}
                      onClick={() => setMobileOpen(false)}
                      className={`sidebar-link ${isActive ? "active" : ""}`}
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
            localStorage.removeItem("teacher");
            localStorage.removeItem("teacherPermissions");
            localStorage.removeItem("school");
            setRole("super-admin");
            navigate("/", { replace: true });
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
