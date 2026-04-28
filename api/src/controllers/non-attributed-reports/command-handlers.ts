import { nonAttributedReports } from '../../../../packages/db/index.js';
import { normalizeReportTaskStatus, progressLabelFor } from '../../lib/reports-presentation.lib.js';
import {
  createNonAttributedReportTask,
  rerunNonAttributedReportTask,
} from '../../services/non-attributed-reports-command-workflows.service.js';
import { createNonAttributedReportBodySchema, updateStatusBodySchema } from './command-schemas.js';
import { toServiceErrorResponse } from '../shared/service-error-response.helpers.js';
import { parseJsonBody } from '../shared/request-validation.helpers.js';
import { toTask } from './helpers.js';
import type { RequestWithParams } from './types.js';

export async function create(req: Request) {
  try {
    const body = await parseJsonBody(req, createNonAttributedReportBodySchema);
    const updated = await createNonAttributedReportTask(body);
    return Response.json(toTask(updated), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, 'Non-attributed report execution failed');
  }
}

export async function updateStatus(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  try {
    const body = await parseJsonBody(req, updateStatusBodySchema);
    const status = normalizeReportTaskStatus(body.status);

    if (!status) {
      return Response.json({ error: 'status is invalid' }, { status: 400 });
    }

    const current = await nonAttributedReports.findById(request.params.id);
    if (!current) {
      return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
    }

    const nextProgress =
      typeof body.progress === 'number' && Number.isFinite(body.progress)
        ? Math.max(0, Math.min(100, Math.round(body.progress)))
        : status === 'Completed'
          ? 100
          : current.progress;

    const updated = await nonAttributedReports.update(request.params.id, {
      status,
      progress: nextProgress,
      progressLabel: progressLabelFor(status, nextProgress),
      attribution:
        status === 'Completed'
          ? current.attribution === '--'
            ? '100.0%'
            : current.attribution
          : status === 'Failed'
            ? '--'
            : current.attribution,
    });

    return Response.json(toTask(updated));
  } catch (error) {
    return toServiceErrorResponse(error, 'Failed to update non-attributed report status');
  }
}

export async function rerun(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  try {
    const updated = await rerunNonAttributedReportTask(request.params.id);
    return Response.json(toTask(updated));
  } catch (error) {
    return toServiceErrorResponse(error, 'Rerun failed');
  }
}

export async function remove(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await nonAttributedReports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Non-attributed report task not found' }, { status: 404 });
  }

  await nonAttributedReports.delete(request.params.id);
  return new Response(null, { status: 204 });
}
