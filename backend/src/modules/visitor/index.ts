import type { RouteEntry } from '../../shared/types';
import visitorRoutes from './routes/visitorRoutes';

const routes: RouteEntry[] = [
  { path: '/api/visitors', router: visitorRoutes },
];

export default routes;
