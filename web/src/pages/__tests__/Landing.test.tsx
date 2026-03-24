import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockToastError = vi.fn();

const initializeMock = vi.fn();
const promptMock = vi.fn();

vi.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }: { children: ReactNode }) => <>{children}</>,
  useNavigate: () => mockNavigate,
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
    promptMock.mockReset();

    window.google = {
      accounts: {
        id: {
          initialize: initializeMock,
          prompt: promptMock,
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
    expect(screen.getAllByRole('button', { name: 'Get Started' })).toHaveLength(2);
    expect(initializeMock).toHaveBeenCalledOnce();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects authenticated user to groups page', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loginWithGoogleCredential: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('prompts google login when get started is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole('button', { name: 'Get Started' })[0]);

    expect(promptMock).toHaveBeenCalledOnce();
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

    googleCallback?.({ credential: 'google-jwt' });

    await waitFor(() => expect(loginWithGoogleCredential).toHaveBeenCalledWith('google-jwt'));
  });
});
