import { reports } from '../../../../packages/db/index.js';
import { normalizeReportTaskStatus, progressLabelFor } from '../../lib/reports-presentation.lib.js';
import {
  attachRelatedEventsToReport,
  createReportTask,
  generateUserJourneyForReportRaw,
  rerunReportTask,
} from '../../services/reports-command-workflows.service.js';
import {
  attachRelatedEventsBodySchema,
  createReportBodySchema,
  updateStatusBodySchema,
} from './command-schemas.js';
import { toServiceErrorResponse } from '../shared/service-error-response.helpers.js';
import { parseJsonBody } from '../shared/request-validation.helpers.js';
import { toReportTask } from './helpers.js';
import type { RequestWithParams } from './types.js';

export async function create(req: Request) {
  try {
    const body = await parseJsonBody(req, createReportBodySchema);
    const updated = await createReportTask(body);
    return Response.json(toReportTask(updated), { status: 201 });
  } catch (error) {
    return toServiceErrorResponse(error, 'Report execution failed');
  }
}

export async function attachRelatedEvents(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  try {
    const body = await parseJsonBody(req, attachRelatedEventsBodySchema);
    const payload = await attachRelatedEventsToReport(request.params.id, body);
    return Response.json(payload);
  } catch (error) {
    return toServiceErrorResponse(error, 'Failed to attach related events');
  }
}

export async function generateUserJourney(req: Request) {
  const request = req as RequestWithParams<{ id: string; rawId: string }>;
  try {
    const payload = await generateUserJourneyForReportRaw(request.params.id, request.params.rawId);
    return Response.json(payload);
  } catch (error) {
    return toServiceErrorResponse(error, 'Failed to generate user journey');
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

    const current = await reports.findById(request.params.id);
    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const nextProgress =
      typeof body.progress === 'number' && Number.isFinite(body.progress)
        ? Math.max(0, Math.min(100, Math.round(body.progress)))
        : status === 'Completed'
          ? 100
          : current.progress;

    const updated = await reports.update(request.params.id, {
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

    return Response.json(toReportTask(updated));
  } catch (error) {
    return toServiceErrorResponse(error, 'Failed to update report status');
  }
}

export async function rerun(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  try {
    const updated = await rerunReportTask(request.params.id);
    return Response.json(toReportTask(updated));
  } catch (error) {
    return toServiceErrorResponse(error, 'Report rerun failed');
  }
}

export async function remove(req: Request) {
  const request = req as RequestWithParams<{ id: string }>;
  const current = await reports.findById(request.params.id);

  if (!current) {
    return Response.json({ error: 'Report task not found' }, { status: 404 });
  }

  await reports.delete(request.params.id);
  return new Response(null, { status: 204 });
}
