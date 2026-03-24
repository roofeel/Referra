import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import UrlCreateRule from '../UrlCreateRule';

const { mockListClients, mockCreate, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockListClients: vi.fn(),
  mockCreate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    urlRules: {
      listClients: mockListClients,
      create: mockCreate,
    },
  },
}));

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'RoFeel', email: 'roofeel@example.com', avatar: null },
    isAuthenticated: true,
    loginWithGoogleCredential: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('UrlCreateRule', () => {
  beforeEach(() => {
    mockListClients.mockResolvedValue([
      { id: 'client-1', name: 'Chime' },
      { id: 'client-2', name: 'Novig' },
    ]);
    mockCreate.mockResolvedValue({
      id: 'rule-1',
    });
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('renders create rule workspace with identity form and logic editor', async () => {
    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'URL Rules Navigation' });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');

    expect(screen.getByText('Edit URL Rule')).toBeInTheDocument();
    expect(screen.getByText('Rule Identity')).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Logic Code')).toBeInTheDocument();
    expect(screen.getByText('categorizeFunnel.js')).toBeInTheDocument();
    expect(screen.getByText('Format Code')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Chime' })).toBeInTheDocument();

    const cancelLink = screen.getByRole('link', { name: 'Cancel' });
    expect(cancelLink).toHaveAttribute('href', '/url-rules');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('adds and selects a new client from add button', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('Tesla');

    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );

    await screen.findByRole('option', { name: 'Chime' });
    const select = screen.getByLabelText('Client');
    expect(select).toHaveValue('id:client-1');

    await user.click(screen.getByRole('button', { name: '+ Add new client' }));

    expect(promptSpy).toHaveBeenCalledWith('请输入新的 Client 名称');
    expect(await screen.findByRole('option', { name: 'Tesla' })).toBeInTheDocument();
    await waitFor(() => expect(select).toHaveValue('new:Tesla'));
    promptSpy.mockRestore();
  });

  it('allows editing rule logic code', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );
    await screen.findByRole('option', { name: 'Chime' });

    const editor = screen.getByLabelText('Rule Logic Code') as HTMLTextAreaElement;
    expect(editor.value).toContain('async function categorizeFunnel');

    await user.clear(editor);
    await user.click(editor);
    await user.paste('return { segment: "custom" };');

    expect(editor).toHaveValue('return { segment: "custom" };');
  });

  it('saves rule via API when clicking Save', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );
    await screen.findByRole('option', { name: 'Chime' });

    await user.type(screen.getByLabelText('Rule Name'), 'Checkout Rule');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        ruleName: 'Checkout Rule',
        status: 'draft',
        updatedBy: 'RoFeel',
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Rule created');
  });
});
