import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NonAttributedReportsDetail from '../NonAttributedReportsDetail';

const { mockNonAttributedReportsDetail } = vi.hoisted(() => ({
  mockNonAttributedReportsDetail: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    nonAttributedReports: {
      detail: mockNonAttributedReportsDetail,
    },
  },
}));

describe('NonAttributedReportsDetail', () => {
  beforeEach(() => {
    mockNonAttributedReportsDetail.mockReset();
    mockNonAttributedReportsDetail.mockResolvedValue({
      clientName: 'Global Retail Corp',
      reportType: 'registration',
      referrerTypeStats: [{ referrerType: 'organic', count: 1, percentage: 100 }],
      metrics: [{ title: 'Total Events', value: '1', note: '100.0% parsing success', tone: 'positive', icon: 'data_object' }],
      distribution: [{ label: 'organic', height: '100%', color: 'bg-blue-700' }],
      insights: {
        parsingSuccess: 100,
        missedRules: 0,
        aiParameterCoverage: 100,
        unmatchedTokens: 0,
        aiConfidenceAvg: 95,
      },
      pagination: {
        page: 1,
        pageSize: 50,
        totalRows: 1,
        totalPages: 1,
      },
      rows: [
        {
          eventId: 'ev_1',
          uid: 'u_001',
          eventName: 'REGISTRATION',
          ts: '2026-03-24 10:00:00',
          sourceTs: '2026-03-24 09:50:00',
          category: 'organic',
          type: 'matched',
          status: 'SUCCESS',
          duration: '10.0m',
        },
      ],
      eventDetails: {
        ev_1: {
          url: 'https://example.com?uid=u_001',
          ruleName: 'Checkout Rule',
          confidenceScore: '95.0%',
          aiResult: 'matched',
          extractedParameters: [['uid', 'u_001']],
          attributionPath: [],
        },
      },
    });
  });

  it('renders non-attributed detail and calls non-attributed detail API', async () => {
    render(
      <MemoryRouter initialEntries={['/non-attributed-reports/NA-8821']}>
        <Routes>
          <Route path="/non-attributed-reports/:reportId" element={<NonAttributedReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Non-Attributed Reports Detail Navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Report #NA-8821')).toBeInTheDocument();
    expect(await screen.findByText('Global Retail Corp')).toBeInTheDocument();
    expect(screen.getByLabelText('Referrer Type')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cohort Mode')).not.toBeInTheDocument();
    expect(screen.queryByText(/Window/i)).not.toBeInTheDocument();
    expect(screen.queryByText('registration_time')).not.toBeInTheDocument();
    expect(screen.queryByText('impression_time')).not.toBeInTheDocument();
    expect(screen.queryByText('duration')).not.toBeInTheDocument();
    expect(screen.queryByText('Avg Duration')).not.toBeInTheDocument();
    expect(within(nav).getByText('NonAttributed').closest('a')).toHaveAttribute(
      'href',
      '/non-attributed-reports',
    );
    expect(mockNonAttributedReportsDetail).toHaveBeenCalledWith('NA-8821', {
      page: 1,
      pageSize: 50,
    });
  });

  it('applies referrer type filter when user clicks Apply', async () => {
    render(
      <MemoryRouter initialEntries={['/non-attributed-reports/NA-8821']}>
        <Routes>
          <Route path="/non-attributed-reports/:reportId" element={<NonAttributedReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Global Retail Corp');

    fireEvent.change(screen.getByLabelText('Referrer Type'), { target: { value: 'organic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(mockNonAttributedReportsDetail).toHaveBeenLastCalledWith('NA-8821', {
        page: 1,
        pageSize: 50,
        referrerType: 'organic',
      });
    });
  });
});
