import { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
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
  subscription: "Paid" | "Unpaid";
  subscriptionEnd: string;
  created: string;
  type: "Public" | "Private";
}

const mockSchools: SchoolData[] = [
  {
    id: 1,
    name: "Greenwood Academy",
    email: "info@greenwood.edu",
    phone: "+1 234-567-8901",
    address: "123 Oak St",
    admin: "John Smith",
    status: "Active",
    subscription: "Paid",
    subscriptionEnd: "2026-12-31",
    created: "2024-01-15",
    type: "Private",
  },
  {
    id: 2,
    name: "Sunrise International",
    email: "contact@sunrise.edu",
    phone: "+1 234-567-8902",
    address: "456 Elm Ave",
    admin: "Sarah Johnson",
    status: "Active",
    subscription: "Unpaid",
    subscriptionEnd: "",
    created: "2024-02-20",
    type: "Private",
  },
  {
    id: 3,
    name: "Heritage School",
    email: "admin@heritage.edu",
    phone: "+1 234-567-8903",
    address: "789 Pine Rd",
    admin: "Michael Brown",
    status: "Active",
    subscription: "Paid",
    subscriptionEnd: "2026-08-15",
    created: "2024-03-10",
    type: "Public",
  },
  {
    id: 4,
    name: "Mapleton High",
    email: "info@mapleton.edu",
    phone: "+1 234-567-8904",
    address: "321 Maple Dr",
    admin: "Emily Davis",
    status: "Inactive",
    subscription: "Unpaid",
    subscriptionEnd: "",
    created: "2024-04-05",
    type: "Public",
  },
  {
    id: 5,
    name: "Riverside Public",
    email: "office@riverside.edu",
    phone: "+1 234-567-8905",
    address: "654 River Ln",
    admin: "Robert Wilson",
    status: "Active",
    subscription: "Paid",
    subscriptionEnd: "2026-05-12",
    created: "2024-05-12",
    type: "Public",
  },
];

export default function SchoolsPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = mockSchools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Schools</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockSchools.length} schools registered
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
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
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="stat-card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          
          {/* Header */}
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4">School</th>
              <th className="text-left p-4 hidden md:table-cell">Type</th>
              <th className="text-left p-4 hidden lg:table-cell">Admin</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Subscription</th>
              <th className="text-left p-4">End Date</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filtered.map((school) => {
              const initials = school.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("");

              return (
                <tr
                  key={school.id}
                  className="border-b border-border hover:bg-muted/30"
                >
                  {/* School */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {initials}
                      </div>

                      <div>
                        <p className="font-medium">{school.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {school.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-4 hidden md:table-cell text-muted-foreground">
                    {school.type}
                  </td>

                  {/* Admin */}
                  <td className="p-4 hidden lg:table-cell">
                    {school.admin}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        school.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {school.status}
                    </span>
                  </td>

                  {/* Subscription */}
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        school.subscription === "Paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {school.subscription}
                    </span>
                  </td>

                  {/* End Date */}
                  <td className="p-4 text-muted-foreground">
                    {school.subscription === "Paid"
                      ? school.subscriptionEnd
                      : "-"}
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 hover:bg-muted rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-muted rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && <AddSchoolModal onClose={() => setShowModal(false)} />}
    </div>
  );
}