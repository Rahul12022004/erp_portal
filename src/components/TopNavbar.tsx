import { Bell, LogOut, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const superAdminTitles: Record<string, string> = {
  "/": "Dashboard",
  "/schools": "Schools Management",
  "/school-admins": "School Admins",
  "/subscriptions": "Subscriptions",
  "/settings": "Settings",
  "/logs": "Activity Logs",
  "/security": "Security",
};

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, user } = useRole();

  const [schoolData, setSchoolData] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);

  // 🔥 LOAD FROM LOCAL STORAGE
  useEffect(() => {
    const loadSessionData = () => {
      const school = localStorage.getItem("school");
      const teacher = localStorage.getItem("teacher");

      setSchoolData(school ? JSON.parse(school) : null);
      setTeacherData(teacher ? JSON.parse(teacher) : null);
    };

    loadSessionData();

    const onStorage = () => loadSessionData();
    const onSessionUpdate = () => loadSessionData();

    window.addEventListener("storage", onStorage);
    window.addEventListener("school-session-updated", onSessionUpdate);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("school-session-updated", onSessionUpdate);
    };
  }, [role]);

  // ==========================
  // TITLE LOGIC
  // ==========================
  let title = "Dashboard";

  if (role === "super-admin") {
    title = superAdminTitles[location.pathname] || "Dashboard";
  } else if (role === "school-admin") {
    if (location.pathname === "/school") title = "School Dashboard";
    else {
      const seg = location.pathname.split("/").pop() || "";
      title = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    }
  } else {
    if (location.pathname === "/teacher") title = "Teacher Dashboard";
    else {
      const seg = location.pathname.split("/").pop() || "";
      title = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    }
  }

  // ==========================
  // ADMIN DATA
  // ==========================
  const adminName =
    role === "school-admin"
      ? schoolData?.adminInfo?.name
      : role === "super-admin"
      ? "Super Admin"
      : teacherData?.name || "Teacher";

  const adminEmail =
    role === "school-admin"
      ? schoolData?.adminInfo?.email
      : role === "super-admin"
      ? "admin@eduadmin.com"
      : teacherData?.email || "teacher@mail.com";

  const logo = schoolData?.schoolInfo?.logo;

  const isValidLogo =
    logo &&
    (logo.startsWith("data:image") || logo.startsWith("http"));

  const initials =
    adminName
      ?.split(" ")
      .map((n: string) =

  const handleLogout = () => {
    logout();
    // Redirect to appropriate login page based on role
    if (role === "teacher") {
      navigate("/teacher-login");
    } else if (role === "school-admin") {
      navigate("/school-admin-login");
    } else {
      navigate("/teacher-login");
    }
  };> n[0])
      .join("") || "AD";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card border-b border-border">

      {/* TITLE */}
      <div className="flex items-center gap-4">
        <div classNaDROPDOWN */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 ml-2 pl-3 border-l cursor-pointer hover:opacity-80 transition-opacity">
              {/* LOGO OR INITIAL */}
              {isValidLogo ? (
                <img
                  src={logo}
                  className="w-8 h-8 rounded-full object-cover"
                  alt="Profile"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">
                    {initials}
                  </span>
                </div>
              )}

              {/* NAME + EMAIL */}
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{adminName}</p>
                <p className="text-xs text-muted-foreground">
                  {adminEmail}
                </p>
              </div>

              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">{adminName}</p>
              <p className="text-xs text-muted-foreground">{adminEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu </span>
            </div>
          )}

          {/* NAME + EMAIL */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{adminName}</p>
            <p className="text-xs text-muted-foreground">
              {adminEmail}
            </p>
          </div>

        </div>
      </div>
    </header>
  );
}
