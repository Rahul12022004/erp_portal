import { useParams } from "react-router-dom";
import AcademicsModule from "./modules/AcademicsModule";
import AdmissionsModule from "./modules/AdmissionsModule";
import ApprovalsModule from "./modules/ApprovalsModule";
import AttendanceModule from "./modules/AttendenceModule";
import ClassModule from "./modules/ClassModule";
import CommunicationModule from "./modules/CommunicationModule";
import DownloadsModule from "./modules/DownloadsModule";
import ExamsModule from "./modules/ExamsModule";
import FinanceModule from "./modules/FinanceModule";
import HostelModule from "./modules/HostelModule";
import HRModule from "./modules/HRModule";
import InventoryModule from "./modules/InventoryModule";
import LibraryModule from "./modules/LibraryModule";
import MaintenanceModule from "./modules/MaintenanceModule";
import StaffModule from "./modules/StaffModule";
import StudentModule from "./modules/StudentModule";
import SupportModule from "./modules/SupportModule";
import SurveyModule from "./modules/SurveyModule";
import TransportModule from "./modules/TransportModule";
import SportsModule from "./modules/SportsModule";
import HouseModule from "./modules/HouseModule";
import SocialMediaModule from "./modules/SocialMediaModule";
import VisitorModule from "./modules/VisitorModule";
import DataImportModule from "./modules/DataImportModule";

const moduleNames: Record<string, string> = {
  communication: "Communication",
  academics: "Academics",
  attendance: "Attendance",
  classes: "Classes",
  students: "Students",
  staff: "Staff",
  exams: "Exams",
  "digital-classroom": "Classes",
  finance: "Finance",
  admissions: "Admissions",
  hr: "HR",
  transport: "Transport",
  hostel: "Hostel",
  library: "Library",
  inventory: "Inventory",
  approvals: "Approvals",
  maintenance: "Maintenance",
  discipline: "House",
  survey: "Survey",
  downloads: "Downloads",
  support: "Support",
  sports: "Sports",
  "social-media": "Social Media",
  visitor: "Visitor",
  "data-import": "Data Import",
};

export default function SchoolModulePage() {
  const { module } = useParams();
  const title = moduleNames[module || ""] || module || "Module";

  const renderModule = () => {
    switch (module) {
      case "communication":
        return <CommunicationModule />;
      case "academics":
        return <AcademicsModule />;
      case "attendance":
        return <AttendanceModule />;
      case "classes":
        return <ClassModule />;
      case "students":
        return <StudentModule />;
      case "staff":
        return <StaffModule />;
      case "exams":
        return <ExamsModule />;
      case "digital-classroom":
        return <ClassModule />;
      case "finance":
        return <FinanceModule />;
      case "admissions":
        return <AdmissionsModule />;
      case "hr":
        return <HRModule />;
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
      case "discipline":
        return <HouseModule />;
      case "survey":
        return <SurveyModule />;
      case "downloads":
        return <DownloadsModule />;
      case "sports":
        return <SportsModule />;
      case "social-media":
        return <SocialMediaModule />;
      case "support":
        return <SupportModule />;
      case "visitor":
        return <VisitorModule />;
      case "data-import":
        return <DataImportModule />;
      default:
        return (
          <div className="stat-card flex h-64 items-center justify-center">
            <p className="text-lg text-muted-foreground">{title} - Coming Soon</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Manage {title.toLowerCase()}</p>
      </div>

      {renderModule()}
    </div>
  );
}
