import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, AlertCircle } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { clearStoredSessions } from "@/lib/auth";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      await new Promise((resolve) => setTimeout(resolve, 500));
      clearStoredSessions();

      login({
        id: "super_admin_001",
        email,
        name: "Super Admin",
        role: "super-admin",
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-lg">
            <Shield className="h-8 w-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">Super Admin Login</h1>
          <p className="mt-2 text-slate-300">Access platform-level controls and system settings</p>
        </div>

        <Card className="border-0 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the super admin panel</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@eduadmin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-10"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-10"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loading}
                />
                <label htmlFor="remember" className="cursor-pointer text-sm text-slate-600">
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full bg-slate-900 font-semibold text-white hover:bg-slate-800"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-center text-sm text-slate-600">
                Need another portal?{" "}
                <Link to="/teacher-login" className="font-semibold text-slate-900 hover:underline">
                  Teacher
                </Link>
                {" "}or{" "}
                <Link to="/school-admin-login" className="font-semibold text-slate-900 hover:underline">
                  School Admin
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Demo:</strong> Super admin still uses demo credentials, but it now starts from a clean session state
          </p>
        </div>
      </div>
    </div>
  );
}