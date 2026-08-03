import { deliveryDashboardController } from '../controllers/index.js';

export const deliveryDashboardRoutes = {
  '/api/delivery-dashboard': {
    GET: deliveryDashboardController.get,
  },
  '/api/delivery-dashboard/refresh': {
    POST: deliveryDashboardController.refresh,
  },
};
