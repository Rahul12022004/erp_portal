import type { RouteEntry } from '../../shared/types';
import surveyRoutes from './routes/surveyRoutes';

const routes: RouteEntry[] = [
  { path: '/api/surveys', router: surveyRoutes },
];

export default routes;
