import type { RouteEntry } from '../../shared/types';
import announcementRoutes from './routes/announcementRoutes';
import communicationRoutes from './routes/communicationRoutes';

const routes: RouteEntry[] = [
  { path: '/api/announcements', router: announcementRoutes },
  { path: '/api/communication', router: communicationRoutes },
];

export default routes;
