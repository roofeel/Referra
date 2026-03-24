import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clients, reports, urlRules } from '../../../packages/db/index.js';

type ReportTaskStatus = 'Running' | 'Completed' | 'Failed' | 'Paused';

type ReportTask = {
  id: string;
  taskName: string;
  client: string;
  source: string;
  sourceIcon: string;
  status: ReportTaskStatus;
  progress: number;
  progressLabel: string;
  attribution: string;
  createdAt: string;
};

type AttributionLogic = 'registration' | 'pageload';

type ReportsPayload = {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  ruleNames: string[];
  urlParsingVersions: string[];
  tasks: ReportTask[];
};

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

type ReportRecord = Awaited<ReturnType<typeof reports.findById>>;

function normalizeStatus(raw?: string | null): ReportTaskStatus | undefined {
  const status = raw?.trim().toLowerCase();
  if (!status) return undefined;

  if (status === 'running') return 'Running';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'paused') return 'Paused';
  return undefined;
}

function computeSuccessRateAvg(list: ReportTask[]) {
  const values = list
    .map((task) => Number.parseFloat(task.attribution.replace('%', '')))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return 0;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function formatCreatedAt(dateInput: Date | string) {
  const date = new Date(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${months[date.getMonth()]} ${pad(date.getDate())}, ${pad(hours12)}:${pad(minutes)} ${ampm}`;
}

function formatCompactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\s+/g, '_');
  const safe = normalized.replace(/[^a-zA-Z0-9._-]/g, '');
  return safe || `upload_${Date.now()}.csv`;
}

function getStorageRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  const controllerDir = path.dirname(currentFile);
  return path.resolve(controllerDir, '../../storage/reports');
}

async function saveUploadedFile(fileName: string, fileContent: string) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());

  const safeName = sanitizeFileName(fileName);
  const uniqueName = `${Date.now()}_${safeName}`;
  const relativeDir = path.join(yyyy, mm, dd);
  const absoluteDir = path.join(getStorageRoot(), relativeDir);

  await mkdir(absoluteDir, { recursive: true });

  const absolutePath = path.join(absoluteDir, uniqueName);
  await writeFile(absolutePath, fileContent, 'utf-8');

  return {
    relativePath: path.join(relativeDir, uniqueName),
    absolutePath,
    size: Buffer.byteLength(fileContent, 'utf-8'),
  };
}

function progressLabelFor(status: ReportTaskStatus, progress: number) {
  if (status === 'Completed') return '100% Success';
  if (status === 'Running') return `${progress}% Processed`;
  if (status === 'Paused') return `${progress}% Complete`;
  return progress <= 0 ? 'Failed' : `Error after ${progress}%`;
}

function toReportTask(item: NonNullable<ReportRecord>): ReportTask {
  return {
    id: item.id,
    taskName: item.taskName,
    client: item.client?.name || 'Unknown Client',
    source: item.source,
    sourceIcon: item.sourceIcon,
    status: (normalizeStatus(item.status) || 'Running') as ReportTaskStatus,
    progress: item.progress,
    progressLabel: item.progressLabel,
    attribution: item.attribution,
    createdAt: formatCreatedAt(item.createdAt),
  };
}

function buildPayload(
  filteredTasks: ReportTask[],
  clientNames: string[],
  ruleNames: string[],
  urlParsingVersions: string[],
  dataPoints24h: string,
): ReportsPayload {
  return {
    metrics: {
      totalTasks: filteredTasks.length,
      activeAnalyses: filteredTasks.filter((task) => task.status === 'Running').length,
      successRateAvg: computeSuccessRateAvg(filteredTasks),
      dataPoints24h,
    },
    clients: clientNames,
    ruleNames,
    urlParsingVersions,
    tasks: filteredTasks,
  };
}

export const reportsController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get('status'));
    const client = url.searchParams.get('client')?.trim();
    const search = url.searchParams.get('search')?.trim();

    let taskRows: any[] = [];
    let clientNames: string[] = [];
    let ruleNames: string[] = [];
    let urlParsingVersions: string[] = [];
    let dataPoints24h = '0';

    try {
      const [reportRows, clientRows, rules, updated24hRows] = await Promise.all([
        reports.list({
          status,
          client: client || undefined,
          search: search || undefined,
        }),
        clients.list(),
        urlRules.list(),
        reports.listUpdatedAfter(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ]);

      taskRows = reportRows;
      clientNames = Array.from(
        new Set([
          ...clientRows.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value)),
          ...reportRows.map((item: any) => item.client?.name?.trim()).filter((value: any): value is string => Boolean(value)),
          ...rules.map((rule) => rule.client?.name?.trim()).filter((value): value is string => Boolean(value)),
        ]),
      ).sort((a, b) => a.localeCompare(b));

      ruleNames = Array.from(
        new Set(
          rules
            .map((rule) => rule.name?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b));

      urlParsingVersions = Array.from(
        new Set(
          rules
            .map((rule) => rule.activeVersion?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b));

      dataPoints24h = formatCompactCount(updated24hRows.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load reports metadata from database: ${message}`);
    }

    const tasks = taskRows.map((row) => toReportTask(row));
    return Response.json(buildPayload(tasks, clientNames, ruleNames, urlParsingVersions, dataPoints24h));
  },

  async create(req: Request) {
    const body = (await req.json()) as {
      taskName?: string;
      client?: string;
      source?: string;
      sourceIcon?: string;
      attributionLogic?: AttributionLogic;
      fieldMappings?: Record<string, string>;
      fileName?: string;
      fileContent?: string;
      ruleName?: string;
    };

    const taskName = body.taskName?.trim();
    const clientName = body.client?.trim();
    const ruleName = body.ruleName?.trim();

    if (!taskName) {
      return Response.json({ error: 'taskName is required' }, { status: 400 });
    }

    if (!clientName) {
      return Response.json({ error: 'client is required' }, { status: 400 });
    }

    if (!ruleName) {
      return Response.json({ error: 'ruleName is required' }, { status: 400 });
    }

    if (!body.fileName?.trim()) {
      return Response.json({ error: 'fileName is required' }, { status: 400 });
    }

    if (!body.fileContent || typeof body.fileContent !== 'string') {
      return Response.json({ error: 'fileContent is required' }, { status: 400 });
    }

    if (!body.fieldMappings || Object.keys(body.fieldMappings).length === 0) {
      return Response.json({ error: 'fieldMappings is required' }, { status: 400 });
    }

    if (!body.attributionLogic || !['registration', 'pageload'].includes(body.attributionLogic)) {
      return Response.json({ error: 'attributionLogic is invalid' }, { status: 400 });
    }

    const existingClient = await clients.getOrCreateByName(clientName);
    const fileSaved = await saveUploadedFile(body.fileName, body.fileContent);

    const created = await reports.create({
      clientId: existingClient?.id,
      taskName,
      ruleName,
      source: body.source?.trim() || 'CSV Import',
      sourceIcon: body.sourceIcon?.trim() || 'description',
      status: 'Running',
      progress: 0,
      progressLabel: '0% Processed',
      attribution: '--',
      attributionLogic: body.attributionLogic,
      fieldMappings: body.fieldMappings,
      uploadedFileName: body.fileName,
      uploadedFilePath: fileSaved.relativePath,
      uploadedFileSize: fileSaved.size,
    });

    return Response.json(toReportTask(created), { status: 201 });
  },

  async updateStatus(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const body = (await req.json()) as { status?: string; progress?: number };
    const status = normalizeStatus(body.status);

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
  },

  async delete(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const current = await reports.findById(request.params.id);

    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    await reports.delete(request.params.id);

    if (current.uploadedFilePath) {
      const filePath = path.join(getStorageRoot(), current.uploadedFilePath);
      try {
        await unlink(filePath);
      } catch {
        // Ignore file cleanup failures after DB delete.
      }
    }

    return new Response(null, { status: 204 });
  },
};
