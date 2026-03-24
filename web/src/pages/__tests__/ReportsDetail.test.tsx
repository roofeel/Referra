import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ReportsDetail from '../ReportsDetail';

describe('ReportsDetail', () => {
  it('renders report detail shell and analytics modules', () => {
    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Reports Detail Navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Referrer AI')).toBeInTheDocument();
    expect(screen.getByText('Feedmob')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/reports');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(screen.getByText('Task #KTX-8821')).toBeInTheDocument();
    expect(screen.getByText('URL Classification & Performance')).toBeInTheDocument();
    expect(screen.getByText('AI Extraction Insights')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Event Detail' })).not.toBeInTheDocument();
  });

  it('opens and closes the event detail drawer from a table row', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getAllByText('ev_9x128a')[0]);

    expect(screen.getByRole('dialog', { name: 'Event Detail' })).toBeInTheDocument();
    expect(screen.getByText('r_auth_772')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close Event Detail' }));

    expect(screen.queryByRole('dialog', { name: 'Event Detail' })).not.toBeInTheDocument();
  });
});
