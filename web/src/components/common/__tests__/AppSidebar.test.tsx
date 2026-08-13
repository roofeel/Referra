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
    expect(screen.getByText('Referra')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).queryByRole('link', { name: /Url Rules/i })).not.toBeInTheDocument();
    expect(within(nav).queryByText('Referrer Type Anlysis')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Manual Attribution')).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /MCP Document/i })).toHaveAttribute('href', '/documents/mcp');
    expect(within(nav).getAllByText('Beta')).toHaveLength(1);
    expect(screen.getByText('Guest User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeDisabled();
  });

  it('marks the active item with active styling', () => {
    render(
      <MemoryRouter>
        <AppSidebar activeItem="dashboard" ariaLabel="Main Navigation" />
      </MemoryRouter>,
    );

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveClass('border-r-2');
  });
});
