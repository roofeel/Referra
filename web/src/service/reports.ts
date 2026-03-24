import { buildApiUrl, throwApiError } from './http';

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

export interface ReportsResponse {
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
}

export type CreateReportTaskPayload = {
  taskName: string;
  client: string;
  source?: string;
  sourceIcon?: string;
  attributionLogic: 'registration' | 'pageload';
  fieldMappings: Record<string, string>;
  fileName: string;
  ruleName: string;
};

export const reportsApi = {
  list: async (options?: {
    status?: string;
    client?: string;
    search?: string;
  }): Promise<ReportsResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.client) params.set('client', options.client);
    if (options?.search) params.set('search', options.search);

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

  delete: async (id: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/reports/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to delete report task');
    }
  },
};
