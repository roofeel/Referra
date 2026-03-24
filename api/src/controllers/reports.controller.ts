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

type ReportsPayload = {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  tasks: ReportTask[];
};

const allTasks: ReportTask[] = [
  {
    id: 'KTX-8821',
    taskName: 'Q4 E-commerce Attribution',
    client: 'Global Retail Corp',
    source: 'Pixel API',
    sourceIcon: 'api',
    status: 'Running',
    progress: 65,
    progressLabel: '65% Processed',
    attribution: '84.2%',
    createdAt: 'Oct 24, 09:12 AM',
  },
  {
    id: 'KTX-8815',
    taskName: 'AdWords Spend Audit',
    client: 'Vertex Finance',
    source: 'CSV Import',
    sourceIcon: 'description',
    status: 'Completed',
    progress: 100,
    progressLabel: '100% Success',
    attribution: '99.1%',
    createdAt: 'Oct 23, 02:45 PM',
  },
  {
    id: 'KTX-8802',
    taskName: 'Weekly Logistics Sync',
    client: 'Nexus Logistics',
    source: 'PostgreSQL',
    sourceIcon: 'database',
    status: 'Failed',
    progress: 12,
    progressLabel: 'Error: Connection Timeout',
    attribution: '--',
    createdAt: 'Oct 22, 11:30 PM',
  },
  {
    id: 'KTX-8798',
    taskName: 'Holiday Campaign Initial Scan',
    client: 'Global Retail Corp',
    source: 'Facebook Ads',
    sourceIcon: 'ads_click',
    status: 'Paused',
    progress: 45,
    progressLabel: '45% Complete',
    attribution: '--',
    createdAt: 'Oct 21, 04:00 PM',
  },
  {
    id: 'KTX-8792',
    taskName: 'CRM Matchback QA',
    client: 'Vertex Finance',
    source: 'SFTP Batch',
    sourceIcon: 'upload_file',
    status: 'Completed',
    progress: 100,
    progressLabel: '100% Success',
    attribution: '97.4%',
    createdAt: 'Oct 20, 08:15 AM',
  },
  {
    id: 'KTX-8785',
    taskName: 'Marketplace Source Integrity',
    client: 'Nexus Logistics',
    source: 'BigQuery',
    sourceIcon: 'database',
    status: 'Running',
    progress: 36,
    progressLabel: '36% Processed',
    attribution: '78.9%',
    createdAt: 'Oct 19, 10:05 AM',
  },
];

function normalizeStatus(raw?: string | null): ReportTaskStatus | undefined {
  const status = raw?.trim().toLowerCase();
  if (!status) return undefined;

  if (status === 'running') return 'Running';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'paused') return 'Paused';
  return undefined;
}

function computeSuccessRateAvg(tasks: ReportTask[]) {
  const values = tasks
    .map((task) => Number.parseFloat(task.attribution.replace('%', '')))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return 0;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

function buildPayload(tasks: ReportTask[]): ReportsPayload {
  return {
    metrics: {
      totalTasks: tasks.length,
      activeAnalyses: tasks.filter((task) => task.status === 'Running').length,
      successRateAvg: computeSuccessRateAvg(tasks),
      dataPoints24h: '8.2M',
    },
    clients: Array.from(new Set(allTasks.map((task) => task.client))),
    tasks,
  };
}

export const reportsController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get('status'));
    const client = url.searchParams.get('client')?.trim();
    const search = url.searchParams.get('search')?.trim().toLowerCase();

    const filtered = allTasks.filter((task) => {
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

    return Response.json(buildPayload(filtered));
  },
};
