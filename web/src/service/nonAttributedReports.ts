import { buildApiUrl, throwApiError } from './http';
import type { CreateReportTaskPayload, ReportLog, ReportTask, ReportTaskStatus } from './reports';

export interface NonAttributedReportsResponse {
  metrics: {
    totalTasks: number;
    activeAnalyses: number;
    successRateAvg: number;
    dataPoints24h: string;
  };
  clients: string[];
  rules: Array<{ id: string; name: string }>;
  attributedReports: Array<{ id: string; taskName: string; clientName: string }>;
  urlParsingVersions: string[];
  tasks: Array<
    ReportTask & {
      attributedReportId: string;
      attributedReportTaskName: string;
      uidParamName: string;
    }
  >;
}

export const nonAttributedReportsApi = {
  list: async (options?: {
    status?: string;
    client?: string;
    search?: string;
  }): Promise<NonAttributedReportsResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.client) params.set('client', options.client);
    if (options?.search) params.set('search', options.search);

    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/non-attributed-reports${query ? `?${query}` : ''}`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch non-attributed reports');
    }

    return response.json();
  },

  create: async (payload: CreateReportTaskPayload): Promise<ReportTask> => {
    const response = await fetch(buildApiUrl('/api/non-attributed-reports'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to create non-attributed report task');
    }

    return response.json();
  },

  updateStatus: async (id: string, status: ReportTaskStatus, progress?: number): Promise<ReportTask> => {
    const response = await fetch(buildApiUrl(`/api/non-attributed-reports/${id}/status`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, progress }),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to update non-attributed report task status');
    }

    return response.json();
  },

  rerun: async (id: string): Promise<ReportTask> => {
    const response = await fetch(buildApiUrl(`/api/non-attributed-reports/${id}/rerun`), {
      method: 'POST',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to rerun non-attributed report task');
    }

    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/non-attributed-reports/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to delete non-attributed report task');
    }
  },

  listLogs: async (id: string): Promise<ReportLog[]> => {
    const response = await fetch(buildApiUrl(`/api/non-attributed-reports/${id}/logs`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch non-attributed report logs');
    }

    return response.json();
  },
};
