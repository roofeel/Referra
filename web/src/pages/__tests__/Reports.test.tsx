import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Reports from '../Reports';

const { mockReportsList, mockReportsCreate, mockReportsUpdateStatus, mockReportsRerun, mockReportsDelete } = vi.hoisted(() => ({
  mockReportsList: vi.fn(),
  mockReportsCreate: vi.fn(),
  mockReportsUpdateStatus: vi.fn(),
  mockReportsRerun: vi.fn(),
  mockReportsDelete: vi.fn(),
}));

vi.mock('../../service', () => ({
  api: {
    reports: {
      list: mockReportsList,
      create: mockReportsCreate,
      updateStatus: mockReportsUpdateStatus,
      rerun: mockReportsRerun,
      delete: mockReportsDelete,
    },
  },
}));

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
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
      rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
      urlParsingVersions: ['v2.4.1', 'v1.9.8'],
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

  it('opens upload data drawer on click', async () => {
    mockReportsList.mockResolvedValueOnce({
      metrics: {
        totalTasks: 0,
        activeAnalyses: 0,
        successRateAvg: 0,
        dataPoints24h: '0',
      },
      clients: ['Global Retail Corp'],
      rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
      urlParsingVersions: ['v2.4.1'],
      tasks: [],
    });

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    const uploadButton = await screen.findByRole('button', { name: /Upload Data/i });
    fireEvent.click(uploadButton);

    expect(screen.getByRole('heading', { name: 'Upload Data' })).toBeInTheDocument();
    expect(screen.getByText('Report Information')).toBeInTheDocument();
    expect(screen.getByText('Data Source')).toBeInTheDocument();
  });

  it('switches required mapping fields by attribution logic and auto-matches CSV headers', async () => {
    mockReportsList.mockResolvedValueOnce({
      metrics: {
        totalTasks: 0,
        activeAnalyses: 0,
        successRateAvg: 0,
        dataPoints24h: '0',
      },
      clients: ['Global Retail Corp'],
      rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
      urlParsingVersions: ['v2.4.1'],
      tasks: [],
    });

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Upload Data/i }));

    expect(screen.getByText('registration_url')).toBeInTheDocument();
    expect(screen.queryByText('page_load_url')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Impression → Earliest Pageload'));
    expect(screen.getByText('page_load_url')).toBeInTheDocument();
    expect(screen.queryByText('registration_url')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Impression → Registration'));
    const csvFile = new File(
      ['impression_url,registration_url,impression_time,other_column\n/a,/b,2026-03-24,1'],
      'report.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(screen.getByLabelText('Upload CSV file'), { target: { files: [csvFile] } });

    await waitFor(() => {
      expect((screen.getByLabelText('Map impression_url') as HTMLSelectElement).value).toBe('impression_url');
      expect((screen.getByLabelText('Map registration_url') as HTMLSelectElement).value).toBe('registration_url');
      expect((screen.getByLabelText('Map impression_time') as HTMLSelectElement).value).toBe('impression_time');
      expect((screen.getByLabelText('Map registration_time') as HTMLSelectElement).value).toBe('');
    });
  });

  it('enables Start Analysis only when required form fields are complete', async () => {
    mockReportsList.mockResolvedValueOnce({
      metrics: {
        totalTasks: 0,
        activeAnalyses: 0,
        successRateAvg: 0,
        dataPoints24h: '0',
      },
      clients: ['Global Retail Corp'],
      rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
      urlParsingVersions: ['v2.4.1'],
      tasks: [],
    });

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Upload Data/i }));
    const startButton = screen.getByRole('button', { name: /Start Analysis/i });
    expect(startButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Analysis Task Name'), { target: { value: 'Q4 Conversion Audit' } });
    expect(startButton).toBeDisabled();

    const csvFile = new File(
      ['impression_url,registration_url,impression_time,registration_time\n/a,/b,2026-03-24,2026-03-24'],
      'report.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(screen.getByLabelText('Upload CSV file'), { target: { files: [csvFile] } });

    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });
  });

  it('navigates to report detail page from view action', async () => {
    mockReportsList.mockResolvedValueOnce({
      metrics: {
        totalTasks: 1,
        activeAnalyses: 1,
        successRateAvg: 95,
        dataPoints24h: '1.2M',
      },
      clients: ['Global Retail Corp'],
      rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
      urlParsingVersions: ['v2.4.1'],
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
      ],
    });

    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportId" element={<div>Report detail page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Q4 E-commerce Attribution');
    fireEvent.click(screen.getByRole('button', { name: 'View task' }));
    expect(await screen.findByText('Report detail page')).toBeInTheDocument();
  });

  it('reruns completed task when clicking play action', async () => {
    mockReportsList
      .mockResolvedValueOnce({
        metrics: {
          totalTasks: 1,
          activeAnalyses: 0,
          successRateAvg: 100,
          dataPoints24h: '12K',
        },
        clients: ['Global Retail Corp'],
        rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
        urlParsingVersions: ['v2.4.1'],
        tasks: [
          {
            id: 'KTX-1001',
            taskName: 'Completed Task',
            client: 'Global Retail Corp',
            source: 'CSV Import',
            sourceIcon: 'description',
            status: 'Completed',
            progress: 100,
            progressLabel: '100% Success',
            attribution: '99.1%',
            createdAt: 'Oct 24, 09:12 AM',
          },
        ],
      })
      .mockResolvedValueOnce({
        metrics: {
          totalTasks: 1,
          activeAnalyses: 1,
          successRateAvg: 99.1,
          dataPoints24h: '12K',
        },
        clients: ['Global Retail Corp'],
        rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
        urlParsingVersions: ['v2.4.1'],
        tasks: [
          {
            id: 'KTX-1001',
            taskName: 'Completed Task',
            client: 'Global Retail Corp',
            source: 'CSV Import',
            sourceIcon: 'description',
            status: 'Running',
            progress: 0,
            progressLabel: '0% Processed',
            attribution: '99.1%',
            createdAt: 'Oct 24, 09:12 AM',
          },
        ],
      });

    mockReportsRerun.mockResolvedValueOnce({
      id: 'KTX-1001',
      taskName: 'Completed Task',
      client: 'Global Retail Corp',
      source: 'CSV Import',
      sourceIcon: 'description',
      status: 'Running',
      progress: 0,
      progressLabel: '0% Processed',
      attribution: '99.1%',
      createdAt: 'Oct 24, 09:12 AM',
    });

    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );

    await screen.findByText('Completed Task');
    fireEvent.click(screen.getByRole('button', { name: 'Rerun task' }));

    await waitFor(() => {
      expect(mockReportsRerun).toHaveBeenCalledWith('KTX-1001');
    });
  });
});
