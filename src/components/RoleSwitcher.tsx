import { useRole, UserRole } from "@/contexts/RoleContext";
import { Shield, School, GraduationCap } from "lucide-react";

const roles: { value: UserRole; label: string; icon: typeof Shield }[] = [
  { value: "super-admin", label: "Super Admin", icon: Shield },
  { value: "school-admin", label: "School Admin", icon: School },
  { value: "teacher", label: "Teacher", icon: GraduationCap },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
      {roles.map((r) => (
        <button
          key={r.value}
          onClick={() => setRole(r.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            role === r.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <r.icon className="w-3.5 h-3.5" />
          {r.label}
        </button>
      ))}
    </div>
  );
}
