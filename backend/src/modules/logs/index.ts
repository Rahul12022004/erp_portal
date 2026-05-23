import type { RouteEntry } from '../../shared/types';
import logRoutes from './routes/logRoutes';

const routes: RouteEntry[] = [
  { path: '/api/logs', router: logRoutes },
];

export default routes;
