import { create, updateStatus, rerun, remove } from './command-handlers.js';
import { list, listLogs, detail } from './query-handlers.js';

export const nonAttributedReportsController = {
  list,
  create,
  listLogs,
  detail,
  updateStatus,
  rerun,
  delete: remove,
};
