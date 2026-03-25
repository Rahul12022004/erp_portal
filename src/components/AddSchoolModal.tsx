import { X, Plus } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

interface AddSchoolModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  editData?: SchoolRecord | null;
}

const MODULE_GROUPS: Record<string, string[]> = {
  OVERVIEW: ["Dashboard"],
  ACADEMICS: [
    "Communication",
    "Academics",
    "Attendance",
    "Classes",
    "Students",
    "Staff",
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
    "Social Media",
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

const SUBSCRIPTION_PLANS: Record<string, string[]> = {
  Basic: ["Dashboard", "Attendance", "Communication"],
  Standard: ["Dashboard", "Attendance", "Academics", "Communication"],
  Premium: ALL_MODULES,
};

const normalizeModuleLabel = (module: string) =>
  module === "Digital Classroom" ? "Classes" : module;

type SchoolFormData = {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolWebsite: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;
  schoolType: string;
  maxStudents: string;
  subscriptionPlan: string;
  logo: string;
};

type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

type SchoolRecord = {
  _id: string;
  schoolInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    logo?: string;
  };
  adminInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  systemInfo?: {
    schoolType?: string;
    maxStudents?: number | string;
    subscriptionPlan?: string;
  };
  modules?: string[];
};

type SectionProps = {
  title: string;
  children: ReactNode;
};

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

const DEFAULT_FORM_DATA: SchoolFormData = {
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
};

const getInitialFormData = (editData?: SchoolRecord | null): SchoolFormData => {
  if (!editData) {
    return DEFAULT_FORM_DATA;
  }

  return {
    schoolName: editData.schoolInfo?.name || "",
    schoolEmail: editData.schoolInfo?.email || "",
    schoolPhone: editData.schoolInfo?.phone || "",
    schoolAddress: editData.schoolInfo?.address || "",
    schoolWebsite: editData.schoolInfo?.website || "",
    adminName: editData.adminInfo?.name || "",
    adminEmail: editData.adminInfo?.email || "",
    adminPassword: "",
    adminPhone: editData.adminInfo?.phone || "",
    schoolType: editData.systemInfo?.schoolType || "Private",
    maxStudents: String(editData.systemInfo?.maxStudents ?? ""),
    subscriptionPlan:
      (editData.systemInfo?.subscriptionPlan as SubscriptionPlan | undefined) || "Basic",
    logo: editData.schoolInfo?.logo || "",
  };
};

const getInitialModules = (editData?: SchoolRecord | null) => {
  if (editData?.modules?.length) {
    return [...new Set(editData.modules.map(normalizeModuleLabel))];
  }

  const plan =
    (editData?.systemInfo?.subscriptionPlan as SubscriptionPlan | undefined) || "Basic";
  return SUBSCRIPTION_PLANS[plan];
};

export function AddSchoolModal({ onClose, onSuccess, editData }: AddSchoolModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(editData?._id);

  const [formData, setFormData] = useState<SchoolFormData>(() => getInitialFormData(editData));

  const [selectedModules, setSelectedModules] = useState<string[]>(() =>
    getInitialModules(editData)
  );

  const update = <K extends keyof SchoolFormData>(key: K, value: SchoolFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // ✅ FIXED LOGO (BASE64)
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        update("logo", reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSubscriptionChange = (plan: SubscriptionPlan) => {
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

  // ✅ SUBMIT
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isEditMode
        ? `https://erp-portal-1-ftwe.onrender.com/api/schools/${editData?._id}`
        : "https://erp-portal-1-ftwe.onrender.com/api/schools";

      const res = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolName: formData.schoolName,
          schoolEmail: formData.schoolEmail,
          schoolPhone: formData.schoolPhone,
          schoolAddress: formData.schoolAddress,
          schoolWebsite: formData.schoolWebsite,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminPhone: formData.adminPhone,
          schoolType: formData.schoolType,
          maxStudents: formData.maxStudents,
          subscriptionPlan: formData.subscriptionPlan,
          logo: formData.logo, // ✅ important
          modules: selectedModules,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "Failed to save school");
      }

      console.log("Saved:", data);

      alert(isEditMode ? "School Updated ✅" : "School Created ✅");

      onSuccess?.(); // 🔥 refresh list
      onClose();

    } catch (error) {
      console.error(error);
      alert(isEditMode ? "Error updating school ❌" : "Error creating school ❌");
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
          <h2 className="text-xl font-bold">
            {isEditMode ? "Edit School" : "Add New School"}
          </h2>
          <button onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* LOGO */}
          <div className="flex justify-center">
            <div className="relative w-28 h-28">
              <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="School logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : "Logo"}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer">
                <Plus size={14}/>
                <input type="file" className="hidden" onChange={handleLogoUpload}/>
              </label>
            </div>
          </div>

          {/* SCHOOL INFO */}
          <Section title="School Info">
            <Input label="School Name" value={formData.schoolName} onChange={(v)=>update("schoolName",v)} />
            <Input label="Email" value={formData.schoolEmail} onChange={(v)=>update("schoolEmail",v)} />
            <Input label="Phone" value={formData.schoolPhone} onChange={(v)=>update("schoolPhone",v)} />
            <Input label="Website" value={formData.schoolWebsite} onChange={(v)=>update("schoolWebsite",v)} />
            <FullInput label="Address" value={formData.schoolAddress} onChange={(v)=>update("schoolAddress",v)} />
          </Section>

          {/* ADMIN INFO */}
          <Section title="Admin Info">
            <Input label="Admin Name" value={formData.adminName} onChange={(v)=>update("adminName",v)} />
            <Input label="Admin Email" value={formData.adminEmail} onChange={(v)=>update("adminEmail",v)} />
            <Input
              label={isEditMode ? "Password (leave blank to keep current)" : "Password"}
              type="password"
              value={formData.adminPassword}
              onChange={(v)=>update("adminPassword",v)}
            />
            <Input label="Phone" value={formData.adminPhone} onChange={(v)=>update("adminPhone",v)} />
          </Section>

          {/* SETTINGS */}
          <div className="grid grid-cols-3 gap-4">
            <select
              value={formData.schoolType}
              onChange={(e)=>update("schoolType",e.target.value)}
              className="border p-2 rounded"
            >
              <option>Public</option>
              <option>Private</option>
            </select>

            <Input label="Max Students" value={formData.maxStudents} onChange={(v)=>update("maxStudents",v)} />
          </div>

          {/* SUBSCRIPTION */}
          <div>
            <h3 className="font-semibold mb-4">Subscription Plan</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {(["Basic", "Standard", "Premium"] as SubscriptionPlan[]).map((plan) => (
                <div
                  key={plan}
                  onClick={() => handleSubscriptionChange(plan)}
                  className={`p-6 rounded-2xl cursor-pointer ${
                    formData.subscriptionPlan === plan
                      ? "bg-blue-600 text-white"
                      : "bg-gray-900 text-white"
                  }`}
                >
                  <h2>{plan}</h2>
                </div>
              ))}
            </div>
          </div>

          {/* MODULES */}
          <div>
            <h3 className="font-semibold mb-4">Modules</h3>
            {Object.entries(MODULE_GROUPS).map(([group, modules]) => (
              <div key={group} className="mb-4">
                <p className="text-sm text-gray-500">{group}</p>
                <div className="grid grid-cols-3 gap-2">
                  {modules.map((mod) => (
                    <div
                      key={mod}
                      onClick={() => toggleModule(mod)}
                      className={`p-2 text-center rounded ${
                        selectedModules.includes(mod)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      {mod}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded"
            >
              {loading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update School" : "Create School")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// 🔹 SMALL COMPONENTS
function Section({ title, children }: SectionProps) {
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: InputProps) {
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

function FullInput({ label, value, onChange }: InputProps) {
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
