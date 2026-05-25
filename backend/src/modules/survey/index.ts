import type { RouteEntry } from '../../shared/types';
import './events';
import surveyRoutes from './routes/surveyRoutes';

const routes: RouteEntry[] = [
  { path: '/api/surveys', router: surveyRoutes },
];

export default routes;
