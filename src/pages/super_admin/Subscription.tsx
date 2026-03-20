import { useEffect, useState } from "react";

const PLAN_PRICE: any = {
  Basic: 0,
  Standard: 999,
  Premium: 1999,
};

export default function SubscriptionsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState("Standard");
  const [actionType, setActionType] = useState<"upgrade" | "renew" | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/schools");
      const data = await res.json();
      setSchools(data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const openModal = (school: any, type: "upgrade" | "renew") => {
    setSelectedSchool(school);
    setSelectedPlan(school.systemInfo?.subscriptionPlan || "Standard");
    setActionType(type);
  };

  const handleConfirm = async () => {
    if (!selectedSchool) return;

    try {
      const url =
        actionType === "upgrade"
          ? `http://localhost:5000/api/schools/upgrade/${selectedSchool._id}`
          : `http://localhost:5000/api/schools/renew/${selectedSchool._id}`;

      const body =
        actionType === "upgrade"
          ? { subscriptionPlan: selectedPlan }
          : {}; // renew usually doesn't need plan

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      console.log("API RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      // ✅ CLOSE MODAL
      setSelectedSchool(null);
      setActionType(null);

      // ✅ REFRESH DATA
      await fetchSchools();

    } catch (err) {
      console.error("ERROR:", err);
      alert("Failed to update subscription");
    }
  };

  // 🔥 STATS
  const totalRevenue = schools.reduce(
    (sum, s) => sum + (PLAN_PRICE[s.systemInfo?.subscriptionPlan] || 0),
    0
  );

  const activeCount = schools.filter(
    (s) => s.systemInfo?.subscriptionEndDate
  ).length;

  const expiringSoon = schools.filter((s) => {
    const end = new Date(s.systemInfo?.subscriptionEndDate);
    const diff =
      (end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 3 && diff > 0;
  }).length;

  return (
    <div className="space-y-6">

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card p-4">
          <p>Total Revenue</p>
          <h2 className="text-2xl font-bold text-green-600">
            ₹{totalRevenue}
          </h2>
        </div>

        <div className="stat-card p-4">
          <p>Active Plans</p>
          <h2 className="text-2xl font-bold">{activeCount}</h2>
        </div>

        <div className="stat-card p-4">
          <p>Expiring Soon</p>
          <h2 className="text-2xl font-bold text-yellow-500">
            {expiringSoon}
          </h2>
        </div>
      </div>

      {/* TABLE */}
      <div className="stat-card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left">School</th>
              <th className="p-4 text-left">Plan</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">End Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {schools.map((s) => {
              const name = s.schoolInfo?.name;
              const logo = s.schoolInfo?.logo;

              return (
                <tr key={s._id} className="border-b">
                  <td className="p-4">
                    <div className="flex gap-3 items-center">
                      {logo ? (
                        <img src={logo} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {name?.[0]}
                        </div>
                      )}
                      <div>
                        <p>{name}</p>
                        <p className="text-xs text-gray-500">
                          {s.schoolInfo?.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {s.systemInfo?.subscriptionPlan}
                  </td>

                  <td className="p-4">
                    ₹{PLAN_PRICE[s.systemInfo?.subscriptionPlan] || 0}
                  </td>

                  <td className="p-4">
                    {s.systemInfo?.subscriptionEndDate || "-"}
                  </td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => openModal(s, "renew")}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                    >
                      Renew
                    </button>

                    <button
                      onClick={() => openModal(s, "upgrade")}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                      Upgrade
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selectedSchool && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[9999]">
          <div className="bg-white p-6 rounded-xl w-[420px]">

            <h2 className="text-lg font-bold mb-2">
              {actionType === "upgrade" ? "Upgrade Plan" : "Renew Plan"}
            </h2>

            <p className="mb-4">
              {selectedSchool.schoolInfo?.name}
            </p>

            {/* ONLY SHOW PLAN SELECT FOR UPGRADE */}
            {actionType === "upgrade" && (
              <div className="space-y-2 mb-4">
                {["Basic", "Standard", "Premium"].map((plan) => (
                  <div
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedPlan === plan
                        ? "bg-blue-600 text-white"
                        : ""
                    }`}
                  >
                    {plan} - ₹{PLAN_PRICE[plan]}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedSchool(null)}
                className="border px-3 py-1 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}