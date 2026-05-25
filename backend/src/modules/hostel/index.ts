import type { RouteEntry } from '../../shared/types';
import './events';
import hostelRoutes from './routes/hostelRoutes';

const routes: RouteEntry[] = [
  { path: '/api/hostels', router: hostelRoutes },
];

export default routes;
