import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppSidebar } from '../AppSidebar';

describe('AppSidebar', () => {
  it('renders branding and sidebar links', () => {
    render(
      <MemoryRouter>
        <AppSidebar activeItem="dashboard" ariaLabel="Main Navigation" />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Main Navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Referrer AI')).toBeInTheDocument();
    expect(screen.getByText('Feedmob')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(within(nav).getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/reports');
  });

  it('marks the active item with active styling', () => {
    render(
      <MemoryRouter>
        <AppSidebar activeItem="url-rules" ariaLabel="Main Navigation" />
      </MemoryRouter>,
    );

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const clientLogicLink = screen.getByRole('link', { name: /Url Rules/i });

    expect(clientLogicLink).toHaveClass('border-r-2');
    expect(dashboardLink).not.toHaveClass('border-r-2');
  });
});
