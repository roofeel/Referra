import { reportsApi } from './reports';
import { usersApi } from './users';
import { urlRulesApi } from './urlRules';

export const api = {
  reports: reportsApi,
  users: usersApi,
  urlRules: urlRulesApi,
};

export * from './types';
