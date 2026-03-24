import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('renders dashboard shell and key analytics modules', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Dashboard Navigation' })).toBeInTheDocument();
    expect(screen.getByText('Framework')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Client Logic')).toBeInTheDocument();
    expect(screen.getByText('URL Classification & Performance')).toBeInTheDocument();
    expect(screen.getByText('AI Extraction Insights')).toBeInTheDocument();
    expect(screen.getByText('New Analysis Task')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Event Detail' })).not.toBeInTheDocument();
  });

  it('opens and closes the event detail drawer from a table row', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByText('ev_9x128a')[0]);

    expect(screen.getByRole('dialog', { name: 'Event Detail' })).toBeInTheDocument();
    expect(screen.getByText('r_auth_772')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close Event Detail' }));

    expect(screen.queryByRole('dialog', { name: 'Event Detail' })).not.toBeInTheDocument();
  });
});
