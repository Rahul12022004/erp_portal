import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, MessageCircle, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEFAULT_TEACHER_MODULES } from "@/contexts/RoleContext";
import { loginTeacher, persistTeacherSession } from "@/lib/auth";

export default function TeacherLogin() {
  const navigate = useNavigate();
  const { login, setTeacherPermissions } = useRole();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!name || !email) {
        setError("Please enter both teacher name and email");
        setLoading(false);
        return;
      }

      const session = await loginTeacher(name, email);
      const user = {
        id: session.teacher._id || "teacher_001",
        email,
        name: session.teacher.name || name,
        role: "teacher" as const,
      };

      login(user);
      persistTeacherSession(session, user, { modules: DEFAULT_TEACHER_MODULES });
      setTeacherPermissions({ modules: DEFAULT_TEACHER_MODULES });
      navigate("/teacher", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const teacherProfile = {
    name: "Welcome Teacher",
    role: "Educator",
    status: "online" as const,
    avatar: "https://ik.imagekit.io/fpxbgsota/memoji-alex.png?updatedAt=1752933824067",
    tag: "Teacher",
    isVerified: false,
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center w-full justify-center p-4 relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"
          style={{
            backgroundImage: `
              linear-gradient(rgba(156, 163, 175, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(156, 163, 175, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            animation: "gridMove 20s linear infinite",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Animated Profile Card with Integrated Login Form */}
        <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.3),-12px_-12px_24px_rgba(255,255,255,0.1)] transition-all duration-500 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.2),-20px_-20px_40px_rgba(255,255,255,1)] dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4),-20px_-20px_40px_rgba(255,255,255,0.15)]">
          <div className="p-6">
            {/* Status indicator with pulse animation */}
            <div className="absolute right-4 top-4 z-10">
              <div className="relative">
                <div className="h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 transition-all duration-300 group-hover:scale-125 bg-green-500 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"></div>
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-30"></div>
              </div>
            </div>

            {/* Profile Photo */}
            <div className="mb-4 flex justify-center relative z-10">
              <div className="relative group-hover:animate-pulse">
                <div className="h-24 w-24 overflow-hidden rounded-full bg-white dark:bg-gray-700 p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.3),inset_-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.15),inset_-8px_-8px_16px_rgba(255,255,255,1)] dark:group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.4),inset_-8px_-8px_16px_rgba(255,255,255,0.15)] group-hover:scale-110">
                  <img
                    src={teacherProfile.avatar}
                    alt={teacherProfile.name}
                    className="h-full w-full rounded-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300 group-hover:text-green-600 dark:group-hover:text-green-400">
                {teacherProfile.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                {teacherProfile.role}
              </p>
            </div>

            {/* Tags */}
            <div className="flex justify-center gap-2 relative z-10 mb-6">
              <span className="inline-block rounded-full bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 px-3 py-1 text-xs font-medium shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.1)] transition-all duration-300 text-green-600 dark:text-green-400 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                {teacherProfile.tag}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-6"></div>

            {/* Login Form - Integrated Inside Card */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="h-9 rounded-lg"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-9 rounded-lg"
                  autoComplete="email"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loading}
                />
                <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-6 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold rounded-lg transition-all duration-300"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors duration-300"
              >
                Forgot password?
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div>
                  Not a teacher?{" "}
                  <Link to="/school-admin-login" className="text-green-600 dark:text-green-400 font-semibold hover:underline">
                    School Admin Login
                  </Link>
                </div>
                <div>
                  Need access?{" "}
                  <Link to="/super-admin-login" className="font-semibold text-green-600 dark:text-green-400 hover:underline">
                    Super Admin
                  </Link>
                </div>
              </p>
            </div>

            {/* Action Buttons at bottom */}
            <div className="mt-6 flex gap-2 relative z-10">
              <button className="flex-1 rounded-full bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 py-2.5 text-sm font-medium text-green-600 dark:text-green-400 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.05)] hover:scale-95 active:scale-90">
                <UserPlus className="mx-auto h-4 w-4 transition-transform duration-300 hover:scale-110" />
              </button>
              <button className="flex-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.05)] hover:scale-95 active:scale-90">
                <MessageCircle className="mx-auto h-4 w-4 transition-transform duration-300 hover:scale-110" />
              </button>
            </div>
          </div>

          {/* Animated border on hover */}
          <div className="absolute inset-0 rounded-3xl border border-green-200 dark:border-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-green-500/10 dark:bg-green-900/20 border border-green-500/20 dark:border-green-800/30 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300">
            <strong>💡 Note:</strong> Use a valid teacher email from your school to log in. The app automatically loads your teacher session.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  );
}
