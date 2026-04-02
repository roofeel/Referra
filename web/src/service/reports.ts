import { buildApiUrl, throwApiError } from './http';
import type {
  DashboardInsightsPayload,
  DistributionItem,
  EventDetail,
  Metric,
  ReferrerTypeStat,
  TableRow,
} from '../components/dashboard/dashboardData';
import type { ReportType } from '../components/reports/attributionConfig';

export type ReportTaskStatus = 'Running' | 'Completed' | 'Failed' | 'Paused';

export interface ReportTask {
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
}

export interface ReportLog {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

export interface ReportsResponse {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  rules: Array<{ id: string; name: string }>;
  urlParsingVersions: string[];
  tasks: ReportTask[];
}

export interface ReportDetailResponse {
  clientName: string;
  reportType: ReportType;
  referrerTypeStats: ReferrerTypeStat[];
  metrics: Metric[];
  distribution: DistributionItem[];
  insights: DashboardInsightsPayload;
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
  };
  rows: TableRow[];
  eventDetails: Record<string, EventDetail>;
}

export type CreateReportTaskPayload = {
  taskName: string;
  client: string;
  source?: string;
  sourceIcon?: string;
  reportType?: ReportType;
  attributionLogic: {
    source_url: string;
    source_time: string;
    event_url: string;
    event_time: string;
  };
  fieldMappings: Record<string, string>;
  fileName: string;
  fileContent: string;
  ruleId: string;
  attributedReportId?: string;
  uidParamName?: string;
};

export const reportsApi = {
  list: async (options?: {
    status?: string;
    client?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportsResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.client) params.set('client', options.client);
    if (options?.search) params.set('search', options.search);
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);

    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/reports${query ? `?${query}` : ''}`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch reports');
    }

    return response.json();
  },

  create: async (payload: CreateReportTaskPayload): Promise<ReportTask> => {
    const response = await fetch(buildApiUrl('/api/reports'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to create report task');
    }

    return response.json();
  },

  updateStatus: async (id: string, status: ReportTaskStatus, progress?: number): Promise<ReportTask> => {
    const response = await fetch(buildApiUrl(`/api/reports/${id}/status`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, progress }),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to update report task status');
    }

    return response.json();
  },

  rerun: async (id: string): Promise<ReportTask> => {
    const response = await fetch(buildApiUrl(`/api/reports/${id}/rerun`), {
      method: 'POST',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to rerun report task');
    }

    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/reports/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to delete report task');
    }
  },

  listLogs: async (id: string): Promise<ReportLog[]> => {
    const response = await fetch(buildApiUrl(`/api/reports/${id}/logs`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch report logs');
    }

    return response.json();
  },

  detail: async (
    id: string,
    options?: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      cohortMode?: 'non-cohort' | 'cohort';
      windowHours?: number;
    },
  ): Promise<ReportDetailResponse> => {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);
    if (options?.cohortMode) params.set('cohortMode', options.cohortMode);
    if (options?.windowHours) params.set('windowHours', String(options.windowHours));
    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/reports/${id}/detail${query ? `?${query}` : ''}`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch report detail');
    }

    return response.json();
  },
};
