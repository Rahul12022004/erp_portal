import type { RouteEntry } from '../../shared/types';
import './events';
import transportRoutes from './routes/transportRoutes';

const routes: RouteEntry[] = [
  { path: '/api/transport', router: transportRoutes },
];

export default routes;
