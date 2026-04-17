import { create, attachRelatedEvents, generateUserJourney, updateStatus, rerun, remove } from './command-handlers.js';
import { list, listLogs, detail, downloadUids } from './query-handlers.js';

export const reportsController = {
  list,
  create,
  listLogs,
  detail,
  downloadUids,
  attachRelatedEvents,
  generateUserJourney,
  updateStatus,
  rerun,
  delete: remove,
};
