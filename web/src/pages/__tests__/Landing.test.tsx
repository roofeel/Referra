import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockToastError = vi.fn();

const initializeMock = vi.fn();
const renderButtonMock = vi.fn();

vi.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }: { children: ReactNode }) => <>{children}</>,
  useNavigate: () => mockNavigate,
  Navigate: ({ to }: { to: string }) => {
    mockNavigate(to, { replace: true });
    return null;
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: mockToastError,
  }),
}));

describe('Landing', () => {
  beforeEach(() => {
    const env = import.meta.env as ImportMetaEnv & { VITE_GOOGLE_CLIENT_ID?: string };
    env.VITE_GOOGLE_CLIENT_ID = 'google-client-id';
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockToastError.mockReset();
    initializeMock.mockReset();
    renderButtonMock.mockReset();

    window.google = {
      accounts: {
        id: {
          initialize: initializeMock,
          renderButton: renderButtonMock,
        },
      },
    };

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loginWithGoogleCredential: vi.fn(),
    });
  });

  it('renders landing content when user is not authenticated', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Referrer AI')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: /master the architecture of data attribution/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /the precision engine/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in with google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Get Started' })).not.toBeInTheDocument();
    expect(initializeMock).toHaveBeenCalledOnce();
    expect(renderButtonMock).toHaveBeenCalledOnce();
    expect(screen.getByTestId('google-signin-button')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects authenticated user to dashboard', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loginWithGoogleCredential: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('passes google credential to auth context', async () => {
    const loginWithGoogleCredential = vi.fn().mockResolvedValue(undefined);
    let googleCallback: ((response: { credential?: string }) => void) | undefined;

    initializeMock.mockImplementation((options: { callback: (response: { credential?: string }) => void }) => {
      googleCallback = options.callback;
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loginWithGoogleCredential,
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    await act(async () => {
      googleCallback?.({ credential: 'google-jwt' });
    });

    await waitFor(() => expect(loginWithGoogleCredential).toHaveBeenCalledWith('google-jwt'));
  });
});
