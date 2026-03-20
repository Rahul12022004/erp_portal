import { useState } from "react";
import { useRole, UserRole } from "@/contexts/RoleContext";
import { Shield, School, GraduationCap } from "lucide-react";

const roles: { value: UserRole; label: string; icon: any }[] = [
  { value: "super-admin", label: "Super Admin", icon: Shield },
  { value: "school-admin", label: "School Admin", icon: School },
  { value: "teacher", label: "Teacher", icon: GraduationCap },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // ==========================
  // 🔥 HANDLE ROLE CLICK
  // ==========================
  const handleRoleClick = (r: UserRole) => {
    if (r === "school-admin") {
      setSelectedRole(r);
      setShowLogin(true);
    } else {
      setRole(r);
    }
  };

  // ==========================
  // 🔐 LOGIN API CALL
  // ==========================
  const handleLogin = async () => {
    if (!email) return alert("Enter email");

    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:5000/api/schools/admin/${email}`
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      // 🔥 CHECK PASSWORD
      if (data.adminInfo.password !== password) {
        alert("Wrong password");
        return;
      }

      // ✅ SAVE DATA
      localStorage.setItem("school", JSON.stringify(data));
      localStorage.setItem("role", "school-admin");

      setRole("school-admin");
      setShowLogin(false);

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
              School Admin Login
            </h2>

            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2 rounded"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-2 rounded"
            />

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