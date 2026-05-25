import { Outlet } from "react-router-dom";
import { SchoolAdminSidebar } from "@/pages/school-admin/SchoolAdminSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { DegradedBanner } from "@/components/DegradedBanner";
import { useModuleHealth } from "@/hooks/useModuleHealth";

export default function SchoolAdminLayout() {
  const { modules } = useModuleHealth();

  return (
    <div className="flex min-h-screen w-full">
      <SchoolAdminSidebar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-64">
        <TopNavbar />
        <DegradedBanner modules={modules} />
        <main className="flex-1 p-6 pt-20 lg:pt-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
