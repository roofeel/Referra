import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user_1',
      email: 'roofeel@example.com',
      name: 'roofeel',
      avatar: null,
    },
    logout: vi.fn(),
  }),
}));

describe('Dashboard', () => {
  it('renders dashboard shell and key analytics modules', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Attribution Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('URL Classification & Performance')).toBeInTheDocument();
    expect(screen.getByText('AI Extraction Insights')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Data' })).toBeInTheDocument();
    expect(screen.getByText('Event Detail')).toBeInTheDocument();
    expect(screen.getByText('New Analysis Task')).toBeInTheDocument();
  });
});
