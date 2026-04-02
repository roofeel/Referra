import { buildApiUrl, throwApiError } from './http';
import type { CreateReportTaskPayload, ReportDetailResponse, ReportLog, ReportTask, ReportTaskStatus } from './reports';

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
    startDate?: string;
    endDate?: string;
  }): Promise<NonAttributedReportsResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.client) params.set('client', options.client);
    if (options?.search) params.set('search', options.search);
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);

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
    if (typeof options?.page === 'number' && Number.isFinite(options.page)) {
      params.set('page', String(Math.max(1, Math.floor(options.page))));
    }
    if (typeof options?.pageSize === 'number' && Number.isFinite(options.pageSize)) {
      params.set('pageSize', String(Math.max(1, Math.floor(options.pageSize))));
    }
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);
    if (options?.cohortMode) params.set('cohortMode', options.cohortMode);
    if (typeof options?.windowHours === 'number' && Number.isFinite(options.windowHours)) {
      params.set('windowHours', String(Math.floor(options.windowHours)));
    }

    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/non-attributed-reports/${id}/detail${query ? `?${query}` : ''}`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch non-attributed report detail');
    }

    return response.json();
  },
};
