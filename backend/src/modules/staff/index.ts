import type { RouteEntry } from '../../shared/types';
import './events';
import leaveRoutes from './routes/leaveRoutes';
import staffRoutes from './routes/staffRoutes';
import teacherRoleRoutes from './routes/teacherRoleRoutes';

const routes: RouteEntry[] = [
  { path: '/api/leaves', router: leaveRoutes },
  // skipAuth: staffRoutes self-protects via internal router.use(authenticateToken) after the /login route
  { path: '/api/staff', router: staffRoutes, skipAuth: true },
  { path: '/api/teacher-roles', router: teacherRoleRoutes },
];

export default routes;
