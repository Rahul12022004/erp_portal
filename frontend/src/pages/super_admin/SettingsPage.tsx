import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { clearStoredSessions, readAuthToken } from "@/lib/auth";

const tabs = ["General", "Modules", "Subscription"];

type ModuleSetting = {
  name: string;
  enabled: boolean;
};

type SubscriptionPlan = {
  name: string;
  price: number;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("General");

  // ==========================
  // GENERAL SETTINGS
  // ==========================
  const [general, setGeneral] = useState({
    appName: "EduAdmin",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
  });

  // ==========================
  // MODULE SETTINGS (FULL LIST)
  // ==========================
  const [modules, setModules] = useState<ModuleSetting[]>([
    // 🎓 ACADEMICS
    { name: "Academics", enabled: true },
    { name: "Homework", enabled: true },
    { name: "Assignments", enabled: true },
    { name: "Lesson Plan", enabled: true },
    { name: "Classwork", enabled: true },
  
    // 📅 SCHEDULING
    { name: "Timetable", enabled: true },
    { name: "Calendar", enabled: true },
  
    // 🧑‍🎓 STUDENT MANAGEMENT
    { name: "Student Management", enabled: true },
    { name: "Attendance", enabled: true },
    { name: "Examinations", enabled: true },
    { name: "Results", enabled: true },
  
    // 💬 COMMUNICATION
    { name: "Communication", enabled: true },
    { name: "Announcements", enabled: true },
    { name: "Notifications", enabled: true },
  
    // 💰 FINANCE
    { name: "Fees", enabled: true },
    { name: "Accounting", enabled: false },
    { name: "Invoices", enabled: false },
  
    // 👨‍🏫 STAFF / HR
    { name: "Staff Management", enabled: true },
    { name: "Payroll", enabled: false },
    { name: "Leave Management", enabled: true },
  
    // 🚌 OPERATIONS
    { name: "Transport", enabled: false },
    { name: "Hostel", enabled: false },
    { name: "Library", enabled: false },
  
    // 📊 SYSTEM
    { name: "Reports", enabled: true },
    { name: "Analytics", enabled: true },
    { name: "Settings", enabled: true },
  ]);

  // ==========================
  // SUBSCRIPTION SETTINGS
  // ==========================
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    { name: "Basic", price: 0 },
    { name: "Standard", price: 999 },
    { name: "Premium", price: 1999 },
  ]);

  const [newPlan, setNewPlan] = useState<SubscriptionPlan>({ name: "", price: 0 });
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [clearDbLoading, setClearDbLoading] = useState(false);
  const [clearDbError, setClearDbError] = useState("");
  const [clearDbSuccess, setClearDbSuccess] = useState("");

  // ==========================
  // HANDLERS
  // ==========================
  const toggleModule = (index: number) => {
    const updated = [...modules];
    updated[index].enabled = !updated[index].enabled;
    setModules(updated);
  };

  const updatePlan = (
    index: number,
    field: keyof SubscriptionPlan,
    value: SubscriptionPlan[keyof SubscriptionPlan]
  ) => {
    const updated = [...plans];
    updated[index][field] = value;
    setPlans(updated);
  };

  const addPlan = () => {
    if (!newPlan.name) return;
    setPlans([...plans, newPlan]);
    setNewPlan({ name: "", price: 0 });
  };

  const deletePlan = (index: number) => {
    const updated = plans.filter((_, i) => i !== index);
    setPlans(updated);
  };

  const clearDatabase = async () => {
    setClearDbError("");
    setClearDbSuccess("");
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    if (!normalizedAdminEmail || !adminPassword) {
      setClearDbError("Enter super admin email and password.");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/.test(normalizedAdminEmail)) {
      setClearDbError("Super admin email must be a gmail.com address.");
      return;
    }

    if (confirmationText !== "CLEAR DATABASE") {
      setClearDbError('Type "CLEAR DATABASE" to continue.');
      return;
    }

    setClearDbLoading(true);
    try {
      const token = readAuthToken();
      const response = await fetch(`${API_URL}/api/schools/super-admin/clear-database`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: normalizedAdminEmail,
          password: adminPassword,
          confirmationText,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Failed to clear database");
      }

      setClearDbSuccess("Database cleared successfully. Redirecting to login...");
      setAdminEmail("");
      setAdminPassword("");
      setConfirmationText("");

      setTimeout(() => {
        clearStoredSessions();
        navigate("/super-admin-login", { replace: true });
      }, 1200);
    } catch (error) {
      setClearDbError(error instanceof Error ? error.message : "Failed to clear database");
    } finally {
      setClearDbLoading(false);
    }
  };

  // ==========================
  // UI
  // ==========================
  const renderContent = () => {
    switch (activeTab) {
      case "General":
        return (
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(general).map(([key, value]) => (
              <div key={key}>
                <label className="text-sm font-medium capitalize">
                  {key}
                </label>
                <input
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={value}
                  onChange={(e) =>
                    setGeneral({ ...general, [key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
        );

      case "Modules":
        return (
          <div className="grid md:grid-cols-2 gap-4">
            {modules.map((mod, index) => (
              <div
                key={mod.name}
                className="flex justify-between items-center p-4 border rounded-lg shadow-sm"
              >
                <p className="font-medium">{mod.name}</p>

                {/* TOGGLE SWITCH */}
                <button
                  onClick={() => toggleModule(index)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                    mod.enabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow transform transition ${
                      mod.enabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        );

      case "Subscription":
        return (
          <div className="space-y-6">

            {/* EXISTING PLANS */}
            <div>
              <h2 className="font-semibold mb-3">Plans</h2>

              <div className="space-y-3">
                {plans.map((plan, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center border p-3 rounded-lg"
                  >
                    <input
                      className="flex-1 p-2 border rounded"
                      value={plan.name}
                      onChange={(e) =>
                        updatePlan(index, "name", e.target.value)
                      }
                    />

                    <input
                      type="number"
                      className="w-32 p-2 border rounded"
                      value={plan.price}
                      onChange={(e) =>
                        updatePlan(index, "price", Number(e.target.value))
                      }
                    />

                    <button
                      onClick={() => deletePlan(index)}
                      className="px-3 py-1 bg-red-500 text-white rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ADD NEW PLAN */}
            <div>
              <h2 className="font-semibold mb-2">Add New Plan</h2>

              <div className="flex gap-3">
                <input
                  placeholder="Plan name"
                  className="flex-1 p-2 border rounded"
                  value={newPlan.name}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, name: e.target.value })
                  }
                />

                <input
                  type="number"
                  placeholder="Price"
                  className="w-32 p-2 border rounded"
                  value={newPlan.price}
                  onChange={(e) =>
                    setNewPlan({
                      ...newPlan,
                      price: Number(e.target.value),
                    })
                  }
                />

                <button
                  onClick={addPlan}
                  className="bg-blue-600 text-white px-4 rounded"
                >
                  Add
                </button>
              </div>
            </div>

          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage system preferences and configurations
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT CARD */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        {renderContent()}
      </div>

      {/* SAVE */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            console.log("GENERAL:", general);
            console.log("MODULES:", modules);
            console.log("PLANS:", plans);
            alert("Settings saved (connect backend next)");
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
        >
          Save Settings
        </button>
      </div>

      {/* DANGER ZONE */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
        <p className="mt-1 text-sm text-red-600">
          This will permanently clear the entire database for all schools and modules.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-red-700">Super Admin Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-red-200 bg-white p-2 focus:ring-2 focus:ring-red-500"
              placeholder="Enter super admin email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-red-700">Super Admin Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-red-200 bg-white p-2 focus:ring-2 focus:ring-red-500"
              placeholder="Enter password"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-red-700">Type CLEAR DATABASE to confirm</label>
          <input
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-red-200 bg-white p-2 focus:ring-2 focus:ring-red-500"
            placeholder="CLEAR DATABASE"
          />
        </div>

        {clearDbError && (
          <p className="mt-3 text-sm font-medium text-red-700">{clearDbError}</p>
        )}
        {clearDbSuccess && (
          <p className="mt-3 text-sm font-medium text-green-700">{clearDbSuccess}</p>
        )}

        <div className="mt-5">
          <button
            onClick={clearDatabase}
            disabled={clearDbLoading}
            className="rounded-lg bg-red-600 px-5 py-2 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clearDbLoading ? "Clearing Database..." : "Clear Entire Database"}
          </button>
        </div>
      </div>
    </div>
  );
}
