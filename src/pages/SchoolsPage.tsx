import { useState } from "react";

import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  School as SchoolIcon,
} from "lucide-react";
import { AddSchoolModal } from "@/components/AddSchoolModal";

interface SchoolData {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  admin: string;
  status: "Active" | "Inactive";
  created: string;
  type: "Public" | "Private";
}

const mockSchools: SchoolData[] = [
  { id: 1, name: "Greenwood Academy", email: "info@greenwood.edu", phone: "+1 234-567-8901", address: "123 Oak St, Springfield", admin: "John Smith", status: "Active", created: "2024-01-15", type: "Private" },
  { id: 2, name: "Sunrise International", email: "contact@sunrise.edu", phone: "+1 234-567-8902", address: "456 Elm Ave, Riverside", admin: "Sarah Johnson", status: "Active", created: "2024-02-20", type: "Private" },
  { id: 3, name: "Heritage School", email: "admin@heritage.edu", phone: "+1 234-567-8903", address: "789 Pine Rd, Lakewood", admin: "Michael Brown", status: "Active", created: "2024-03-10", type: "Public" },
  { id: 4, name: "Mapleton High", email: "info@mapleton.edu", phone: "+1 234-567-8904", address: "321 Maple Dr, Hilltown", admin: "Emily Davis", status: "Inactive", created: "2024-04-05", type: "Public" },
  { id: 5, name: "Riverside Public", email: "office@riverside.edu", phone: "+1 234-567-8905", address: "654 River Ln, Bayview", admin: "Robert Wilson", status: "Active", created: "2024-05-12", type: "Public" },
];

export default function SchoolsPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = mockSchools.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Schools</h1>
          <p className="text-sm text-muted-foreground mt-1">{mockSchools.length} schools registered</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add School
        </button>
      </div>

      {/* Search */}
      <div className="stat-card !p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>
      </div>

      {/* Table */}
      <div className="stat-card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-muted-foreground">School</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Email</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Phone</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden xl:table-cell">Admin</th>
              <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
              <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Created</th>
              <th className="text-right p-4 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((school) => (
              <tr key={school.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <SchoolIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{school.name}</p>
                      <p className="text-xs text-muted-foreground">{school.type}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground hidden md:table-cell">{school.email}</td>
                <td className="p-4 text-muted-foreground hidden lg:table-cell">{school.phone}</td>
                <td className="p-4 hidden xl:table-cell">{school.admin}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    school.status === "Active"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {school.status}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground hidden lg:table-cell">{school.created}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="View">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                      <Edit className="w-4 h-4 text-muted-foreground" />
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

      {showModal && <AddSchoolModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
