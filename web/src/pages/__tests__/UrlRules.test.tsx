import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import UrlRules from '../UrlRules';

describe('UrlRules', () => {
  it('renders the URL rules interface with table and sandbox', () => {
    render(
      <MemoryRouter>
        <UrlRules />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'URL Rules Navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Referrer AI')).toBeInTheDocument();
    expect(screen.getByText('Feedmob')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(screen.getByText('Register Client')).toBeInTheDocument();
    expect(screen.getAllByText('AstraZeneca Global')).toHaveLength(2);
    expect(screen.getByText('Node.js Sandbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execute async/i })).toBeInTheDocument();
    expect(screen.getByText('Logic Executions (24h)')).toBeInTheDocument();
  });
});
