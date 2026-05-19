import { useParams } from "react-router-dom";
import AIAssistant from "@/components/AIAssistant";
import AcademicsModule from "@/modules/academics/AcademicsModule";
import AdmissionsModule from "@/modules/admissions/AdmissionsModule";
import ApprovalsModule from "@/modules/approvals/ApprovalsModule";
import AttendanceModule from "@/modules/attendance/AttendenceModule";
import ClassModule from "@/modules/classes/ClassModule";
import CommunicationModule from "@/modules/communication/CommunicationModule";
import DownloadsModule from "@/modules/downloads/DownloadsModule";
import ExamsModule from "@/modules/exams/ExamsModule";
import FinanceModule from "@/modules/finance/FinanceModule";
import HostelModule from "@/modules/hostel/HostelModule";
import HRModule from "@/modules/hr/HRModule";
import InventoryModule from "@/modules/inventory/InventoryModule";
import LibraryModule from "@/modules/library/LibraryModule";
import MaintenanceModule from "@/modules/maintenance/MaintenanceModule";
import StaffModule from "@/modules/staff/StaffModule";
import StudentModule from "@/modules/students/StudentModule";
import SupportModule from "@/modules/support/SupportModule";
import SurveyModule from "@/modules/survey/SurveyModule";
import TransportModule from "@/modules/transport/TransportModule";
import SportsModule from "@/modules/sports/SportsModule";
import HouseModule from "@/modules/house/HouseModule";
import SocialMediaModule from "@/modules/social-media/SocialMediaModule";
import VisitorModule from "@/modules/visitor/VisitorModule";
import DataImportModule from "@/modules/data-import/DataImportModule";
import TimetableModule from "@/modules/timetable/TimetableModule";
import SalaryModule from "@/modules/salary/SalaryModule";

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
  salary: "Salary Management",
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
  "time-table": "Timetable Management",
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
      case "salary":
        return <SalaryModule />;
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
      case "time-table":
        return <TimetableModule />;
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

      <AIAssistant />
    </div>
  );
}
