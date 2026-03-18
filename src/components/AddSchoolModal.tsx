import { X, Plus } from "lucide-react";
import { useState } from "react";

interface AddSchoolModalProps {
  onClose: () => void;
}

export function AddSchoolModal({ onClose }: AddSchoolModalProps) {
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
    logo: "", // ✅ Logo
  });

  const update = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      update("logo", url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">Add New School</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ✅ LOGO SECTION (TOP) */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
              
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Logo
                  </span>
                )}
              </div>

              {/* Upload Button */}
              <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-md hover:scale-105 transition">
                <Plus className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Upload School Logo
            </p>
          </div>

          {/* School Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              School Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="School Name" value={formData.schoolName} onChange={(v) => update("schoolName", v)} required />
              <InputField label="School Email" type="email" value={formData.schoolEmail} onChange={(v) => update("schoolEmail", v)} required />
              <InputField label="School Phone" value={formData.schoolPhone} onChange={(v) => update("schoolPhone", v)} required />
              <InputField label="Website" value={formData.schoolWebsite} onChange={(v) => update("schoolWebsite", v)} />

              <div className="sm:col-span-2">
                <InputField label="Address" value={formData.schoolAddress} onChange={(v) => update("schoolAddress", v)} required />
              </div>
            </div>
          </div>

          {/* Admin Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Admin Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Admin Name" value={formData.adminName} onChange={(v) => update("adminName", v)} required />
              <InputField label="Admin Email" type="email" value={formData.adminEmail} onChange={(v) => update("adminEmail", v)} required />
              <InputField label="Admin Password" type="password" value={formData.adminPassword} onChange={(v) => update("adminPassword", v)} required />
              <InputField label="Admin Phone" value={formData.adminPhone} onChange={(v) => update("adminPhone", v)} />
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Additional Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-sm mb-1">School Type</label>
                <select
                  value={formData.schoolType}
                  onChange={(e) => update("schoolType", e.target.value)}
                  className="w-full px-3 py-2 bg-muted rounded-lg"
                >
                  <option>Public</option>
                  <option>Private</option>
                </select>
              </div>

              <InputField label="Max Students" type="number" value={formData.maxStudents} onChange={(v) => update("maxStudents", v)} />

              <div>
                <label className="block text-sm mb-1">Subscription</label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={(e) => update("subscriptionPlan", e.target.value)}
                  className="w-full px-3 py-2 bg-muted rounded-lg"
                >
                  <option>Basic</option>
                  <option>Standard</option>
                  <option>Premium</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>

            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg">
              Create School
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Input Component */
function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 bg-muted rounded-lg outline-none"
      />
    </div>
  );
}