import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "@/contexts/RoleContext";

import DashboardLayout from "./layouts/DashboardLayout";
import SchoolAdminLayout from "./layouts/SchoolAdminLayout";
import TeacherLayout from "./layouts/TeacherLayout";

// ✅ SUPER ADMIN PAGES
import DashboardPage from "./pages/super_admin/DashboardPage";
import SchoolsPage from "./pages/super_admin/SchoolsPage";
import SchoolAdminsPage from "./pages/super_admin/SchoolAdminsPage";
import SubscriptionsPage from "./pages/super_admin/Subscription";
import LogsPage from "./pages/super_admin/LogsPage";
import UserChangePage from "./pages/super_admin/UserChangePage";

// ✅ FIXED IMPORT (make sure file name matches)
import SettingsPage from "./pages/super_admin/SettingsPage";

// SCHOOL ADMIN
import SchoolAdminDashboard from "./components/SchoolAdminDashboard";
import SchoolModulePage from "./pages/school-admin/SchoolModulePage";

// TEACHER
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherModulePage from "./pages/teacher/TeacherModulePage";

// LOGIN PAGES
import TeacherLogin from "./pages/TeacherLogin";
import SchoolAdminLogin from "./pages/SchoolAdminLogin";
import LandingPage from "./pages/LandingPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useRole();
  
  if (!isAuthenticated) {
    return <Navigate to="/teacher-login" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { role, isAuthenticated } = useRole();

  return (
    <Routes>
      {/* 🏠 LANDING PAGE - Show when not authenticated */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate
              to={
                role === "super-admin"
                  ? "/dashboard"
                  : role === "school-admin"
                  ? "/school"
                  : "/teacher"
              }
              replace
            />
          ) : (
            <LandingPage />
          )
        } 
      />

      {/* 🔐 PUBLIC LOGIN PAGES */}
      <Route path="/teacher-login" element={<TeacherLogin />} />
      <Route path="/school-admin-login" element={<SchoolAdminLogin />} />

      {/* 🔥 SUPER ADMIN - Protected */}
      {isAuthenticated && role === "super-admin" && (
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route path="/school-admins" element={<SchoolAdminsPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/user-change" element={<UserChangePage />} />
          <Route path="/security" element={<div>Security Coming Soon</div>} />
        </Route>
      )}

      {/* 🏫 SCHOOL ADMIN - Protected */}
      {isAuthenticated && role === "school-admin" && (
        <Route element={<SchoolAdminLayout />}>
          <Route path="/school" element={<SchoolAdminDashboard />} />
          <Route path="/school/:module" element={<SchoolModulePage />} />
        </Route>
      )}

      {/* 👨‍🏫 TEACHER - Protected */}
      {isAuthenticated && role === "teacher" && (
        <Route element={<TeacherLayout />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/:module" element={<TeacherModulePage />} />
        </Route>
      )}

      {/* 🔁 FALLBACK - Redirect to login if not authenticated */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate
              to={
                role === "super-admin"
                  ? "/"
                  : role === "school-admin"
                  ? "/school"
                  : "/teacher"
              }
              replace
            />
          ) : (
            <Navigate to="/teacher-login" replace />
          )
        }
      />
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