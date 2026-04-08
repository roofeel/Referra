import { athenaTablesApi } from './athenaTables';
import { nonAttributedReportsApi } from './nonAttributedReports';
import { reportsApi } from './reports';
import { usersApi } from './users';
import { urlRulesApi } from './urlRules';

export const api = {
  athenaTables: athenaTablesApi,
  nonAttributedReports: nonAttributedReportsApi,
  reports: reportsApi,
  users: usersApi,
  urlRules: urlRulesApi,
};

export * from './types';
