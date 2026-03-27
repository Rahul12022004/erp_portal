import { Bell, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SchoolSessionData = {
  adminInfo?: {
    name?: string;
    email?: string;
  };
  schoolInfo?: {
    logo?: string;
  };
};

type TeacherSessionData = {
  name?: string;
  email?: string;
};

const superAdminTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/schools": "Schools Management",
  "/school-admins": "School Admins",
  "/subscriptions": "Subscriptions",
  "/settings": "Settings",
  "/logs": "Activity Logs",
  "/security": "Security",
  "/user-change": "User Change",
};

function readJsonStorage<T>(key: string): T | null {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function getPageTitle(pathname: string, role: string) {
  if (role === "super-admin") {
    return superAdminTitles[pathname] || "Dashboard";
  }

  if (role === "school-admin" && pathname === "/school") {
    return "School Dashboard";
  }

  if (role === "teacher" && pathname === "/teacher") {
    return "Teacher Dashboard";
  }

  const segment = pathname.split("/").filter(Boolean).pop() || "dashboard";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useRole();

  const [schoolData, setSchoolData] = useState<SchoolSessionData | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherSessionData | null>(null);

  useEffect(() => {
    const loadSessionData = () => {
      setSchoolData(readJsonStorage<SchoolSessionData>("school"));
      setTeacherData(readJsonStorage<TeacherSessionData>("teacher"));
    };

    loadSessionData();

    window.addEventListener("storage", loadSessionData);
    window.addEventListener("school-session-updated", loadSessionData);

    return () => {
      window.removeEventListener("storage", loadSessionData);
      window.removeEventListener("school-session-updated", loadSessionData);
    };
  }, []);

  const title = getPageTitle(location.pathname, role);

  const displayName =
    role === "school-admin"
      ? schoolData?.adminInfo?.name || "School Admin"
      : role === "teacher"
      ? teacherData?.name || "Teacher"
      : "Super Admin";

  const displayEmail =
    role === "school-admin"
      ? schoolData?.adminInfo?.email || "school-admin@mail.com"
      : role === "teacher"
      ? teacherData?.email || "teacher@mail.com"
      : "admin@eduadmin.com";

  const logo = schoolData?.schoolInfo?.logo;
  const hasValidLogo = Boolean(
    logo && (logo.startsWith("data:image") || logo.startsWith("http")),
  );

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  const handleLogout = () => {
    const activeRole = role;
    logout();

    if (activeRole === "super-admin") {
      navigate("/super-admin-login", { replace: true });
      return;
    }

    if (activeRole === "school-admin") {
      navigate("/school-admin-login", { replace: true });
      return;
    }

    navigate("/teacher-login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace from one place.</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 rounded-full border border-border px-2 py-1.5 transition-colors hover:bg-muted"
            >
              {hasValidLogo ? (
                <img
                  src={logo}
                  alt={displayName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </div>
              )}

              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>

              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
