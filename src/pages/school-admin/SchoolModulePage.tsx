import { useParams } from "react-router-dom";
import CommunicationModule from "./modules/CommunicationModule";
import AcademicsModule from "./modules/AcademicsModule"; // ✅ added
import AttendanceModule from "./modules/AttendenceModule";
import ApprovalsModule from "./modules/ApprovalsModule";
import MaintenanceModule from "./modules/MaintenanceModule";
import SurveyModule from "./modules/SurveyModule";
import DownloadsModule from "./modules/DownloadsModule.tsx"

const moduleNames: Record<string, string> = {
  communication: "Communication",
  academics: "Academics", // ✅ added
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