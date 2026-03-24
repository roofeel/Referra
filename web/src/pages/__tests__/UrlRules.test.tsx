import { render, screen } from '@testing-library/react';
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

    expect(screen.getByRole('navigation', { name: 'URL Rules Navigation' })).toBeInTheDocument();
    expect(screen.getByText('Framework')).toBeInTheDocument();
    expect(screen.getByText('Client Logic')).toBeInTheDocument();
    expect(screen.getByText('Register Client')).toBeInTheDocument();
    expect(screen.getAllByText('AstraZeneca Global')).toHaveLength(2);
    expect(screen.getByText('Node.js Sandbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execute async/i })).toBeInTheDocument();
    expect(screen.getByText('Client Logic Center')).toBeInTheDocument();
    expect(screen.getByText('Logic Executions (24h)')).toBeInTheDocument();
  });
});
