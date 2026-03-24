import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Reports from '../Reports';

const { mockReportsList } = vi.hoisted(() => ({
  mockReportsList: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    reports: {
      list: mockReportsList,
    },
  },
}));

describe('Reports', () => {
  it('renders reports shell and data from API', async () => {
    mockReportsList.mockResolvedValueOnce({
      metrics: {
        totalTasks: 2,
        activeAnalyses: 1,
        successRateAvg: 91.7,
        dataPoints24h: '8.2M',
      },
      clients: ['Global Retail Corp', 'Vertex Finance'],
      tasks: [
        {
          id: 'KTX-8821',
          taskName: 'Q4 E-commerce Attribution',
          client: 'Global Retail Corp',
          source: 'Pixel API',
          sourceIcon: 'api',
          status: 'Running',
          progress: 65,
          progressLabel: '65% Processed',
          attribution: '84.2%',
          createdAt: 'Oct 24, 09:12 AM',
        },
        {
          id: 'KTX-8815',
          taskName: 'AdWords Spend Audit',
          client: 'Vertex Finance',
          source: 'CSV Import',
          sourceIcon: 'description',
          status: 'Completed',
          progress: 100,
          progressLabel: '100% Success',
          attribution: '99.1%',
          createdAt: 'Oct 23, 02:45 PM',
        },
      ],
    });

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Reports Navigation' });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/reports');

    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
    expect(await screen.findByText('Q4 E-commerce Attribution')).toBeInTheDocument();
    expect(screen.getByText('AdWords Spend Audit')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(mockReportsList).toHaveBeenCalledTimes(1);
  });
});
