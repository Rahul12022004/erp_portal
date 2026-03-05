import { Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useRole } from "@/contexts/RoleContext";

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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <div className="pl-12 lg:pl-0">
          <h2 className="page-header text-lg">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <RoleSwitcher />

        <button className="p-2 rounded-lg hover:bg-muted transition-colors">
          <Search className="w-[18px] h-[18px] text-muted-foreground" />
        </button>

        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-foreground">
              {role === "super-admin" ? "SA" : role === "school-admin" ? "AD" : "TR"}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">
              {role === "super-admin" ? "Super Admin" : role === "school-admin" ? "School Admin" : "Mr. John Smith"}
            </p>
            <p className="text-xs text-muted-foreground">
              {role === "super-admin" ? "admin@eduadmin.com" : role === "school-admin" ? "admin@greenwood.edu" : "john@greenwood.edu"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
