import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import AIAssistant from "@/components/AIAssistant";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { ModuleFallback } from "@/shared/components/ModuleFallback";

const moduleComponents = {
  academics:       lazy(() => import("@modules/academics")),
  admissions:      lazy(() => import("@modules/admissions")),
  approvals:       lazy(() => import("@modules/approvals")),
  attendance:      lazy(() => import("@modules/attendance")),
  classes:         lazy(() => import("@modules/classes")),
  "digital-classroom": lazy(() => import("@modules/classes")),
  communication:   lazy(() => import("@modules/communication")),
  "data-import":   lazy(() => import("@modules/data-import")),
  downloads:       lazy(() => import("@modules/downloads")),
  exams:           lazy(() => import("@modules/exams")),
  finance:         lazy(() => import("@modules/finance")),
  hostel:          lazy(() => import("@modules/hostel")),
  discipline:      lazy(() => import("@modules/house")),
  hr:              lazy(() => import("@modules/hr")),
  inventory:       lazy(() => import("@modules/inventory")),
  library:         lazy(() => import("@modules/library")),
  maintenance:     lazy(() => import("@modules/maintenance")),
  salary:          lazy(() => import("@modules/salary")),
  "social-media":  lazy(() => import("@modules/social-media")),
  sports:          lazy(() => import("@modules/sports")),
  staff:           lazy(() => import("@modules/staff")),
  students:        lazy(() => import("@modules/students")),
  support:         lazy(() => import("@modules/support")),
  survey:          lazy(() => import("@modules/survey")),
  "time-table":    lazy(() => import("@modules/timetable")),
  transport:       lazy(() => import("@modules/transport")),
  visitor:         lazy(() => import("@modules/visitor")),
} as const;

type ModuleKey = keyof typeof moduleComponents;

const moduleNames: Record<string, string> = {
  communication:       "Communication",
  academics:           "Academics",
  attendance:          "Attendance",
  classes:             "Classes",
  students:            "Students",
  staff:               "Staff",
  exams:               "Exams",
  "digital-classroom": "Classes",
  finance:             "Finance",
  admissions:          "Admissions",
  hr:                  "HR",
  salary:              "Salary Management",
  transport:           "Transport",
  hostel:              "Hostel",
  library:             "Library",
  inventory:           "Inventory",
  approvals:           "Approvals",
  maintenance:         "Maintenance",
  discipline:          "House",
  survey:              "Survey",
  downloads:           "Downloads",
  support:             "Support",
  sports:              "Sports",
  "social-media":      "Social Media",
  visitor:             "Visitor",
  "data-import":       "Data Import",
  "time-table":        "Timetable Management",
};

export default function SchoolModulePage() {
  const { module } = useParams();
  const key = module as ModuleKey | undefined;
  const title = moduleNames[key ?? ""] ?? key ?? "Module";
  const LazyModule = key ? moduleComponents[key] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Manage {title.toLowerCase()}</p>
      </div>

      {LazyModule ? (
        <ModuleErrorBoundary module={title}>
          <Suspense fallback={<ModuleFallback />}>
            <LazyModule />
          </Suspense>
        </ModuleErrorBoundary>
      ) : (
        <div className="stat-card flex h-64 items-center justify-center">
          <p className="text-lg text-muted-foreground">{title} - Coming Soon</p>
        </div>
      )}

      <AIAssistant />
    </div>
  );
}
