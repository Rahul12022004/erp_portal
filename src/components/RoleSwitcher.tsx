import { useState } from "react";
import { useRole, UserRole, DEFAULT_TEACHER_MODULES } from "@/contexts/RoleContext";
import { loginSchoolAdmin, loginTeacher } from "@/lib/auth";
import { Shield, School, GraduationCap, type LucideIcon } from "lucide-react";

const roles: { value: UserRole; label: string; icon: LucideIcon }[] = [
  { value: "super-admin", label: "Super Admin", icon: Shield },
  { value: "school-admin", label: "School Admin", icon: School },
  { value: "teacher", label: "Teacher", icon: GraduationCap },
];

export function RoleSwitcher() {
  const { role, setRole, setTeacherPermissions } = useRole();

  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // ==========================
  // 🔥 HANDLE ROLE CLICK
  // ==========================
  const handleRoleClick = (r: UserRole) => {
    if (r === "school-admin" || r === "teacher") {
      setSelectedRole(r);
      setName("");
      setEmail("");
      setPassword("");
      setShowLogin(true);
    } else {
      setRole(r);
    }
  };

  // ==========================
  // 🔐 LOGIN API CALL
  // ==========================
  const handleLogin = async () => {
    if (selectedRole === "school-admin") {
      if (!email) return alert("Enter email");
      if (!password) return alert("Enter password");
    }

    if (selectedRole === "teacher") {
      if (!name) return alert("Enter teacher name");
      if (!email) return alert("Enter teacher email");
    }

    try {
      setLoading(true);

      if (selectedRole === "school-admin") {
        try {
          const data = await loginSchoolAdmin(email, password);

          localStorage.setItem("school", JSON.stringify(data));
          localStorage.removeItem("teacher");
          window.dispatchEvent(new Event("school-session-updated"));
          setRole("school-admin");
          setShowLogin(false);
        } catch (error) {
          alert(error instanceof Error ? error.message : "School admin login failed");
        }

        return;
      }

      if (selectedRole === "teacher") {
        try {
          const data = await loginTeacher(name, email);

          localStorage.setItem("teacher", JSON.stringify(data.teacher));
          localStorage.setItem("school", JSON.stringify(data.school));
          setTeacherPermissions({ modules: DEFAULT_TEACHER_MODULES });
          window.dispatchEvent(new Event("school-session-updated"));
          setRole("teacher");
          setShowLogin(false);
        } catch (error) {
          alert(error instanceof Error ? error.message : "Teacher login failed");
        }
      }

    } catch (err) {
      console.error(err);
      alert("Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ROLE SWITCH */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => handleRoleClick(r.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
              role === r.value
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-black"
            }`}
          >
            <r.icon className="w-3.5 h-3.5" />
            {r.label}
          </button>
        ))}
      </div>

      {/* 🔐 LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[350px] space-y-4">

            <h2 className="text-lg font-semibold text-center">
              {selectedRole === "teacher" ? "Teacher Login" : "School Admin Login"}
            </h2>

            {selectedRole === "teacher" && (
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
              placeholder={selectedRole === "teacher" ? "Teacher Email" : "Admin Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2 rounded"
            />

            {selectedRole === "school-admin" && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-2 rounded"
              />
            )}

            <div className="flex justify-between gap-2">
              <button
                onClick={() => setShowLogin(false)}
                className="w-full bg-gray-200 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded"
              >
                {loading ? "Logging..." : "Login"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
