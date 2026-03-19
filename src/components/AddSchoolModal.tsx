import { X, Plus } from "lucide-react";
import { useState } from "react";

interface AddSchoolModalProps {
  onClose: () => void;
}

// MODULE GROUPS
const MODULE_GROUPS: Record<string, string[]> = {
  OVERVIEW: ["Dashboard"],
  ACADEMICS: [
    "Communication",
    "Academics",
    "Attendance",
    "Students",
    "Staff",
    "Digital Classroom",
    "Exams",
    "Time Table",
  ],
  ADMINISTRATION: [
    "Finance",
    "Admissions",
    "HR",
    "Transport",
    "Hostel",
    "Library",
    "Inventory",
  ],
  SERVICES: [
    "Store",
    "Cafeteria",
    "Bookstore",
    "Virtual Classes",
    "Sports",
  ],
  MANAGEMENT: [
    "Approvals",
    "Maintenance",
    "Discipline",
    "Survey",
    "Downloads",
    "Support",
    "Logs",
    "Settings",
  ],
};

const ALL_MODULES = Object.values(MODULE_GROUPS).flat();

// PLANS
const SUBSCRIPTION_PLANS: Record<string, string[]> = {
  Basic: ["Dashboard", "Attendance", "Communication"],
  Standard: ["Dashboard", "Attendance", "Academics", "Communication"],
  Premium: ALL_MODULES,
};

export function AddSchoolModal({ onClose }: AddSchoolModalProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolEmail: "",
    schoolPhone: "",
    schoolAddress: "",
    schoolWebsite: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
    schoolType: "Private",
    maxStudents: "",
    subscriptionPlan: "Basic",
    logo: "",
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(
    SUBSCRIPTION_PLANS["Basic"]
  );

  const update = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      update("logo", URL.createObjectURL(file));
    }
  };

  const handleSubscriptionChange = (plan: string) => {
    update("subscriptionPlan", plan);
    setSelectedModules(SUBSCRIPTION_PLANS[plan]);
  };

  const toggleModule = (module: string) => {
    setSelectedModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  };

  // 🔥 CONNECTED TO BACKEND
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      schoolInfo: {
        name: formData.schoolName,
        email: formData.schoolEmail,
        phone: formData.schoolPhone,
        website: formData.schoolWebsite,
        address: formData.schoolAddress,
        logo: formData.logo,
      },
      adminInfo: {
        name: formData.adminName,
        email: formData.adminEmail,
        password: formData.adminPassword,
        phone: formData.adminPhone,
      },
      systemInfo: {
        schoolType: formData.schoolType,
        maxStudents: Number(formData.maxStudents),
        subscriptionPlan: formData.subscriptionPlan,
      },
      modules: selectedModules,
    };

    try {
      const res = await fetch("http://localhost:5000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log("Saved:", data);

      alert("School Created Successfully ✅");

      onClose();
    } catch (error) {
      console.error(error);
      alert("Error creating school ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Add New School</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-28 h-28">
              <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {formData.logo ? (
                  <img src={formData.logo} className="w-full h-full object-cover"/>
                ) : "Logo"}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer">
                <Plus size={14}/>
                <input type="file" className="hidden" onChange={handleLogoUpload}/>
              </label>
            </div>
          </div>

          {/* School Info */}
          <Section title="School Info">
            <Input label="School Name" value={formData.schoolName} onChange={(v)=>update("schoolName",v)} />
            <Input label="Email" value={formData.schoolEmail} onChange={(v)=>update("schoolEmail",v)} />
            <Input label="Phone" value={formData.schoolPhone} onChange={(v)=>update("schoolPhone",v)} />
            <Input label="Website" value={formData.schoolWebsite} onChange={(v)=>update("schoolWebsite",v)} />
            <FullInput label="Address" value={formData.schoolAddress} onChange={(v)=>update("schoolAddress",v)} />
          </Section>

          {/* Admin Info */}
          <Section title="Admin Info">
            <Input label="Admin Name" value={formData.adminName} onChange={(v)=>update("adminName",v)} />
            <Input label="Admin Email" value={formData.adminEmail} onChange={(v)=>update("adminEmail",v)} />
            <Input label="Password" type="password" value={formData.adminPassword} onChange={(v)=>update("adminPassword",v)} />
            <Input label="Phone" value={formData.adminPhone} onChange={(v)=>update("adminPhone",v)} />
          </Section>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label>School Type</label>
              <select
                value={formData.schoolType}
                onChange={(e)=>update("schoolType",e.target.value)}
                className="w-full border p-2 rounded"
              >
                <option>Public</option>
                <option>Private</option>
              </select>
            </div>

            <Input label="Max Students" value={formData.maxStudents} onChange={(v)=>update("maxStudents",v)} />
          </div>

          {/* Subscription */}
          <div>
            <h3 className="font-semibold mb-4">Subscription Plan</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {["Basic","Standard","Premium"].map((plan) => (
                <div
                  key={plan}
                  onClick={() => handleSubscriptionChange(plan)}
                  className={`p-6 rounded-2xl cursor-pointer ${
                    formData.subscriptionPlan === plan
                      ? "bg-blue-600 text-white scale-105"
                      : "bg-gray-900 text-white"
                  }`}
                >
                  <h2 className="text-xl font-bold">{plan}</h2>
                  <button className="mt-4 w-full py-2 bg-white text-black rounded">
                    {formData.subscriptionPlan === plan ? "Selected" : "Choose"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <h3 className="font-semibold mb-4">Modules</h3>
            {Object.entries(MODULE_GROUPS).map(([group, modules]) => (
              <div key={group} className="mb-6">
                <p className="text-sm font-semibold text-gray-500 mb-2">{group}</p>
                <div className="grid grid-cols-3 gap-3">
                  {modules.map((mod) => (
                    <div
                      key={mod}
                      onClick={() => toggleModule(mod)}
                      className={`p-3 text-center rounded cursor-pointer ${
                        selectedModules.includes(mod)
                          ? "bg-green-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {mod}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded"
            >
              {loading ? "Creating..." : "Create School"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// Components
function Section({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type="text" }: any) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="w-full border p-2 rounded mt-1"
      />
    </div>
  );
}

function FullInput({ label, value, onChange }: any) {
  return (
    <div className="col-span-2">
      <label className="text-sm">{label}</label>
      <input
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="w-full border p-2 rounded mt-1"
      />
    </div>
  );
}