import { useEffect, useMemo, useState } from "react";
import {
  BadgeHelp,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

type SchoolRecord = {
  _id: string;
  schoolInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
  };
  adminInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
  };
  systemInfo?: {
    schoolType?: string;
    maxStudents?: number;
    subscriptionPlan?: string;
    subscriptionEndDate?: string;
  };
  modules?: string[];
};

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department?: string;
  status?: string;
};

export default function SupportModule() {
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSupportData = async () => {
      const storedSchool = JSON.parse(localStorage.getItem("school") || "null");

      if (!storedSchool?._id) {
        setError("School not found. Please log in again.");
        setSchool(null);
        setStaff([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [schoolRes, staffRes] = await Promise.all([
          fetch(`http://localhost:5000/api/schools/${storedSchool._id}`),
          fetch(`http://localhost:5000/api/staff/${storedSchool._id}`),
        ]);

        const schoolData = schoolRes.ok ? await schoolRes.json() : null;
        const staffData = staffRes.ok ? await staffRes.json() : [];

        if (!schoolRes.ok) {
          throw new Error(`Failed to load school info (${schoolRes.status})`);
        }

        if (!staffRes.ok) {
          throw new Error(`Failed to load staff info (${staffRes.status})`);
        }

        setSchool(schoolData);
        setStaff(Array.isArray(staffData) ? staffData : []);
      } catch (err) {
        console.error("Support fetch error:", err);
        setSchool(null);
        setStaff([]);
        setError(err instanceof Error ? err.message : "Failed to load support data");
      } finally {
        setLoading(false);
      }
    };

    fetchSupportData();
  }, []);

  const teacherCount = useMemo(
    () => staff.filter((member) => /teacher/i.test(member.position)).length,
    [staff]
  );

  const supportStaffCount = useMemo(
    () => staff.filter((member) => !/teacher/i.test(member.position)).length,
    [staff]
  );

  const visibleStaff = useMemo(() => {
    const adminEmail = school?.adminInfo?.email?.toLowerCase();

    return staff.filter((member) => member.email.toLowerCase() !== adminEmail);
  }, [school?.adminInfo?.email, staff]);

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-center text-gray-500">Loading support details...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : !school ? (
        <p className="text-center text-gray-500">School information is not available.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="stat-card p-5">
              <p className="text-sm text-muted-foreground">School Name</p>
              <h3 className="mt-2 text-lg font-semibold">
                {school.schoolInfo?.name || "School"}
              </h3>
            </div>

            <div className="stat-card p-5">
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <h3 className="mt-2 text-lg font-semibold">{staff.length}</h3>
            </div>

            <div className="stat-card p-5">
              <p className="text-sm text-muted-foreground">Teachers</p>
              <h3 className="mt-2 text-lg font-semibold">{teacherCount}</h3>
            </div>

            <div className="stat-card p-5">
              <p className="text-sm text-muted-foreground">Other Staff</p>
              <h3 className="mt-2 text-lg font-semibold">{supportStaffCount}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="stat-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">School Information</h3>
              </div>

              <div className="space-y-3 text-sm">
                <p className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.schoolInfo?.email || "No school email added"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.schoolInfo?.phone || "No phone added"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.schoolInfo?.website || "No website added"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.schoolInfo?.address || "No address added"}</span>
                </p>
              </div>
            </div>

            <div className="stat-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Office Admin</h3>
              </div>

              <div className="space-y-3 text-sm">
                <p className="flex items-start gap-2">
                  <UserRound className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.adminInfo?.name || "No admin name added"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.adminInfo?.email || "No admin email added"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{school.adminInfo?.phone || "No admin phone added"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <BadgeHelp className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>Status: {school.adminInfo?.status || "Active"}</span>
                </p>
              </div>
            </div>

            <div className="stat-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-semibold">System Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    School Type
                  </p>
                  <p className="mt-1 font-medium">
                    {school.systemInfo?.schoolType || "Not set"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Plan
                  </p>
                  <p className="mt-1 font-medium">
                    {school.systemInfo?.subscriptionPlan || "Basic"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Max Students
                  </p>
                  <p className="mt-1 font-medium">
                    {school.systemInfo?.maxStudents || 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ends On
                  </p>
                  <p className="mt-1 font-medium">
                    {school.systemInfo?.subscriptionEndDate || "No end date"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Active Modules
                </p>
                <p className="mt-1">
                  {school.modules && school.modules.length > 0
                    ? school.modules.join(", ")
                    : "No modules assigned"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">School Staff Cards</h3>
              <p className="text-sm text-muted-foreground">
                Office team, teachers, and other school contacts for this school.
              </p>
            </div>

            {visibleStaff.length === 0 ? (
              <div className="stat-card p-6 text-center text-gray-500">
                No staff records available for this school yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleStaff.map((member) => (
                  <div key={member._id} className="stat-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.position}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          member.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : member.status === "On Leave"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {member.status || "Active"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="flex items-start gap-2">
                        <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <span>{member.email}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <span>{member.phone}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <span>{member.department || "General Department"}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
