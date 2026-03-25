import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { useRole } from "@/contexts/RoleContext";

export default function TeacherLayout() {
  const { setRole } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const forceLogout = () => {
      if (!active) return;
      localStorage.removeItem("teacher");
      localStorage.removeItem("teacherPermissions");
      setRole("super-admin");
      navigate("/", { replace: true });
    };

    const validateTeacherSession = async () => {
      const school = JSON.parse(localStorage.getItem("school") || "null");
      const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

      if (!school?._id || !teacher?._id) {
        forceLogout();
        return;
      }

      try {
        const res = await fetch(
          `https://erp-portal-1-ftwe.onrender.com/api/staff/session/${school._id}/${teacher._id}`
        );

        if (!res.ok) {
          forceLogout();
        }
      } catch {
        // Keep current session on temporary network failures.
      }
    };

    void validateTeacherSession();
    const intervalId = window.setInterval(validateTeacherSession, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [navigate, setRole]);

  return (
    <div className="flex min-h-screen w-full">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-64">
        <TopNavbar />
        <main className="flex-1 p-6 pt-20 lg:pt-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
