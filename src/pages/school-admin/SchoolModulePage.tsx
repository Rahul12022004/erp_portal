import { useParams } from "react-router-dom";
import CommunicationModule from "./modules/CommunicationModule";
import AcademicsModule from "./modules/AcademicsModule"; // ✅ added
import AttendanceModule from "./modules/AttendenceModule";
<<<<<<< HEAD
import ApprovalsModule from "./modules/ApprovalsModule";
import MaintenanceModule from "./modules/MaintenanceModule";
import SurveyModule from "./modules/SurveyModule";
import DownloadsModule from "./modules/DownloadsModule.tsx"
=======
import StudentModule from "./modules/StudentModule";
import StaffModule from "./modules/StaffModule";
import DigitalClassroomModule from "./modules/DigitalClassroomModule";
import FinanceModule from "./modules/FinanceModule";
import AdmissionsModule from "./modules/AdmissionsModule";
import TransportModule from "./modules/TransportModule";
import HostelModule from "./modules/HostelModule";
import LibraryModule from "./modules/LibraryModule";
import InventoryModule from "./modules/InventoryModule";
import ApprovalsModule from "./modules/ApprovalsModule";
import MaintenanceModule from "./modules/MaintenanceModule";
import SurveyModule from "./modules/SurveyModule";
import SupportModule from "./modules/SupportModule";
>>>>>>> 0bc2111 (Added academics module changes)

const moduleNames: Record<string, string> = {
  communication: "Communication",
  academics: "Academics", // ✅ added
  attendance: "Attendance",
  students: "Students",
  staff: "Staff",
  "digital-classroom": "Digital Classroom",
  finance: "Finance",
  admissions: "Admissions",
  transport: "Transport",
  hostel: "Hostel",
  library: "Library",
  inventory: "Inventory",
  approvals: "Approvals",
  maintenance: "Maintenance",
  survey: "Survey",
  support: "Support",
};

export default function SchoolModulePage() {
  const { module } = useParams();
  const title = moduleNames[module || ""] || module || "Module";

  const renderModule = () => {
    switch (module) {
      case "communication":
        return <CommunicationModule />;

      case "academics": // ✅ added
        return <AcademicsModule />;
      
      case "attendance":
        return <AttendanceModule />;
      
      case "approvals":
        return <ApprovalsModule />;
      
      case "maintenance":
        return <MaintenanceModule />;
      
      case "survey":
        return <SurveyModule />;
      
      case "downloads":
        return <DownloadsModule />;

      case "students":
        return <StudentModule />;

      case "staff":
        return <StaffModule />;

      case "digital-classroom":
        return <DigitalClassroomModule />;

      case "finance":
        return <FinanceModule />;

      case "admissions":
        return <AdmissionsModule />;

      case "transport":
        return <TransportModule />;

      case "hostel":
        return <HostelModule />;

      case "library":
        return <LibraryModule />;

      case "inventory":
        return <InventoryModule />;

      case "approvals":
        return <ApprovalsModule />;

      case "maintenance":
        return <MaintenanceModule />;

      case "survey":
        return <SurveyModule />;

      case "support":
        return <SupportModule />;

      default:
        return (
          <div className="stat-card flex items-center justify-center h-64">
            <p className="text-lg text-muted-foreground">
              {title} — Coming Soon
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Manage {title.toLowerCase()}
        </p>
      </div>

      {renderModule()}
    </div>
  );
}
