import type { RouteEntry } from '../../shared/types';
import './events';
import inventoryRoutes from './routes/inventoryRoutes';

const routes: RouteEntry[] = [
  { path: '/api/inventory', router: inventoryRoutes },
];

export default routes;
