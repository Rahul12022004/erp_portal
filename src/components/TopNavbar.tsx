import { Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useEffect, useState } from "react";

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
  const { role } = useRole();

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
      .map((n: string) => n[0])
      .join("") || "AD";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card border-b border-border">

      {/* TITLE */}
      <div className="flex items-center gap-4">
        <div className="pl-12 lg:pl-0">
          <h2 className="page-header text-lg">{title}</h2>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-muted">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* PROFILE */}
        <div className="flex items-center gap-3 ml-2 pl-3 border-l pointer-events-none select-none">

          {/* LOGO OR INITIAL */}
          {isValidLogo ? (
            <img
              src={logo}
              className="w-8 h-8 rounded-full object-cover"
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

        </div>
      </div>
    </header>
  );
}
