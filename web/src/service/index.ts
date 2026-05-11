import { manualAttributionApi } from './manualAttribution';
import { nonAttributedReportsApi } from './nonAttributedReports';
import { reportsApi } from './reports';
import { usersApi } from './users';
import { urlRulesApi } from './urlRules';

export const api = {
  nonAttributedReports: nonAttributedReportsApi,
  manualAttribution: manualAttributionApi,
  reports: reportsApi,
  users: usersApi,
  urlRules: urlRulesApi,
};

export * from './types';
