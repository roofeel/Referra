import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UrlRules from '../UrlRules';

const { mockUrlRulesList, mockUrlRulesUpdate, mockUrlRulesDelete, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockUrlRulesList: vi.fn(),
  mockUrlRulesUpdate: vi.fn(),
  mockUrlRulesDelete: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    urlRules: {
      list: mockUrlRulesList,
      update: mockUrlRulesUpdate,
      delete: mockUrlRulesDelete,
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
    user: { id: 'user-1', name: 'rf', email: 'rf@example.com', avatar: null },
    isAuthenticated: true,
    loginWithGoogleCredential: vi.fn(),
    logout: vi.fn(),
  }),
  useOptionalAuth: () => ({
    user: { id: 'user-1', name: 'rf', email: 'rf@example.com', avatar: null },
    isAuthenticated: true,
    loginWithGoogleCredential: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('UrlRules', () => {
  it('allows editing and saving url rule', async () => {
    const source = 'async function categorizeFunnel(ourl, rl, dl) { return {}; }';
    const updatedSource = 'async function categorizeFunnel(ourl, rl, dl) { return { segment: "updated" }; }';
    mockUrlRulesList.mockResolvedValueOnce([
      {
        id: 'rule-1',
        clientId: 'client-1',
        client: { id: 'client-1', name: 'AstraZeneca' },
        name: 'AstraZeneca Global',
        shortName: 'AZ',
        status: 'active',
        logicSource: source,
        activeVersion: 'v2.4.12-prod',
        updatedBy: 'Vane, A.',
        environmentVariables: null,
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z',
      },
    ]);
    mockUrlRulesUpdate.mockResolvedValueOnce({
      id: 'rule-1',
      clientId: 'client-1',
      client: { id: 'client-1', name: 'AstraZeneca' },
      name: 'AstraZeneca Updated',
      shortName: 'AZ',
      status: 'draft',
      logicSource: updatedSource,
      activeVersion: 'v2.4.12-prod',
      updatedBy: 'Vane, A.',
      environmentVariables: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T13:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <UrlRules />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByText('AstraZeneca Global'));
    await user.clear(screen.getByLabelText('Rule Name'));
    await user.type(screen.getByLabelText('Rule Name'), 'AstraZeneca Updated');
    fireEvent.change(screen.getByLabelText('Rule Logic Code'), { target: { value: updatedSource } });
    await user.selectOptions(screen.getByLabelText('Status'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mockUrlRulesUpdate).toHaveBeenCalledWith('rule-1', {
      name: 'AstraZeneca Updated',
      status: 'draft',
      logicSource: updatedSource,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Rule updated');
    expect((await screen.findAllByText('AstraZeneca Updated')).length).toBeGreaterThan(0);
  });

  it('renders URL rules and only shows sandbox after selecting test action', async () => {
    mockUrlRulesList.mockResolvedValueOnce([
      {
        id: 'rule-1',
        clientId: 'client-1',
        client: { id: 'client-1', name: 'AstraZeneca' },
        name: 'AstraZeneca Global',
        shortName: 'AZ',
        status: 'active',
        logicSource: 'async function categorizeFunnel(ourl, rl, dl) { return {}; }',
        activeVersion: 'v2.4.12-prod',
        updatedBy: 'Vane, A.',
        environmentVariables: null,
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <UrlRules />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    const nav = screen.getByRole('navigation', { name: 'URL Rules Navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Referra')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(screen.getByRole('button', { name: 'Create Rule' })).toBeInTheDocument();
    expect(await screen.findByText('AstraZeneca')).toBeInTheDocument();
    expect(await screen.findByText('AstraZeneca Global')).toBeInTheDocument();
    expect(screen.queryByText('Active Version')).not.toBeInTheDocument();
    expect(screen.queryByText('Node.js Sandbox')).not.toBeInTheDocument();

    await user.click(screen.getByText('AstraZeneca Global'));
    expect(screen.getByText('Active Version')).toBeInTheDocument();
    expect(screen.getByText('v2.4.12-prod')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Test in Sandbox' }));
    expect(screen.getByText('Node.js Sandbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execute async/i })).toBeInTheDocument();
  });
});
