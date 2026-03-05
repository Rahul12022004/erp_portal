import { useParams } from "react-router-dom";

import AttendanceModule from "./modules/AttendanceModule";
import AssignmentsModule from "./modules/AssignmentsModule";
import ExamsModule from "./modules/ExamsModule";
import StudentsModule from "./modules/StudentModule";
import DigitalClassroomModule from "./modules/DigitalClassroomModule";
import TimeTableModule from "./modules/TimeTableModule";
import CommunicationModule from "./modules/CommunicationModule";

const moduleNames: Record<string, string> = {
  students: "My Students",
  attendance: "Attendance",
  assignments: "Assignments",
  marks: "Marks & Grades",
  exams: "Exams",
  "digital-classroom": "Digital Classroom",
  timetable: "Time Table",
  communication: "Communication",
};

export default function TeacherModulePage() {
  const { module } = useParams();
  const title = moduleNames[module || ""] || module || "Module";

  const renderModule = () => {
    switch (module) {

      case "students":
        return <StudentsModule />;
    
      case "attendance":
        return <AttendanceModule />;
    
      case "assignments":
        return <AssignmentsModule />;
    
      case "exams":
        return <ExamsModule />;
      
      case "digital-classroom":   // ✅ fixed
        return <DigitalClassroomModule />;
      
      case "timetable":
        return <TimeTableModule />;
      
      case "communication":
        return <CommunicationModule />;

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
        <h2 className="page-header text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{title} management</p>
      </div>

      {renderModule()}
    </div>
  );
}