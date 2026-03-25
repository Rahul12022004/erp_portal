import { useState } from "react";
import { GraduationCap, School } from "lucide-react";
import { DEFAULT_TEACHER_MODULES, useRole } from "@/contexts/RoleContext";

type TargetRole = "school-admin" | "teacher";

export default function UserChangePage() {
  const { setRole, setTeacherPermissions } = useRole();
  const [targetRole, setTargetRole] = useState<TargetRole | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const openRoleLogin = (role: TargetRole) => {
    setTargetRole(role);
    setName("");
    setEmail("");
    setPassword("");
    setShowLogin(true);
  };

  const handleLogin = async () => {
    if (!targetRole) return;

    if (targetRole === "school-admin") {
      if (!email) return alert("Enter admin email");
      if (!password) return alert("Enter password");
    }

    if (targetRole === "teacher") {
      if (!name) return alert("Enter teacher name");
      if (!email) return alert("Enter teacher email");
    }

    try {
      setLoading(true);

      if (targetRole === "school-admin") {
        const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/schools/admin/${email}`);
        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Login failed");
          return;
        }

        if (data.adminInfo.password !== password) {
          alert("Wrong password");
          return;
        }

        localStorage.setItem("school", JSON.stringify(data));
        localStorage.removeItem("teacher");
        window.dispatchEvent(new Event("school-session-updated"));
        setRole("school-admin");
        setShowLogin(false);
        return;
      }

      const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Teacher login failed");
        return;
      }

      localStorage.setItem("teacher", JSON.stringify(data.teacher));
      localStorage.setItem("school", JSON.stringify(data.school));
      setTeacherPermissions({ modules: DEFAULT_TEACHER_MODULES });
      window.dispatchEvent(new Event("school-session-updated"));
      setRole("teacher");
      setShowLogin(false);
    } catch (error) {
      console.error(error);
      alert("Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <h2 className="text-xl font-semibold">User Change</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a user type and continue with login details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => openRoleLogin("school-admin")}
          className="stat-card p-6 text-left hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <School className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">School Admin</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Login as a school admin using admin email and password.
          </p>
        </button>

        <button
          onClick={() => openRoleLogin("teacher")}
          className="stat-card p-6 text-left hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Teacher</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Login as a teacher using teacher name and email.
          </p>
        </button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[360px] space-y-4">
            <h2 className="text-lg font-semibold text-center">
              {targetRole === "teacher" ? "Teacher Login" : "School Admin Login"}
            </h2>

            {targetRole === "teacher" && (
              <input
                type="text"
                placeholder="Teacher Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-2 rounded"
              />
            )}

            <input
              type="email"
              placeholder={targetRole === "teacher" ? "Teacher Email" : "Admin Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2 rounded"
            />

            {targetRole === "school-admin" && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-2 rounded"
              />
            )}

            <div className="flex justify-between gap-2">
              <button onClick={() => setShowLogin(false)} className="w-full bg-gray-200 py-2 rounded">
                Cancel
              </button>
              <button onClick={handleLogin} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
                {loading ? "Logging..." : "Login"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
