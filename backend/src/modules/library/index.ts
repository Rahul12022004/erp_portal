import type { RouteEntry } from '../../shared/types';
import './events';
import libraryRoutes from './routes/libraryRoutes';

const routes: RouteEntry[] = [
  { path: '/api/library', router: libraryRoutes },
];

export default routes;
