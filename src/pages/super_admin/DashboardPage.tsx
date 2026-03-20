import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const total = schools.length;

  const paid = schools.filter(
    (s) => s.systemInfo?.subscriptionPlan !== "Basic"
  ).length;

  const unpaid = schools.filter(
    (s) => s.systemInfo?.subscriptionPlan === "Basic"
  ).length;

  return (
    <div className="space-y-6">

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Schools" value={total} />
        <Card title="Paid Schools" value={paid} color="green" />
        <Card title="Unpaid Schools" value={unpaid} color="red" />
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">
          School Subscription Details
        </h3>

        {loading ? (
          <p>Loading schools...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b text-gray-500 text-left">
                  <th className="py-3">School</th>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Students</th>
                  <th>Modules</th>
                  <th>Plan</th>
                  <th>End Date</th>
                </tr>
              </thead>

              <tbody>
                {schools.map((school) => {

                  const name = school.schoolInfo?.name || "";
                  const logo = school.schoolInfo?.logo;

                  const initials = name
                    .split(" ")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("");

                  // 🔥 SAFE LOGO CHECK
                  const isValidLogo =
                    logo &&
                    typeof logo === "string" &&
                    (logo.startsWith("data:image") || logo.startsWith("http"));

                  return (
                    <tr
                      key={school._id}
                      className="border-b hover:bg-gray-50 transition"
                    >

                      {/* SCHOOL */}
                      <td className="py-4">
                        <div className="flex items-center gap-3">

                          {isValidLogo ? (
                            <img
                              src={logo}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600">
                              {initials}
                            </div>
                          )}

                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-gray-500">
                              {school.schoolInfo?.email}
                            </p>
                          </div>

                        </div>
                      </td>

                      <td>{school.adminInfo?.name}</td>
                      <td>{school.adminInfo?.email}</td>
                      <td>{school.adminInfo?.phone}</td>
                      <td>{school.systemInfo?.maxStudents || "-"}</td>
                      <td>{school.modules?.length || 0}</td>

                      <td>
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                          {school.systemInfo?.subscriptionPlan}
                        </span>
                      </td>

                      <td>
                        {school.systemInfo?.subscriptionEndDate || "-"}
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔹 CARD COMPONENT
function Card({ title, value, color }: any) {
  return (
    <div className="bg-white shadow rounded-xl p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className={`text-2xl font-bold ${color === "green" ? "text-green-600" : color === "red" ? "text-red-600" : ""}`}>
        {value}
      </h2>
    </div>
  );
}