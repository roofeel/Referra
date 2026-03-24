import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('redirects /dashboard to /reports', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<div>Reports page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Reports page')).toBeInTheDocument();
  });
});
