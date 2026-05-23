import type { RouteEntry } from '../../shared/types';
import leaveRoutes from './routes/leaveRoutes';
import staffRoutes from './routes/staffRoutes';
import teacherRoleRoutes from './routes/teacherRoleRoutes';

const routes: RouteEntry[] = [
  { path: '/api/leaves', router: leaveRoutes },
  { path: '/api/staff', router: staffRoutes, skipAuth: true },
  { path: '/api/teacher-roles', router: teacherRoleRoutes },
];

export default routes;
