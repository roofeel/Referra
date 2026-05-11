import { buildApiUrl, throwApiError } from './http';

export type ManualAttributedJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ManualAttributedJob {
  jobId: string;
  status: ManualAttributedJobStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  database: string;
  workgroup: string;
  resultS3: string;
  renderedSql: string;
  queryExecutionId?: string;
  downloadUrl?: string;
  error?: string;
}

export interface CreateManualAttributedJobPayload {
  sqlTemplate: string;
  startDate: string;
  endDate: string;
  database?: string;
  workgroup?: string;
  resultS3?: string;
}

export const manualAttributionApi = {
  listAttributedJobs: async (options?: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ tasks: ManualAttributedJob[] }> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.search) params.set('search', options.search);
    if (options?.startDate) params.set('startDate', options.startDate);
    if (options?.endDate) params.set('endDate', options.endDate);
    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/manual-attribution/attributed/jobs${query ? `?${query}` : ''}`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to list manual attribution jobs');
    }

    return response.json();
  },

  createAttributedJob: async (payload: CreateManualAttributedJobPayload): Promise<ManualAttributedJob> => {
    const response = await fetch(buildApiUrl('/api/manual-attribution/attributed/jobs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to create manual attribution job');
    }

    return response.json();
  },

  getAttributedJob: async (jobId: string): Promise<ManualAttributedJob> => {
    const response = await fetch(buildApiUrl(`/api/manual-attribution/attributed/jobs/${jobId}`));

    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch manual attribution job');
    }

    return response.json();
  },
};
