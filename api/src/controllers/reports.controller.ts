import { clients, urlRules } from '../../../packages/db/index.js';

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


let tasks: ReportTask[] = [];
let nextTaskNumber = 8822;

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

function formatCreatedAt(date: Date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${months[date.getMonth()]} ${pad(date.getDate())}, ${pad(hours12)}:${pad(minutes)} ${ampm}`;
}

function buildPayload(
  filteredTasks: ReportTask[],
  clientNames: string[],
  ruleNames: string[],
  urlParsingVersions: string[],
): ReportsPayload {
  return {
    metrics: {
      totalTasks: filteredTasks.length,
      activeAnalyses: filteredTasks.filter((task) => task.status === 'Running').length,
      successRateAvg: computeSuccessRateAvg(filteredTasks),
      dataPoints24h: '8.2M',
    },
    clients: clientNames,
    ruleNames,
    urlParsingVersions,
    tasks: filteredTasks,
  };
}

function nextTaskId() {
  const id = `KTX-${nextTaskNumber}`;
  nextTaskNumber += 1;
  return id;
}

function progressLabelFor(status: ReportTaskStatus, progress: number) {
  if (status === 'Completed') return '100% Success';
  if (status === 'Running') return `${progress}% Processed`;
  if (status === 'Paused') return `${progress}% Complete`;
  return progress <= 0 ? 'Failed' : `Error after ${progress}%`;
}

export const reportsController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get('status'));
    const client = url.searchParams.get('client')?.trim();
    const search = url.searchParams.get('search')?.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (status && task.status !== status) return false;
      if (client && task.client !== client) return false;
      if (
        search &&
        !task.taskName.toLowerCase().includes(search) &&
        !task.id.toLowerCase().includes(search) &&
        !task.client.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    let clientNames: string[] = [];
    let ruleNames: string[] = [];
    let urlParsingVersions: string[] = [];
    try {
      const [clientRows, rules] = await Promise.all([clients.list(), urlRules.list()]);
      clientNames = clientRows
        .map((item) => item.name?.trim())
        .filter((value): value is string => Boolean(value));

      // Backfill client names from URL rules and in-memory tasks in case client table is not fully populated.
      const ruleClientNames = rules
        .map((rule) => rule.client?.name?.trim())
        .filter((value): value is string => Boolean(value));
      const taskClientNames = tasks.map((task) => task.client?.trim()).filter((value): value is string => Boolean(value));
      clientNames = Array.from(new Set([...clientNames, ...ruleClientNames, ...taskClientNames])).sort((a, b) =>
        a.localeCompare(b),
      );
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load reports metadata from database: ${message}`);
      clientNames = Array.from(new Set(tasks.map((task) => task.client))).sort((a, b) => a.localeCompare(b));
    }

    return Response.json(buildPayload(filtered, clientNames, ruleNames, urlParsingVersions));
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
      ruleName?: string;
      urlParsingVersion?: string;
    };

    const taskName = body.taskName?.trim();
    const client = body.client?.trim();

    if (!taskName) {
      return Response.json({ error: 'taskName is required' }, { status: 400 });
    }

    if (!client) {
      return Response.json({ error: 'client is required' }, { status: 400 });
    }

    if (!body.fileName?.trim()) {
      return Response.json({ error: 'fileName is required' }, { status: 400 });
    }

    if (body.attributionLogic && !['registration', 'pageload'].includes(body.attributionLogic)) {
      return Response.json({ error: 'attributionLogic is invalid' }, { status: 400 });
    }

    const created: ReportTask = {
      id: nextTaskId(),
      taskName,
      client,
      source: body.source?.trim() || 'CSV Import',
      sourceIcon: body.sourceIcon?.trim() || 'description',
      status: 'Running',
      progress: 0,
      progressLabel: '0% Processed',
      attribution: '--',
      createdAt: formatCreatedAt(new Date()),
    };

    tasks = [created, ...tasks];
    return Response.json(created, { status: 201 });
  },

  async updateStatus(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const body = (await req.json()) as { status?: string; progress?: number };
    const status = normalizeStatus(body.status);

    if (!status) {
      return Response.json({ error: 'status is invalid' }, { status: 400 });
    }

    const index = tasks.findIndex((task) => task.id === request.params.id);
    if (index < 0) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    const current = tasks[index];
    if (!current) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }
    const nextProgress =
      typeof body.progress === 'number' && Number.isFinite(body.progress)
        ? Math.max(0, Math.min(100, Math.round(body.progress)))
        : status === 'Completed'
          ? 100
          : current.progress;

    const updated: ReportTask = {
      ...current,
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
    };

    tasks[index] = updated;
    return Response.json(updated);
  },

  async delete(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const index = tasks.findIndex((task) => task.id === request.params.id);

    if (index < 0) {
      return Response.json({ error: 'Report task not found' }, { status: 404 });
    }

    tasks.splice(index, 1);
    return new Response(null, { status: 204 });
  },
};
