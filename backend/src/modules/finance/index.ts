import type { RouteEntry } from '../../shared/types';
import bankingRoutes from './routes/bankingRoutes';
import expenseRoutes from './routes/expenseRoutes';
import financeRoutes from './routes/financeRoutes';
import salaryStructureRoutes from './routes/salaryStructureRoutes';

const routes: RouteEntry[] = [
  { path: '/api/banking', router: bankingRoutes },
  { path: '/api/expenses', router: expenseRoutes },
  { path: '/api/finance', router: financeRoutes },
  { path: '/api/salary-structures', router: salaryStructureRoutes },
];

export default routes;
