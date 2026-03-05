import { Outlet } from "react-router-dom";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TopNavbar } from "@/components/TopNavbar";

export default function TeacherLayout() {
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
