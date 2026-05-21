import { buildApiUrl, throwApiError } from './http';

export type ManualAttributedJobStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed';

export interface ManualAttributedJob {
  jobId: string;
  name: string;
  status: ManualAttributedJobStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  database: string;
  workgroup: string;
  resultS3: string;
  sqlTemplate: string;
  renderedSql: string;
  queryExecutionId?: string;
  downloadUrl?: string;
  error?: string;
}

export interface CreateManualAttributedJobPayload {
  name?: string;
  sqlTemplate: string;
  database?: string;
  workgroup?: string;
  resultS3?: string;
}

export type UpdateManualAttributedJobPayload = Partial<CreateManualAttributedJobPayload>;

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

    if (response.status === 404) {
      return { tasks: [] };
    }

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

  updateAttributedJob: async (jobId: string, payload: UpdateManualAttributedJobPayload): Promise<ManualAttributedJob> => {
    const response = await fetch(buildApiUrl(`/api/manual-attribution/attributed/jobs/${jobId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to update manual attribution job');
    }

    return response.json();
  },

  deleteAttributedJob: async (jobId: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/manual-attribution/attributed/jobs/${jobId}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to delete manual attribution job');
    }
  },
};
