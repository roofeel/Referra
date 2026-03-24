import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const { mockUsersGetById, mockUsersLoginWithGoogle } = vi.hoisted(() => ({
  mockUsersGetById: vi.fn(),
  mockUsersLoginWithGoogle: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    users: {
      getById: mockUsersGetById,
      loginWithGoogle: mockUsersLoginWithGoogle,
    },
  },
}));

function AuthHarness() {
  const { user, isAuthenticated, loginWithGoogleCredential, logout } = useAuth();
  return (
    <div>
      <div>auth:{isAuthenticated ? 'yes' : 'no'}</div>
      <div>user:{user?.id || 'none'}</div>
      <button onClick={() => void loginWithGoogleCredential('google-token')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUsersGetById.mockReset();
    mockUsersLoginWithGoogle.mockReset();
  });

  it('logs in and persists user to localStorage', async () => {
    mockUsersLoginWithGoogle.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        email: 'roofeel@example.com',
        name: 'roofeel',
        avatar: null,
      },
    });
    mockUsersGetById.mockResolvedValue({ id: 'user-1' });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => {
      expect(screen.getByText('auth:yes')).toBeInTheDocument();
      expect(screen.getByText('user:user-1')).toBeInTheDocument();
    });

    expect(mockUsersLoginWithGoogle).toHaveBeenCalledWith({ credential: 'google-token' });
    expect(localStorage.getItem('referrer_ai.auth.user')).toContain('user-1');
  });

  it('clears stored user when profile refresh fails', async () => {
    localStorage.setItem(
      'referrer_ai.auth.user',
      JSON.stringify({
        id: 'user-2',
        email: 'broken@example.com',
        name: 'Broken',
        avatar: null,
      }),
    );
    mockUsersGetById.mockRejectedValueOnce(new Error('not found'));

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('auth:no')).toBeInTheDocument();
      expect(screen.getByText('user:none')).toBeInTheDocument();
    });

    expect(localStorage.getItem('referrer_ai.auth.user')).toBeNull();
  });

  it('logout clears user state and storage', async () => {
    mockUsersLoginWithGoogle.mockResolvedValueOnce({
      user: {
        id: 'user-3',
        email: 'user3@example.com',
        name: 'User 3',
        avatar: null,
      },
    });
    mockUsersGetById.mockResolvedValue({ id: 'user-3' });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(screen.getByText('auth:yes')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByText('auth:no')).toBeInTheDocument();
    expect(screen.getByText('user:none')).toBeInTheDocument();
    expect(localStorage.getItem('referrer_ai.auth.user')).toBeNull();
  });
});
