import type { RouteEntry } from '../../shared/types';
import './events';
import studentRoutes from './routes/studentRoutes';

const routes: RouteEntry[] = [
  { path: '/api/students', router: studentRoutes },
];

export default routes;
