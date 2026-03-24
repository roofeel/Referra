import { buildApiUrl, throwApiError } from './http';
import type { User } from './types';

type LoginResponse = {
  user: User;
  isNewUser: boolean;
  joinedGroupIds: string[];
};

export const usersApi = {
  login: async (data: { email: string; name?: string; avatar?: string }): Promise<LoginResponse> => {
    const response = await fetch(buildApiUrl('/api/users/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to login');
    return response.json();
  },

  loginWithGoogle: async (data: { credential: string }): Promise<LoginResponse> => {
    const response = await fetch(buildApiUrl('/api/users/google-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      await throwApiError(response, 'Failed to login with Google');
    }
    return response.json();
  },

  getById: async (id: string): Promise<User> => {
    const response = await fetch(buildApiUrl(`/api/users/${id}`));
    if (!response.ok) {
      await throwApiError(response, 'Failed to fetch user');
    }
    return response.json();
  },
};
