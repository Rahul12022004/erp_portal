import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import DashboardLayout from "./layouts/DashboardLayout";
import SchoolAdminLayout from "./layouts/SchoolAdminLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import DashboardPage from "./pages/DashboardPage";
import SchoolsPage from "./pages/SchoolsPage";
import SchoolAdminsPage from "./pages/SchoolAdminsPage";
import SchoolAdminDashboard from "./pages/school-admin/SchoolAdminDashboard";
import SchoolModulePage from "./pages/school-admin/SchoolModulePage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherModulePage from "./pages/teacher/TeacherModulePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64">
    <p className="text-lg text-muted-foreground">{title} — Coming Soon</p>
  </div>
);

function AppRoutes() {
  const { role } = useRole();

  return (
    <Routes>
      {/* Redirect based on role */}
      {role === "super-admin" && (
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route path="/school-admins" element={<SchoolAdminsPage />} />
          <Route path="/subscriptions" element={<PlaceholderPage title="Subscriptions" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="/logs" element={<PlaceholderPage title="Activity Logs" />} />
          <Route path="/security" element={<PlaceholderPage title="Security" />} />
        </Route>
      )}

      {role === "school-admin" && (
        <Route element={<SchoolAdminLayout />}>
          <Route path="/school" element={<SchoolAdminDashboard />} />
          <Route path="/school/:module" element={<SchoolModulePage />} />
        </Route>
      )}

      {role === "teacher" && (
        <Route element={<TeacherLayout />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/:module" element={<TeacherModulePage />} />
        </Route>
      )}

      {/* Catch-all redirect */}
      <Route path="*" element={
        <Navigate to={role === "super-admin" ? "/" : role === "school-admin" ? "/school" : "/teacher"} replace />
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
