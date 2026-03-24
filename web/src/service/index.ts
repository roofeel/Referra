import { usersApi } from './users';
import { urlRulesApi } from './urlRules';

export const api = {
  users: usersApi,
  urlRules: urlRulesApi,
};

export * from './types';
