import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, BarChart3, Shield } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Teacher Portal",
      description: "Manage classes, assignments, and student progress in one place",
    },
    {
      icon: Users,
      title: "School Admin Dashboard",
      description: "Oversee entire school operations and manage all departments",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Get insights into school performance with detailed reports",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="font-bold text-slate-900">ERP</span>
            </div>
            <span className="text-white font-semibold">EduAdmin Portal</span>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Education Management Made Simple
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              A comprehensive platform for teachers and school administrators to streamline educational operations
            </p>
            <button
              type="button"
              onClick={() => navigate("/super-admin-login")}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <Shield className="h-4 w-4" />
              Super Admin Login
            </button>
          </div>

          {/* Login Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
            {/* Teacher Login Card */}
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur hover:shadow-3xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Teacher Login</CardTitle>
                <CardDescription>Access your teaching dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-6">
                  Manage classes, track student progress, and create assignments
                </p>
                <Button
                  onClick={() => navigate("/teacher-login")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue as Teacher
                </Button>
              </CardContent>
            </Card>

            {/* School Admin Login Card */}
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur hover:shadow-3xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>School Admin Login</CardTitle>
                <CardDescription>Access admin panel</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-6">
                  Manage school operations, staff, students, and resources
                </p>
                <Button
                  onClick={() => navigate("/school-admin-login")}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continue as Admin
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-lg bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
                >
                  <Icon className="w-8 h-8 text-white mb-4" />
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-300 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 py-8 border-t border-slate-700/30 text-center text-slate-400">
          <p>&copy; 2024 EduAdmin. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
