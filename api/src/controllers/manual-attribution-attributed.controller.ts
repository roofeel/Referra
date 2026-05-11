import { z } from 'zod';
import {
  enqueueManualAttributedJob,
  listManualAttributedJobs,
  getManualAttributedJob,
} from '../services/manual-attribution-attributed-jobs.service.js';

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

const createJobBodySchema = z.object({
  sqlTemplate: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  database: z.string().optional(),
  workgroup: z.string().optional(),
  resultS3: z.string().optional(),
});

function resolveDefaults(body: z.infer<typeof createJobBodySchema>) {
  const database = (body.database || process.env.ATHENA_DATABASE || '').trim();
  const workgroup = (body.workgroup || process.env.ATHENA_WORKGROUP || 'primary').trim();
  const resultS3 = (body.resultS3 || process.env.ATHENA_OUTPUT_LOCATION || '').trim();

  if (!database) {
    throw new Error('database is required. provide database or ATHENA_DATABASE');
  }
  if (!resultS3) {
    throw new Error('resultS3 is required. provide resultS3 or ATHENA_OUTPUT_LOCATION');
  }

  return { database, workgroup, resultS3 };
}

export const manualAttributedController = {
  listJobs: async (req: Request) => {
    const url = new URL(req.url);
    const statusRaw = (url.searchParams.get('status') || '').trim().toLowerCase();
    const status =
      statusRaw === 'pending' || statusRaw === 'running' || statusRaw === 'completed' || statusRaw === 'failed'
        ? statusRaw
        : undefined;
    const search = url.searchParams.get('search')?.trim() || '';
    const startDate = url.searchParams.get('startDate')?.trim() || '';
    const endDate = url.searchParams.get('endDate')?.trim() || '';

    const jobs = listManualAttributedJobs({ status, search, startDate, endDate });
    return Response.json({ tasks: jobs });
  },

  createJob: async (req: Request) => {
    try {
      const body = createJobBodySchema.parse(await req.json());
      const defaults = resolveDefaults(body);
      const job = enqueueManualAttributedJob({
        sqlTemplate: body.sqlTemplate,
        startDate: body.startDate,
        endDate: body.endDate,
        ...defaults,
      });
      return Response.json(job, { status: 202 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create manual attribution job';
      return Response.json({ error: message }, { status: 400 });
    }
  },

  getJob: async (req: Request) => {
    const request = req as RequestWithParams<{ jobId: string }>;
    const job = getManualAttributedJob(request.params.jobId);
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }
    return Response.json(job);
  },
};
