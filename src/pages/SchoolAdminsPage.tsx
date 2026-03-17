import { useState } from "react";
import { Search, Edit, Trash2, ShieldOff } from "lucide-react";

interface AdminData {
  id: number;
  name: string;
  email: string;
  school: string;
  role: string;
  status: "Active" | "Disabled";
  lastLogin: string;
}

const mockAdmins: AdminData[] = [
  { id: 1, name: "John Smith ", email: "john@greenwood.edu", school: "Greenwood Academy", role: "School Admin", status: "Active", lastLogin: "2024-06-15 09:30" },
  { id: 2, name: "Sarah Johnson", email: "sarah@sunrise.edu", school: "Sunrise International", role: "School Admin", status: "Active", lastLogin: "2024-06-14 14:22" },
  { id: 3, name: "Michael Brown", email: "michael@heritage.edu", school: "Heritage School", role: "School Admin", status: "Active", lastLogin: "2024-06-13 11:15" },
  { id: 4, name: "Emily Davis", email: "emily@mapleton.edu", school: "Mapleton High", role: "School Admin", status: "Disabled", lastLogin: "2024-05-20 16:45" },
  { id: 5, name: "Robert Wilson", email: "robert@riverside.edu", school: "Riverside Public", role: "School Admin", status: "Active", lastLogin: "2024-06-15 08:10" },
];

export default function SchoolAdminsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockAdmins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.school.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">School Admins</h1>
        <p className="text-sm text-muted-foreground mt-1">{mockAdmins.length} admins registered</p>
      </div>

      <div className="stat-card !p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>
      </div>

      <div className="stat-card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-muted-foreground">Admin</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">School</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Role</th>
              <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Last Login</th>
              <th className="text-right p-4 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((admin) => (
              <tr key={admin.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {admin.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground hidden md:table-cell">{admin.school}</td>
                <td className="p-4 hidden lg:table-cell">{admin.role}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    admin.status === "Active"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {admin.status}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground hidden lg:table-cell">{admin.lastLogin}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-warning/10 transition-colors" title="Disable">
                      <ShieldOff className="w-4 h-4 text-warning" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
