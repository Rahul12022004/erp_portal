import { useParams } from "react-router-dom";
import CommunicationModule from "./modules/CommunicationModule";
import AcademicsModule from "./modules/AcademicsModule"; // ✅ added
import AttendenceModule from "./modules/AttendenceModule"; // ✅ added

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
      
      case "attendence": // ✅ added
        return <AttendenceModule />;

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