import type { RouteEntry } from '../shared/types';

import academicsRoutes from '../modules/academics';
import adminRoutes from '../modules/admin';
import admissionsRoutes from '../modules/admissions';
import aiRoutes from '../modules/ai';
import aiAssistantRoutes from '../modules/ai-assistant';
import analyticsRoutes from '../modules/analytics';
import attendanceRoutes from '../modules/attendance';
import auditRoutes from '../modules/audit';
import authRoutes from '../modules/auth';
import certificatesRoutes from '../modules/certificates';
import communicationRoutes from '../modules/communication';
import dataImportRoutes from '../modules/data-import';
import examsRoutes from '../modules/exams';
import feesRoutes from '../modules/fees';
import financeRoutes from '../modules/finance';
import homeworkRoutes from '../modules/homework';
import hostelRoutes from '../modules/hostel';
import integrationsRoutes from '../modules/integrations';
import inventoryRoutes from '../modules/inventory';
import libraryRoutes from '../modules/library';
import logsRoutes from '../modules/logs';
import maintenanceRoutes from '../modules/maintenance';
import notificationsRoutes from '../modules/notifications';
import parentsRoutes from '../modules/parents';
import payrollRoutes from '../modules/payroll';
import reportsRoutes from '../modules/reports';
import schoolRoutes from '../modules/school';
import settingsRoutes from '../modules/settings';
import socialRoutes from '../modules/social';
import staffRoutes from '../modules/staff';
import studentsRoutes from '../modules/students';
import surveyRoutes from '../modules/survey';
import timetableRoutes from '../modules/timetable';
import transportRoutes from '../modules/transport';
import visitorRoutes from '../modules/visitor';

export const moduleRoutes: RouteEntry[] = [
  ...academicsRoutes,
  ...adminRoutes,
  ...admissionsRoutes,
  ...aiRoutes,
  ...aiAssistantRoutes,
  ...analyticsRoutes,
  ...attendanceRoutes,
  ...auditRoutes,
  ...authRoutes,
  ...certificatesRoutes,
  ...communicationRoutes,
  ...dataImportRoutes,
  ...examsRoutes,
  ...feesRoutes,
  ...financeRoutes,
  ...homeworkRoutes,
  ...hostelRoutes,
  ...integrationsRoutes,
  ...inventoryRoutes,
  ...libraryRoutes,
  ...logsRoutes,
  ...maintenanceRoutes,
  ...notificationsRoutes,
  ...parentsRoutes,
  ...payrollRoutes,
  ...reportsRoutes,
  ...schoolRoutes,
  ...settingsRoutes,
  ...socialRoutes,
  ...staffRoutes,
  ...studentsRoutes,
  ...surveyRoutes,
  ...timetableRoutes,
  ...transportRoutes,
  ...visitorRoutes,
];

// Guard: fail fast if two modules register the same path
const paths = moduleRoutes.map(r => r.path);
const seen = new Set<string>();
for (const p of paths) {
  if (seen.has(p)) {
    throw new Error(`Duplicate route path detected in moduleLoader: "${p}". Two modules are registering the same path.`);
  }
  seen.add(p);
}
