import { deliveryDashboardController } from '../controllers/index.js';

export const deliveryDashboardRoutes = {
  '/api/delivery-dashboard': {
    GET: deliveryDashboardController.get,
  },
  '/api/delivery-dashboard/settings': {
    GET: deliveryDashboardController.getSettings,
    PUT: deliveryDashboardController.updateSettings,
  },
  '/api/delivery-dashboard/refresh': {
    POST: deliveryDashboardController.refresh,
  },
  '/api/delivery-dashboard/refresh/schedule': {
    GET: deliveryDashboardController.getSchedule,
    PUT: deliveryDashboardController.updateSchedule,
  },
  '/api/delivery-dashboard/refresh/logs': {
    GET: deliveryDashboardController.logs,
  },
};
