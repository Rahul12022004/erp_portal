import type { RouteEntry } from '../../shared/types';
import './events';
import logRoutes from './routes/logRoutes';

const routes: RouteEntry[] = [
  { path: '/api/logs', router: logRoutes },
];

export default routes;
