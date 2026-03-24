import { buildApiUrl, throwApiError } from './http';

export interface UrlRule {
  id: string;
  name: string;
  shortName: string;
  status: string;
  logicSource: string;
  activeVersion: string;
  updatedBy: string | null;
  environmentVariables: unknown;
  createdAt: string;
  updatedAt: string;
}

export const urlRulesApi = {
  list: async (options?: { status?: string; search?: string }): Promise<UrlRule[]> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.search) params.set('search', options.search);

    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/url-rules${query ? `?${query}` : ''}`));
    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch URL rules');
    }
    return response.json();
  },

  getById: async (id: string): Promise<UrlRule> => {
    const response = await fetch(buildApiUrl(`/api/url-rules/${id}`));
    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch URL rule');
    }
    return response.json();
  },

  create: async (data: {
    name: string;
    shortName: string;
    status?: string;
    logicSource?: string;
    activeVersion?: string;
    updatedBy?: string;
    environmentVariables?: unknown;
  }): Promise<UrlRule> => {
    const response = await fetch(buildApiUrl('/api/url-rules'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to create URL rule');
    }

    return response.json();
  },

  update: async (
    id: string,
    data: {
      name?: string;
      shortName?: string;
      status?: string;
      logicSource?: string;
      activeVersion?: string;
      updatedBy?: string;
      environmentVariables?: unknown;
    },
  ): Promise<UrlRule> => {
    const response = await fetch(buildApiUrl(`/api/url-rules/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to update URL rule');
    }

    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/url-rules/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to delete URL rule');
    }
  },
};
