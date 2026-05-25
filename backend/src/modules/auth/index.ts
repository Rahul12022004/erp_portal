import type { RouteEntry } from '../../shared/types';
import authRoutes from './api/authRoutes';

const routes: RouteEntry[] = [
  { path: '/api/auth', router: authRoutes, skipAuth: true },
];

export default routes;
