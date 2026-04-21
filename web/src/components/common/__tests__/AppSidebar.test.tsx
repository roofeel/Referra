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
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(within(nav).getByText('Attributed').closest('a')).toHaveAttribute('href', '/reports');
    expect(within(nav).getByRole('link', { name: /Athena Tables/i })).toHaveAttribute('href', '/athena-tables');
    expect(within(nav).getByRole('link', { name: /MCP Document/i })).toHaveAttribute('href', '/documents/mcp');
    expect(screen.getByText('Guest User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeDisabled();
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
