import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Briefcase, KeyRound, Mail, Trash2, UserCheck } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";

type Teacher = {
  _id: string;
  name: string;
  email: string;
  position: string;
  status?: string;
};

type TeacherRoleCard = {
  _id: string;
  roleName: string;
  modules: string[];
  generatedPassword: string;
  teacherEmail: string;
  teacherId?: {
    _id: string;
    name: string;
    email: string;
    position?: string;
  };
  createdAt?: string;
};

const generatePassword = (teacherName: string) => {
  const cleanName = teacherName.replace(/\s+/g, "").slice(0, 4).toUpperCase() || "TCHR";
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${cleanName}@${suffix}`;
};

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const SIDEBAR_MENU_GROUPS = [
  { label: "Overview", items: ["Dashboard"] },
  { label: "Academics", items: ["Communication", "Academics", "Attendance", "Classes", "Students", "Staff", "Exams", "Time Table"] },
  { label: "Administration", items: ["Finance", "Admissions", "Visitor", "HR", "Transport", "Hostel", "Library", "Inventory", "Social Media", "Data Import"] },
  { label: "Services", items: ["Sports", "House"] },
  { label: "Management", items: ["Approvals", "Maintenance", "Survey", "Downloads", "Support", "Logs", "Settings"] },
];

const PORTAL_MODULES_BY_NORMALIZED_SOURCE: Record<string, string[]> = {
  dashboard: ["Dashboard"],
  communication: ["Communication"],
  announcements: ["Communication"],
  academics: ["Academics"],
  attendance: ["Attendance"],
  classes: ["Classes"],
  classmanagement: ["Classes"],
  digitalclassroom: ["Classes"],
  students: ["Students"],
  studentmanagement: ["Students"],
  staff: ["Staff"],
  staffmanagement: ["Staff"],
  exams: ["Exams"],
  marksresults: ["Exams"],
  timetable: ["Time Table"],
  finance: ["Finance"],
  financefees: ["Finance"],
  admissions: ["Admissions"],
  hr: ["HR"],
  transport: ["Transport"],
  transportmanagement: ["Transport"],
  hostel: ["Hostel"],
  hostelmanagement: ["Hostel"],
  library: ["Library"],
  librarymanagement: ["Library"],
  inventory: ["Inventory"],
  inventorymanagement: ["Inventory"],
  socialmedia: ["Social Media"],
  socialmediaintegration: ["Social Media"],
  survey: ["Survey"],
  surveysfeedback: ["Survey"],
  approvals: ["Approvals"],
  leavemanagement: ["Approvals"],
  maintenance: ["Maintenance"],
  sports: ["Sports"],
  house: ["House"],
  discipline: ["House"],
  downloads: ["Downloads"],
  support: ["Support"],
  logs: ["Logs"],
  settings: ["Settings"],
  visitor: ["Visitor"],
  visitors: ["Visitor"],
  dataimport: ["Data Import"],
  erpdataimport: ["Data Import"],
};

const normalizeModuleName = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toReadableFetchError = (err: unknown) => {
  if (err instanceof Error && /failed to fetch|networkerror|network request failed/i.test(err.message)) {
    return `Cannot connect to backend server at ${API_BASE}. Please start backend server and refresh.`;
  }
  return err instanceof Error ? err.message : "Request failed";
};

const mapAssignedModulesToTeacherModules = (modules: string[]) => {
  const mapped = new Set<string>();

  for (const moduleName of modules) {
    const normalized = String(moduleName || "").trim().toLowerCase();

    if (normalized === "dashboard") mapped.add("dashboard");
    if (normalized === "students") mapped.add("students");
    if (normalized === "attendance") mapped.add("attendance");
    if (normalized === "exams") mapped.add("exams");
    if (normalized === "communication") mapped.add("communication");
    if (normalized === "time table" || normalized === "timetable") mapped.add("timetable");
    if (normalized === "leave" || normalized === "leave application") mapped.add("leave");
    if (
      normalized === "classes" ||
      normalized === "digital classroom" ||
      normalized === "virtual classes"
    ) {
      mapped.add("digital-classroom");
    }
    if (normalized === "academics") {
      mapped.add("assignments");
      mapped.add("marks");
    }
  }

  return Array.from(mapped);
};

export default function HRModule() {
  const navigate = useNavigate();
  const { setRole, setTeacherPermissions } = useRole();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [cards, setCards] = useState<TeacherRoleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [selectedCard, setSelectedCard] = useState<TeacherRoleCard | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [cardLoginEmail, setCardLoginEmail] = useState("");
  const [cardLoginPassword, setCardLoginPassword] = useState("");
  const [cardLoginLoading, setCardLoginLoading] = useState(false);

  const school = useMemo(() => JSON.parse(localStorage.getItem("school") || "{}"), []);
  const schoolId = school?._id || "";

  const availableModules = useMemo(() => {
    const sourceModules = Array.isArray(school?.modules)
      ? school.modules.map((moduleName: unknown) => String(moduleName || "").trim()).filter(Boolean)
      : [];
    const subscriptionPlan = String(school?.systemInfo?.subscriptionPlan || "");
    const sidebarItems = SIDEBAR_MENU_GROUPS.flatMap((group) => group.items);

    const availablePortalModules = new Set(
      sourceModules.flatMap((moduleName) => {
        const normalizedName = normalizeModuleName(moduleName);
        const mappedPortalModules = PORTAL_MODULES_BY_NORMALIZED_SOURCE[normalizedName];

        if (mappedPortalModules) {
          return mappedPortalModules;
        }

        return sidebarItems.filter(
          (item) => normalizeModuleName(item) === normalizedName
        );
      })
    );

    return sidebarItems.filter(
      (item, index) =>
        sidebarItems.indexOf(item) === index &&
        (item === "Dashboard" || item === "Visitor" || subscriptionPlan === "Premium" || availablePortalModules.has(item))
    );
  }, [school]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!schoolId) {
        setError("School not found. Please login again.");
        setTeachers([]);
        setCards([]);
        return;
      }

      const [teachersRes, cardsRes] = await Promise.all([
        fetch(`${API_BASE}/api/staff/${schoolId}`),
        fetch(`${API_BASE}/api/teacher-roles/${schoolId}`),
      ]);

      if (!teachersRes.ok || !cardsRes.ok) {
        throw new Error(`Failed to load HR data (${teachersRes.status}/${cardsRes.status})`);
      }

      const [teachersData, cardsData] = await Promise.all([
        teachersRes.json(),
        cardsRes.json(),
      ]);

      const teacherList = (Array.isArray(teachersData) ? teachersData : []).filter(
        (staff: Teacher) => /^Teacher$/i.test(staff.position || "") && String(staff.status || "Active") !== "Inactive"
      );

      setTeachers(teacherList);
      setCards(Array.isArray(cardsData?.data) ? cardsData.data : []);
    } catch (err) {
      console.error("HR data fetch error:", err);
      setError(toReadableFetchError(err));
      setTeachers([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onTeacherChange = (nextTeacherId: string) => {
    setTeacherId(nextTeacherId);
    const selectedTeacher = teachers.find((teacher) => teacher._id === nextTeacherId);

    if (!selectedTeacher) {
      setTeacherEmail("");
      setGeneratedPassword("");
      return;
    }

    setTeacherEmail(selectedTeacher.email || "");
    setGeneratedPassword(generatePassword(selectedTeacher.name || ""));
  };

  const toggleModule = (moduleName: string) => {
    setModules((current) =>
      current.includes(moduleName)
        ? current.filter((item) => item !== moduleName)
        : [...current, moduleName]
    );
  };

  const handleCreateRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!schoolId) {
      setError("School not found. Please login again.");
      return;
    }

    if (!teacherId || !roleName.trim()) {
      setError("Teacher and role name are required.");
      return;
    }

    if (!generatedPassword) {
      setError("Generated password missing. Re-select teacher.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch(`${API_BASE}/api/teacher-roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          teacherId,
          roleName: roleName.trim(),
          modules,
          generatedPassword,
          createdBy: "School Admin",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create teacher role assignment");
      }

      const savedCard = data.data as TeacherRoleCard;
      setCards((current) => {
        const exists = current.some((item) => item._id === savedCard._id);
        return exists
          ? current.map((item) => (item._id === savedCard._id ? savedCard : item))
          : [savedCard, ...current];
      });

      setSuccess("Role created and credentials emailed to selected teacher.");
      setRoleName("");
      setModules([]);
    } catch (err) {
      console.error("Create role assignment error:", err);
      setError(toReadableFetchError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role card?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/teacher-roles/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to delete role card");
      }

      setCards((current) => current.filter((item) => item._id !== id));
      setSuccess("Role card deleted.");
    } catch (err) {
      console.error("Delete role card error:", err);
      setError(toReadableFetchError(err));
    }
  };

  const openCardLogin = (card: TeacherRoleCard) => {
    setSelectedCard(card);
    setCardLoginEmail(card.teacherEmail || "");
    setCardLoginPassword(card.generatedPassword || "");
    setShowLoginModal(true);
    setError("");
    setSuccess("");
  };

  const handleCardLogin = async () => {
    if (!schoolId) {
      setError("School not found. Please login again.");
      return;
    }

    if (!cardLoginEmail || !cardLoginPassword) {
      setError("Email and password are required.");
      return;
    }

    try {
      setCardLoginLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/teacher-roles/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          teacherEmail: cardLoginEmail.trim(),
          generatedPassword: cardLoginPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Teacher role login failed");
      }

      const allowedModules = mapAssignedModulesToTeacherModules(
        Array.isArray(data.modules) ? data.modules : selectedCard?.modules || []
      );

      localStorage.setItem("teacher", JSON.stringify(data.teacher));
      localStorage.setItem("school", JSON.stringify(data.school));
      setTeacherPermissions({ modules: allowedModules });
      window.dispatchEvent(new Event("school-session-updated"));
      setRole("teacher");
      setShowLoginModal(false);

      // Navigate to first assigned module (dashboard if assigned, else first module)
      const modulePathMap: Record<string, string> = {
        dashboard: "/teacher",
        students: "/teacher/students",
        attendance: "/teacher/attendance",
        assignments: "/teacher/assignments",
        marks: "/teacher/marks",
        exams: "/teacher/exams",
        leave: "/teacher/leave",
        "digital-classroom": "/teacher/digital-classroom",
        timetable: "/teacher/timetable",
        communication: "/teacher/communication",
      };
      const firstPath = allowedModules.find((m) => modulePathMap[m]);
      navigate(firstPath ? modulePathMap[firstPath] : "/teacher");
    } catch (err) {
      console.error("Teacher role login error:", err);
      setError(toReadableFetchError(err));
    } finally {
      setCardLoginLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Teacher Role & Module Assignment</h3>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

        <form onSubmit={handleCreateRole} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              className="rounded border p-2"
              value={teacherId}
              onChange={(e) => onTeacherChange(e.target.value)}
              required
            >
              <option value="">Select Teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Role Name (e.g. Attendance Manager)"
              className="rounded border p-2"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
            />

            <div className="relative">
              <Mail className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="email"
                className="w-full rounded border p-2 pl-8 bg-gray-50"
                value={teacherEmail}
                readOnly
                placeholder="Teacher Email (auto-filled)"
              />
            </div>

            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full rounded border p-2 pl-8 bg-gray-50"
                value={generatedPassword}
                readOnly
                placeholder="Password (auto-generated)"
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Assign Modules</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {modules.length} selected
              </span>
            </div>
            {availableModules.length === 0 ? (
              <p className="text-sm text-gray-500">No enabled school modules found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableModules.map((moduleName) => (
                  <button
                    key={moduleName}
                    type="button"
                    onClick={() => toggleModule(moduleName)}
                    className={`min-h-[84px] rounded-3xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${
                      modules.includes(moduleName)
                        ? "border-blue-600 bg-blue-100 text-blue-900"
                        : "border-slate-200 bg-[#eef6ff] text-slate-800"
                    }`}
                    style={{
                      boxShadow: modules.includes(moduleName)
                        ? "8px 8px 20px rgba(37,99,235,0.22), inset -4px -4px 10px rgba(29,78,216,0.2), inset 4px 4px 10px rgba(255,255,255,0.75)"
                        : "6px 6px 16px rgba(15,23,42,0.12), inset -3px -3px 8px rgba(15,23,42,0.1), inset 3px 3px 8px rgba(255,255,255,0.75)",
                    }}
                  >
                    <div className="flex h-full items-start justify-between gap-2">
                      <span className="break-words text-sm font-semibold leading-5 text-inherit">{moduleName}</span>
                      {modules.includes(moduleName) && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          ON
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Role Card"}
          </button>
        </form>
      </div>

      <div className="stat-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Role Cards</h3>

        {loading ? (
          <p className="text-gray-500">Loading role cards...</p>
        ) : cards.length === 0 ? (
          <p className="text-gray-500">No role cards yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card._id}
                className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                onClick={() => openCardLogin(card)}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{card.roleName}</p>
                    <p className="text-sm text-gray-600">
                      {card.teacherId?.name || "Teacher"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(card._id);
                    }}
                    className="text-red-600 hover:text-red-700"
                    title="Delete role card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4" />
                    <span>{card.teacherEmail}</span>
                  </p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <KeyRound className="h-4 w-4" />
                    <span>{card.generatedPassword}</span>
                  </p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <UserCheck className="h-4 w-4" />
                    <span>{card.createdAt ? new Date(card.createdAt).toLocaleString() : "Recently created"}</span>
                  </p>
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Modules</p>
                  {card.modules.length === 0 ? (
                    <p className="text-sm text-gray-500">No module assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {card.modules.map((moduleName) => (
                        <span
                          key={`${card._id}-${moduleName}`}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {moduleName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-blue-600">Click card to open teacher login</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLoginModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="mb-1 text-lg font-semibold">Teacher Login</h4>
            <p className="mb-4 text-sm text-gray-600">
              {selectedCard.teacherId?.name || "Teacher"} - {selectedCard.roleName}
            </p>

            <div className="space-y-3">
              <input
                type="email"
                value={cardLoginEmail}
                onChange={(e) => setCardLoginEmail(e.target.value)}
                placeholder="Teacher Email"
                className="w-full rounded border p-2"
              />
              <input
                type="text"
                value={cardLoginPassword}
                onChange={(e) => setCardLoginPassword(e.target.value)}
                placeholder="Generated Password"
                className="w-full rounded border p-2"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="w-full rounded bg-gray-200 py-2"
                disabled={cardLoginLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCardLogin()}
                className="w-full rounded bg-blue-600 py-2 text-white"
                disabled={cardLoginLoading}
              >
                {cardLoginLoading ? "Logging in..." : "Login"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
