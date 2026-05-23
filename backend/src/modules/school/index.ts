import type { RouteEntry } from '../../shared/types';
import schoolRoutes from './routes/schoolRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const routes: RouteEntry[] = [
  { path: '/api/schools', router: schoolRoutes, skipAuth: true },
  { path: '/api/dashboard', router: dashboardRoutes },
];

export default routes;
