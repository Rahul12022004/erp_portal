import { useParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";

import AttendanceModule from "./teacher/modules/AttendanceModule";
import AssignmentsModule from "./teacher/modules/AssignmentsModule";
import ExamsModule from "./teacher/modules/ExamsModule";
import MarksModule from "./teacher/modules/MarksModule";
import StudentsModule from "./teacher/modules/StudentModule";
import DigitalClassroomModule from "./teacher/modules/DigitalClassroomModule";
import TimeTableModule from "./teacher/modules/TimeTableModule";
import CommunicationModule from "./teacher/modules/CommunicationModule";
import LeaveModule from "./teacher/modules/LeaveModule";

const moduleNames: Record<string, string> = {
  students: "My Students",
  attendance: "Attendance",
  assignments: "Assignments",
  marks: "Marks & Grades",
  exams: "Exams",
  "digital-classroom": "Digital Classroom",
  timetable: "Time Table",
  communication: "Communication",
  leave: "Leave Application", // ✅ added
};

export default function TeacherModulePage() {
  const { teacherPermissions } = useRole();
  const { module } = useParams();
  const title = moduleNames[module || ""] || module || "Module";
  const isAllowedModule = !module || teacherPermissions.modules.includes(module);

  const renderModule = () => {
    switch (module) {

      case "students":
        return <StudentsModule />;
    
      case "attendance":
        return <AttendanceModule />;
    
      case "assignments":
        return <AssignmentsModule />;

      case "marks":
        return <MarksModule />;
    
      case "exams":
        return <ExamsModule />;
      
      case "digital-classroom":   // ✅ fixed
        return <DigitalClassroomModule />;
      
      case "timetable":
        return <TimeTableModule />;
      
      case "communication":
        return <CommunicationModule />;

      case "leave":
        return <LeaveModule />; // ✅ fixed

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

      {isAllowedModule ? (
        renderModule()
      ) : (
        <div className="stat-card flex h-64 items-center justify-center">
          <p className="text-lg text-muted-foreground">
            Access denied. This module is not assigned to your role.
          </p>
        </div>
      )}
    </div>
  );
}
