import type { RouteEntry } from '../../shared/types';
import aiRoutes from './routes/aiRoutes';

const routes: RouteEntry[] = [
  { path: '/api/ai', router: aiRoutes },
];

export default routes;
