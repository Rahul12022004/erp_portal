import { useParams } from "react-router-dom";

const moduleNames: Record<string, string> = {
  communication: "Communication",
  academics: "Academics",
  attendance: "Attendance",
  "digital-classroom": "Digital Classroom",
  exams: "Exams",
  finance: "Finance",
  admissions: "Admissions",
  hr: "Human Resources",
  transport: "Transport",
  hostel: "Hostel Management",
  library: "Library",
  inventory: "Inventory",
  store: "Store",
  cafeteria: "Cafeteria",
  bookstore: "Bookstore",
  "virtual-classes": "Virtual Classes",
  sports: "Sports",
  approvals: "Approvals",
  maintenance: "Maintenance",
  discipline: "Discipline",
  survey: "Survey",
  downloads: "Downloads",
  support: "Support",
  logs: "Activity Logs",
  settings: "Settings",
  timetable: "Time Table",
};

export default function SchoolModulePage() {
  const { module } = useParams();
  const title = moduleNames[module || ""] || module || "Module";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-header text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">Manage {title.toLowerCase()} for your school</p>
      </div>
      <div className="stat-card flex items-center justify-center h-64">
        <p className="text-lg text-muted-foreground">{title} — Coming Soon</p>
      </div>
    </div>
  );
}
