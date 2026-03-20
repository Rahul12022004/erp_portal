import { useState } from "react";

const tabs = ["General", "Modules", "Subscription"];

export default function SettingsPage() {
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
  const [modules, setModules] = useState([
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
  const [plans, setPlans] = useState<any[]>([
    { name: "Basic", price: 0 },
    { name: "Standard", price: 999 },
    { name: "Premium", price: 1999 },
  ]);

  const [newPlan, setNewPlan] = useState({ name: "", price: 0 });

  // ==========================
  // HANDLERS
  // ==========================
  const toggleModule = (index: number) => {
    const updated = [...modules];
    updated[index].enabled = !updated[index].enabled;
    setModules(updated);
  };

  const updatePlan = (index: number, field: string, value: any) => {
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
    </div>
  );
}