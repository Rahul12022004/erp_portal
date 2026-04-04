import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, MessageCircle, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginSchoolAdmin, persistSchoolAdminSession } from "@/lib/auth";

export default function SchoolAdminLogin() {
  const navigate = useNavigate();
  const { login } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Please enter both email and password");
        setLoading(false);
        return;
      }

      const session = await loginSchoolAdmin(email, password);
      const user = {
        id: session._id || "school_admin_001",
        email,
        name: session.adminInfo?.name || email.split("@")[0],
        role: "school-admin" as const,
      };

      login(user);
      persistSchoolAdminSession(session, user);
      navigate("/school", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const schoolProfile = {
    name: "Your School",
    role: "Administrator",
    status: "online" as const,
    avatar: "https://ik.imagekit.io/fpxbgsota/memoji-alex.png?updatedAt=1752933824067",
    tag: "School Admin",
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
                    src={schoolProfile.avatar}
                    alt={schoolProfile.name}
                    className="h-full w-full rounded-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 dark:border-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {schoolProfile.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                {schoolProfile.role}
              </p>
            </div>

            {/* Tags */}
            <div className="flex justify-center gap-2 relative z-10 mb-6">
              <span className="inline-block rounded-full bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-3 py-1 text-xs font-medium shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),-2px_-2px_4px_rgba(255,255,255,0.1)] transition-all duration-300 text-blue-600 dark:text-blue-400 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                {schoolProfile.tag}
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
                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-9 rounded-lg"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-9 rounded-lg"
                  autoComplete="current-password"
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
                className="w-full h-10 mt-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-300"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-300"
              >
                Forgot password?
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-1 text-center text-xs text-slate-600 dark:text-slate-400">
                <p>
                  Are you a teacher?{" "}
                  <Link to="/teacher-login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Teacher Login
                  </Link>
                </p>
                <p>
                  Need access?{" "}
                  <Link to="/super-admin-login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Super Admin
                  </Link>
                </p>
              </div>
            </div>

            {/* Action Buttons at bottom */}
            <div className="mt-6 flex gap-2 relative z-10">
              <button className="flex-1 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.05)] hover:scale-95 active:scale-90">
                <UserPlus className="mx-auto h-4 w-4 transition-transform duration-300 hover:scale-110" />
              </button>
              <button className="flex-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.05)] hover:scale-95 active:scale-90">
                <MessageCircle className="mx-auto h-4 w-4 transition-transform duration-300 hover:scale-110" />
              </button>
            </div>
          </div>

          {/* Animated border on hover */}
          <div className="absolute inset-0 rounded-3xl border border-blue-200 dark:border-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/20 dark:border-blue-800/30 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>💡 Note:</strong> Your admin credentials were sent to your email during registration.
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
