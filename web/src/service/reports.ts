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
  tasks: ReportTask[];
}

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
};
