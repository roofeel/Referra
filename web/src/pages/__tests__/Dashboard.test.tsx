import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('renders the delivery overview dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Delivery Overview' })).toBeInTheDocument();
    expect(screen.getByText('IPM by hour')).toBeInTheDocument();
    expect(screen.getByText('Win rate by hour')).toBeInTheDocument();
    expect(screen.getByText('Top DMA by IPM')).toBeInTheDocument();
    expect(screen.getByText('Top creatives by IPM')).toBeInTheDocument();
  });
});
