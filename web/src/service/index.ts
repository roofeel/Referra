import { manualAttributionApi } from './manualAttribution';
import { nonAttributedReportsApi } from './nonAttributedReports';
import { reportsApi } from './reports';
import { usersApi } from './users';
import { urlRulesApi } from './urlRules';
import { deliveryDashboardApi } from './deliveryDashboard';
import { deliveryRefreshApi } from './deliveryRefresh';
import { deliverySettingsApi } from './deliverySettings';

export const api = {
  nonAttributedReports: nonAttributedReportsApi,
  manualAttribution: manualAttributionApi,
  reports: reportsApi,
  users: usersApi,
  urlRules: urlRulesApi,
  deliveryDashboard: deliveryDashboardApi,
  deliveryRefresh: deliveryRefreshApi,
  deliverySettings: deliverySettingsApi,
};

export * from './types';
