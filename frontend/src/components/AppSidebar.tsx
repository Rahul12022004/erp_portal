import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  School,
  UserCog,
  Users,
  CreditCard,
  Settings,
  ScrollText,
  Shield,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Schools", path: "/schools", icon: School },
  { title: "School Admins", path: "/school-admins", icon: UserCog },
  { title: "Subscriptions", path: "/subscriptions", icon: CreditCard },
  { title: "User Change", path: "/user-change", icon: Users },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Logs", path: "/logs", icon: ScrollText },
  { title: "Security", path: "/security", icon: Shield },
];

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-bg))" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
            EduAdmin
          </h1>
          <p className="text-xs" style={{ color: "hsl(var(--sidebar-fg))" }}>Super Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}>
          Main Menu
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${
              (item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path))
                ? "active"
                : ""
            }`}
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-sm"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col z-40">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
