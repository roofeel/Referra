import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsDetail from '../ReportsDetail';

const { mockReportsDetail } = vi.hoisted(() => ({
  mockReportsDetail: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    reports: {
      detail: mockReportsDetail,
    },
  },
}));

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('ReportsDetail', () => {
  beforeEach(() => {
    mockReportsDetail.mockReset();
    mockReportsDetail.mockResolvedValue({
      clientName: 'Global Retail Corp',
      referrerTypeStats: [{ referrerType: 'organic', count: 1, percentage: 100 }],
      metrics: [
        { title: 'Total Events', value: '2', note: '100.0% parsing success', tone: 'positive', icon: 'data_object' },
        { title: 'Matched Events', value: '1', note: '50.0% coverage', tone: 'neutral', icon: 'browser_updated' },
        { title: 'Avg Duration', value: '10.0m', note: 'event_time - source_time', tone: 'neutral', icon: 'timer' },
      ],
      distribution: [
        { label: 'organic', height: '100%', color: 'bg-blue-700' },
        { label: 'unknown', height: '50%', color: 'bg-slate-300' },
      ],
      insights: {
        parsingSuccess: 50,
        missedRules: 1,
        aiParameterCoverage: 50,
        unmatchedTokens: 1,
        aiConfidenceAvg: 77.5,
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
          url: 'https://example.com?utm_source=google&uid=u_001',
          ruleName: 'Checkout Rule',
          confidenceScore: '95.0%',
          aiResult: 'matched',
          extractedParameters: [['utm_source', 'google']],
          attributionPath: [
            ['Source', '2026-03-24 09:50:00', 'bg-emerald-500'],
            ['Event URL', '2026-03-24 10:00:00', 'bg-blue-500'],
            ['Classification', 'organic • Matched', 'bg-blue-700'],
          ],
        },
      },
    });
  });

  it('renders report detail shell and analytics modules from API', async () => {
    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Reports Detail Navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Report #KTX-8821')).toBeInTheDocument();
    expect(await screen.findByText('Global Retail Corp')).toBeInTheDocument();
    expect(await screen.findByText('Referrer Type Bar Chart')).toBeInTheDocument();
    expect(screen.getByText('Referrer Type Donut Chart')).toBeInTheDocument();
    expect(screen.getByText('REGISTRATION')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Category Attributed/i })).toHaveAttribute('href', '/reports');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');
    expect(mockReportsDetail).toHaveBeenCalledWith('KTX-8821', {
      page: 1,
      pageSize: 50,
      cohortMode: 'non-cohort',
      windowHours: 24,
    });
    expect(screen.queryByRole('dialog', { name: 'Event Detail' })).not.toBeInTheDocument();
  });

  it('opens and closes the event detail drawer from a table row', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByText('u_001'));

    expect(screen.getByRole('dialog', { name: 'Event Detail' })).toBeInTheDocument();
    expect(screen.getByText('Checkout Rule')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close Event Detail' }));

    expect(screen.queryByRole('dialog', { name: 'Event Detail' })).not.toBeInTheDocument();
  });

  it('loads next page when clicking pagination next', async () => {
    const user = userEvent.setup();
    mockReportsDetail
      .mockResolvedValueOnce({
        clientName: 'Global Retail Corp',
        referrerTypeStats: [{ referrerType: 'organic', count: 60, percentage: 100 }],
        metrics: [],
        distribution: [],
        insights: {
          parsingSuccess: 50,
          missedRules: 1,
          aiParameterCoverage: 50,
          unmatchedTokens: 1,
          aiConfidenceAvg: 77.5,
        },
        pagination: {
          page: 1,
          pageSize: 50,
          totalRows: 60,
          totalPages: 2,
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
      })
      .mockResolvedValueOnce({
        clientName: 'Global Retail Corp',
        referrerTypeStats: [{ referrerType: 'organic', count: 60, percentage: 100 }],
        metrics: [],
        distribution: [],
        insights: {
          parsingSuccess: 50,
          missedRules: 1,
          aiParameterCoverage: 50,
          unmatchedTokens: 1,
          aiConfidenceAvg: 77.5,
        },
        pagination: {
          page: 2,
          pageSize: 50,
          totalRows: 60,
          totalPages: 2,
        },
        rows: [
          {
            eventId: 'ev_2',
            uid: 'u_002',
            eventName: 'REGISTRATION',
            ts: '2026-03-24 11:00:00',
            sourceTs: '2026-03-24 10:00:00',
            category: 'organic',
            type: 'matched',
            status: 'SUCCESS',
            duration: '11.0m',
          },
        ],
        eventDetails: {
          ev_2: {
            url: 'https://example.com?uid=u_002',
            ruleName: 'Checkout Rule',
            confidenceScore: '95.0%',
            aiResult: 'matched',
            extractedParameters: [['uid', 'u_002']],
            attributionPath: [],
          },
        },
      });

    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByText('u_001');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findAllByText('u_002');
    expect(mockReportsDetail).toHaveBeenCalledWith('KTX-8821', {
      page: 2,
      pageSize: 50,
      cohortMode: 'non-cohort',
      windowHours: 24,
    });
  });

  it('applies date range filters when clicking apply', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByText('u_001');
    await user.type(screen.getByLabelText('Start Date'), '2026-03-01');
    await user.type(screen.getByLabelText('End Date'), '2026-03-24');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(mockReportsDetail).toHaveBeenCalledWith('KTX-8821', {
      page: 1,
      pageSize: 50,
      startDate: '2026-03-01',
      endDate: '2026-03-24',
      cohortMode: 'non-cohort',
      windowHours: 24,
    });
  });

  it('renders event_time column after first_page_load_time when first-page-load columns are enabled', async () => {
    mockReportsDetail.mockResolvedValueOnce({
      clientName: 'Global Retail Corp',
      hasRelatedEventFieldMappings: true,
      referrerTypeStats: [{ referrerType: 'organic', count: 1, percentage: 100 }],
      metrics: [],
      distribution: [],
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
          firstPageLoadTs: '2026-03-24 09:55:00',
          firstPageLoadDuration: '5.0m',
          firstPageLoadToRegistrationDuration: '5.0m',
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
      reportType: 'registration',
    });

    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Global Retail Corp');
    const headerNames = screen
      .getAllByRole('columnheader')
      .map((header) => (header.textContent || '').trim().toLowerCase());
    const firstPageLoadTimeIndex = headerNames.indexOf('first_page_load_time');
    const eventTimeIndex = headerNames.indexOf('registration_time');

    expect(firstPageLoadTimeIndex).toBeGreaterThan(-1);
    expect(eventTimeIndex).toBeGreaterThan(-1);
    expect(eventTimeIndex).toBeGreaterThan(firstPageLoadTimeIndex);
  });

  it('uses source_time date range when cohort mode is selected', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/reports/KTX-8821']}>
        <Routes>
          <Route path="/reports/:reportId" element={<ReportsDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByText('u_001');
    await user.selectOptions(screen.getByLabelText('Cohort Mode'), 'cohort');
    await user.type(screen.getByLabelText('Start Date'), '2026-03-10');
    await user.type(screen.getByLabelText('End Date'), '2026-03-24');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(mockReportsDetail).toHaveBeenLastCalledWith('KTX-8821', {
      page: 1,
      pageSize: 50,
      startDate: '2026-03-10',
      endDate: '2026-03-24',
      cohortMode: 'cohort',
      windowHours: 24,
    });
  });
});
