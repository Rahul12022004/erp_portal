import type { RouteEntry } from '../../shared/types';
import './events';
import maintenanceRoutes from './routes/maintenanceRoutes';

const routes: RouteEntry[] = [
  { path: '/api/maintenance', router: maintenanceRoutes },
];

export default routes;
