import type { RouteEntry } from '../../shared/types';
import './events';
import assignmentRoutes from './routes/assignmentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import classRoutes from './routes/classRoutes';
import examRoutes from './routes/examRoutes';
import markRoutes from './routes/markRoutes';
import materialRoutes from './routes/materialRoutes';
import subjectRoutes from './routes/subjectRoutes';

const routes: RouteEntry[] = [
  { path: '/api/assignments', router: assignmentRoutes },
  { path: '/api/attendance', router: attendanceRoutes },
  { path: '/api/classes', router: classRoutes },
  { path: '/api/exams', router: examRoutes },
  { path: '/api/marks', router: markRoutes },
  { path: '/api/materials', router: materialRoutes },
  { path: '/api/subjects', router: subjectRoutes },
];

export default routes;
