import type { RouteEntry } from '../../shared/types';
import socialMediaRoutes from './routes/socialMediaRoutes';

const routes: RouteEntry[] = [
  { path: '/api/social-media', router: socialMediaRoutes },
];

export default routes;
