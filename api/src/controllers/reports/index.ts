import { create, attachRelatedEvents, updateStatus, rerun, remove } from './command-handlers.js';
import { list, listLogs, detail, downloadUids } from './query-handlers.js';

export const reportsController = {
  list,
  create,
  listLogs,
  detail,
  downloadUids,
  attachRelatedEvents,
  updateStatus,
  rerun,
  delete: remove,
};
