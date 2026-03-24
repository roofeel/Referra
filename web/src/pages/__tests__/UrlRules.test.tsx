import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UrlRules from '../UrlRules';

const { mockUrlRulesList, mockUrlRulesDelete, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockUrlRulesList: vi.fn(),
  mockUrlRulesDelete: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    urlRules: {
      list: mockUrlRulesList,
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
    user: { id: 'user-1', name: 'RoFeel', email: 'roofeel@example.com', avatar: null },
    isAuthenticated: true,
    loginWithGoogleCredential: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('UrlRules', () => {
  it('renders URL rules and only shows sandbox after selecting test action', async () => {
    mockUrlRulesList.mockResolvedValueOnce([
      {
        id: 'rule-1',
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
    expect(screen.getByText('Referrer AI')).toBeInTheDocument();
    expect(screen.getByText('Feedmob')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(screen.getByRole('button', { name: 'Create Rule' })).toBeInTheDocument();
    expect(await screen.findByText('AstraZeneca Global')).toBeInTheDocument();
    expect(screen.queryByText('Active Version')).not.toBeInTheDocument();
    expect(screen.queryByText('Node.js Sandbox')).not.toBeInTheDocument();

    await user.click(screen.getByText('AstraZeneca Global'));
    expect(screen.getByText('Active Version')).toBeInTheDocument();
    expect(screen.getByText('v2.4.12-prod')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Test in Sandbox' }));
    expect(screen.getByText('Node.js Sandbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execute async/i })).toBeInTheDocument();
    expect(screen.getByText('Logic Executions (24h)')).toBeInTheDocument();
  });
});
