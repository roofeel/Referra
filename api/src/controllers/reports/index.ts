import { create, attachRelatedEvents, generateUserJourney, updateStatus, rerun, remove } from './command-handlers.js';
import { list, listLogs, detail, downloadUids, getUserJourneyJobStatus } from './query-handlers.js';

export const reportsController = {
  list,
  create,
  listLogs,
  detail,
  downloadUids,
  getUserJourneyJobStatus,
  attachRelatedEvents,
  generateUserJourney,
  updateStatus,
  rerun,
  delete: remove,
};
