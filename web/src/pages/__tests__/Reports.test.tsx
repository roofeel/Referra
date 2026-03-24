import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Reports from '../Reports';

describe('Reports', () => {
  it('renders reports shell and table data from design', () => {
    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Reports Navigation' });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/reports');

    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Q4 E-commerce Attribution')).toBeInTheDocument();
    expect(screen.getByText('AdWords Spend Audit')).toBeInTheDocument();
    expect(screen.getByText('Weekly Logistics Sync')).toBeInTheDocument();
    expect(screen.getByText('Holiday Campaign Initial Scan')).toBeInTheDocument();
  });
});
