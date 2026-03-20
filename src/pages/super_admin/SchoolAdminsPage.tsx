import { useState, useEffect } from "react";
import { Search, Edit, Trash2 } from "lucide-react";

export default function SchoolAdminsPage() {
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
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Convert school → admin
  const admins = schools.map((s) => ({
    id: s._id,
    name: s.adminInfo?.name,
    email: s.adminInfo?.email,
    phone: s.adminInfo?.phone,
    school: s.schoolInfo?.name,
    logo: s.schoolInfo?.logo,
    status: s.adminInfo?.status || "Active",
    role: "School Admin",
    lastLogin: s.adminInfo?.lastLogin || "—",
  }));

  // 🔍 SEARCH
  const filtered = admins.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.school?.toLowerCase().includes(search.toLowerCase())
  );

  // 🗑 DELETE
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this admin (school)?")) return;

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

  // 🔒 TOGGLE STATUS
  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/schools/toggle/${id}`,
        { method: "PUT" }
      );

      if (!res.ok) throw new Error("Toggle failed");

      fetchSchools();
    } catch (error) {
      console.error(error);
      alert("Toggle failed");
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold">School Admins</h1>
        <p className="text-sm text-gray-500 mt-1">
          {admins.length} admins registered
        </p>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">

        {loading ? (
          <p className="p-4">Loading...</p>
        ) : (
          <table className="w-full text-sm">

            {/* HEADER */}
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="p-4">Admin</th>
                <th className="p-4">School</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Login</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {filtered.map((admin) => {

                const isValidLogo =
                  admin.logo &&
                  (admin.logo.startsWith("data:image") ||
                    admin.logo.startsWith("http"));

                const initials = admin.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("");

                return (
                  <tr key={admin.id} className="border-b hover:bg-gray-50">

                    {/* ADMIN */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">

                        {isValidLogo ? (
                          <img
                            src={admin.logo}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                            {initials}
                          </div>
                        )}

                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-xs text-gray-500">
                            {admin.email}
                          </p>
                        </div>

                      </div>
                    </td>

                    {/* SCHOOL */}
                    <td className="p-4">{admin.school}</td>

                    {/* PHONE */}
                    <td className="p-4">{admin.phone || "-"}</td>

                    {/* ROLE */}
                    <td className="p-4">{admin.role}</td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          admin.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {admin.status}
                      </span>
                    </td>

                    {/* LAST LOGIN */}
                    <td className="p-4 text-gray-500">
                      {admin.lastLogin}
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">

                        {/* ENABLE / DISABLE */}
                        <button
                          onClick={() => handleToggle(admin.id)}
                          className={`px-2 py-1 text-xs rounded ${
                            admin.status === "Active"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {admin.status === "Active"
                            ? "Disable"
                            : "Enable"}
                        </button>

                        {/* DELETE */}
                        <Trash2
                          onClick={() => handleDelete(admin.id)}
                          className="w-4 h-4 cursor-pointer text-red-500"
                        />

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>
        )}
      </div>
    </div>
  );
}