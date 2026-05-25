import type { RouteEntry } from '../../shared/types';
import './events';
import dataImportRoutes from './routes/dataImportRoutes';

const routes: RouteEntry[] = [
  { path: '/api/data-import', router: dataImportRoutes },
];

export default routes;
