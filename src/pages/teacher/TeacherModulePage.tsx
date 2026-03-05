import { useParams } from "react-router-dom";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-header text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{title} management</p>
      </div>
      <div className="stat-card flex items-center justify-center h-64">
        <p className="text-lg text-muted-foreground">{title} — Coming Soon</p>
      </div>
    </div>
  );
}
