import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { AddSchoolModal } from "@/components/AddSchoolModal";

export default function SchoolsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [viewData, setViewData] = useState<any>(null);
  const [search, setSearch] = useState("");
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 SEARCH
  const filtered = schools.filter(
    (s) =>
      s.schoolInfo?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.schoolInfo?.email?.toLowerCase().includes(search.toLowerCase())
  );

  // 🗑 DELETE
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this school?")) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/schools/${id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Delete failed");

      fetchSchools();
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  };

  // ✏️ EDIT
  const handleEdit = (school: any) => {
    setEditData(school);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between">
        <div>
          <h1 className="page-header">Schools</h1>
          <p className="text-sm text-muted-foreground">
            {schools.length} schools registered
          </p>
        </div>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded"
        >
          <Plus className="w-4 h-4" />
          Add School
        </button>
      </div>

      {/* SEARCH */}
      <div className="stat-card p-4">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* TABLE */}
      <div className="stat-card overflow-x-auto">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left">School</th>
                <th className="p-4 text-left">Admin</th>
                <th className="p-4 text-left">Plan</th>
                <th className="p-4 text-left">End</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((school) => {
                const name = school.schoolInfo?.name || "";
                const logo = school.schoolInfo?.logo;

                const initials = name
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("");

                const isValidLogo =
                  logo &&
                  (logo.startsWith("data:image") || logo.startsWith("http"));

                return (
                  <tr key={school._id} className="border-b hover:bg-gray-50">

                    {/* SCHOOL */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">

                        {isValidLogo ? (
                          <img
                            src={logo}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
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

                    <td className="p-4">{school.adminInfo?.name}</td>

                    <td className="p-4">
                      {school.systemInfo?.subscriptionPlan}
                    </td>

                    <td className="p-4">
                      {school.systemInfo?.subscriptionEndDate || "-"}
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right flex justify-end gap-3">

                      <Eye
                        onClick={() => setViewData(school)}
                        className="w-4 h-4 cursor-pointer text-green-600"
                      />

                      <Edit
                        onClick={() => handleEdit(school)}
                        className="w-4 h-4 cursor-pointer text-blue-500"
                      />

                      <Trash2
                        onClick={() => handleDelete(school._id)}
                        className="w-4 h-4 text-red-500 cursor-pointer"
                      />

                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <AddSchoolModal
          editData={editData}
          onClose={() => setShowModal(false)}
          onSuccess={fetchSchools}
        />
      )}

      {/* 👁 VIEW MODAL */}
      {viewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">

          <div className="bg-white w-[700px] max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-xl">

            {/* HEADER */}
            <div className="flex items-center gap-4 mb-6">
              {viewData.schoolInfo?.logo ? (
                <img
                  src={viewData.schoolInfo.logo}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                  {viewData.schoolInfo?.name?.[0]}
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold">
                  {viewData.schoolInfo?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {viewData.schoolInfo?.email}
                </p>
              </div>
            </div>

            {/* SCHOOL INFO */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">School Info</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><b>Phone:</b> {viewData.schoolInfo?.phone}</p>
                <p><b>Website:</b> {viewData.schoolInfo?.website}</p>
                <p><b>Address:</b> {viewData.schoolInfo?.address}</p>
                <p><b>Type:</b> {viewData.systemInfo?.schoolType}</p>
              </div>
            </div>

            {/* ADMIN */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Admin Info</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><b>Name:</b> {viewData.adminInfo?.name}</p>
                <p><b>Email:</b> {viewData.adminInfo?.email}</p>
                <p><b>Phone:</b> {viewData.adminInfo?.phone}</p>
                <p><b>Status:</b> {viewData.adminInfo?.status}</p>
              </div>
            </div>

            {/* SUBSCRIPTION */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Subscription</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><b>Plan:</b> {viewData.systemInfo?.subscriptionPlan}</p>
                <p><b>End Date:</b> {viewData.systemInfo?.subscriptionEndDate || "-"}</p>
                <p><b>Max Students:</b> {viewData.systemInfo?.maxStudents}</p>
              </div>
            </div>

            {/* MODULES */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Modules</h3>
              <div className="flex flex-wrap gap-2">
                {viewData.modules?.length ? (
                  viewData.modules.map((mod: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {mod}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No modules assigned
                  </p>
                )}
              </div>
            </div>

            {/* CLOSE */}
            <div className="flex justify-end">
              <button
                onClick={() => setViewData(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}