import { generateUserJourneyForReportRaw } from './reports-command-workflows.service.js';

export type UserJourneyJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type UserJourneyJob = {
  jobId: string;
  reportId: string;
  rawId: string;
  status: UserJourneyJobStatus;
  userJourneyDoc?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, UserJourneyJob>();

function nowIso() {
  return new Date().toISOString();
}

function buildJobId() {
  return crypto.randomUUID();
}

export function enqueueUserJourneyJob(reportId: string, rawId: string): UserJourneyJob {
  const timestamp = nowIso();
  const jobId = buildJobId();
  const job: UserJourneyJob = {
    jobId,
    reportId,
    rawId,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  jobs.set(jobId, job);

  queueMicrotask(async () => {
    const running = jobs.get(jobId);
    if (!running) return;

    running.status = 'running';
    running.updatedAt = nowIso();

    try {
      const result = await generateUserJourneyForReportRaw(reportId, rawId);
      running.status = 'completed';
      running.userJourneyDoc = result.userJourneyDoc;
      running.updatedAt = nowIso();
    } catch (error) {
      running.status = 'failed';
      running.error = error instanceof Error ? error.message : String(error);
      running.updatedAt = nowIso();
    }
  });

  return job;
}

export function getUserJourneyJob(jobId: string): UserJourneyJob | null {
  return jobs.get(jobId) || null;
}

