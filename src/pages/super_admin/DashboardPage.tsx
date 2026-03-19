import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch schools from backend
  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/schools");
      const data = await res.json();
      setSchools(data);
    } catch (error) {
      console.error("Error fetching schools:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const total = schools.length;

  const paid = schools.filter(
    (s) => s.systemInfo?.subscriptionPlan !== "Basic"
  ).length;

  const unpaid = schools.filter(
    (s) => s.systemInfo?.subscriptionPlan === "Basic"
  ).length;

  return (
    <div className="space-y-6">

      {/* 🔢 CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-4">
          <h3 className="text-sm text-muted-foreground">Total Schools</h3>
          <p className="text-2xl font-bold">{total}</p>
        </div>

        <div className="stat-card p-4">
          <h3 className="text-sm text-muted-foreground">Paid Schools</h3>
          <p className="text-2xl font-bold text-green-600">{paid}</p>
        </div>

        <div className="stat-card p-4">
          <h3 className="text-sm text-muted-foreground">Unpaid Schools</h3>
          <p className="text-2xl font-bold text-red-600">{unpaid}</p>
        </div>
      </div>

      {/* 📋 TABLE */}
      <div className="stat-card p-6">
        <h3 className="text-xl font-semibold mb-6">
          School Subscription Details
        </h3>

        {loading ? (
          <p>Loading schools...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-3 px-4">School</th>
                  <th className="px-4">Admin</th>
                  <th className="px-4">Email</th>
                  <th className="px-4">Phone</th>
                  <th className="px-4">Students</th>
                  <th className="px-4">Modules</th>
                  <th className="px-4">Plan</th>
                </tr>
              </thead>

              <tbody>
                {schools.map((school, index) => (
                  <tr
                    key={index}
                    className="bg-muted/40 hover:bg-muted/60 rounded-lg"
                  >
                    <td className="py-4 px-4 font-medium text-base">
                      {school.schoolInfo?.name}
                    </td>

                    <td className="px-4">
                      {school.adminInfo?.name}
                    </td>

                    <td className="px-4">
                      {school.adminInfo?.email}
                    </td>

                    <td className="px-4">
                      {school.adminInfo?.phone}
                    </td>

                    <td className="px-4">
                      {school.systemInfo?.maxStudents || "-"}
                    </td>

                    <td className="px-4">
                      {school.modules?.length || 0}
                    </td>

                    <td className="px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {school.systemInfo?.subscriptionPlan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}