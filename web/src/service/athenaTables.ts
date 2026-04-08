import { buildApiUrl, throwApiError } from './http';

export interface AthenaTable {
  id: string;
  tableType: string;
  tableNamePattern: string;
  ddl: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const athenaTablesApi = {
  list: async (options?: { search?: string; tableType?: string }): Promise<AthenaTable[]> => {
    const params = new URLSearchParams();
    if (options?.search) params.set('search', options.search);
    if (options?.tableType) params.set('tableType', options.tableType);

    const query = params.toString();
    const response = await fetch(buildApiUrl(`/api/athena-tables${query ? `?${query}` : ''}`));
    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch Athena tables');
    }

    return response.json();
  },

  create: async (data: {
    tableType: string;
    tableNamePattern: string;
    ddl: string;
    updatedBy?: string;
  }): Promise<AthenaTable> => {
    const response = await fetch(buildApiUrl('/api/athena-tables'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to create Athena table');
    }

    return response.json();
  },

  update: async (
    id: string,
    data: {
      tableType?: string;
      tableNamePattern?: string;
      ddl?: string;
      updatedBy?: string;
    },
  ): Promise<AthenaTable> => {
    const response = await fetch(buildApiUrl(`/api/athena-tables/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to update Athena table');
    }

    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/athena-tables/${id}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      await throwApiError(response, 'Failed to delete Athena table');
    }
  },
};
