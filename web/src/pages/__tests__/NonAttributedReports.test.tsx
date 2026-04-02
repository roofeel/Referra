import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import NonAttributedReports from '../NonAttributedReports';

const { mockNonAttributedReportsList, mockNonAttributedReportsCreate, mockNonAttributedReportsUpdateStatus, mockNonAttributedReportsRerun, mockNonAttributedReportsDelete, mockNonAttributedReportsListLogs } =
  vi.hoisted(() => ({
    mockNonAttributedReportsList: vi.fn(),
    mockNonAttributedReportsCreate: vi.fn(),
    mockNonAttributedReportsUpdateStatus: vi.fn(),
    mockNonAttributedReportsRerun: vi.fn(),
    mockNonAttributedReportsDelete: vi.fn(),
    mockNonAttributedReportsListLogs: vi.fn(),
  }));

vi.mock('../../service', () => ({
  api: {
    nonAttributedReports: {
      list: mockNonAttributedReportsList,
      create: mockNonAttributedReportsCreate,
      updateStatus: mockNonAttributedReportsUpdateStatus,
      rerun: mockNonAttributedReportsRerun,
      delete: mockNonAttributedReportsDelete,
      listLogs: mockNonAttributedReportsListLogs,
    },
  },
}));

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const basePayload = {
  metrics: {
    totalTasks: 0,
    activeAnalyses: 0,
    successRateAvg: 0,
    dataPoints24h: '0',
  },
  clients: ['Global Retail Corp'],
  rules: [{ id: 'rule-az', name: 'AstraZeneca Global' }],
  attributedReports: [{ id: 'attr-1', taskName: 'Attributed Task 1', clientName: 'Global Retail Corp' }],
  urlParsingVersions: ['v2.4.1'],
  tasks: [],
};

describe('NonAttributedReports', () => {
  it('shows non-attributed specific upload form and excludes impression mapping fields', async () => {
    mockNonAttributedReportsList.mockResolvedValue(basePayload);

    render(
      <MemoryRouter>
        <NonAttributedReports />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Upload Non Attributed Data/i }));

    expect(screen.getByRole('combobox', { name: 'Attributed Report' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'UID Param Name In Event URL' })).toBeInTheDocument();
    expect(screen.queryByText('impression_url')).not.toBeInTheDocument();
    expect(screen.queryByText('impression_time')).not.toBeInTheDocument();
    expect(screen.getByText('registration_url')).toBeInTheDocument();
    expect(screen.getByText('registration_time')).toBeInTheDocument();
  });

  it('can start non-attributed analysis with csv that only has registration columns', async () => {
    mockNonAttributedReportsList.mockResolvedValue(basePayload);
    mockNonAttributedReportsCreate.mockResolvedValue({
      id: 'NA-1',
      taskName: 'NA task',
      client: 'Global Retail Corp',
      source: 'CSV Import',
      sourceIcon: 'description',
      status: 'Running',
      progress: 0,
      progressLabel: '0% Processed',
      attribution: '--',
      createdAt: '2026-04-02T00:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <NonAttributedReports />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Upload Non Attributed Data/i }));

    fireEvent.change(screen.getByLabelText('Analysis Task Name'), { target: { value: 'Non attributed report task' } });

    const csvFile = new File(
      ['registration_url,registration_time,other_column\n/a,2026-03-24,1'],
      'non-attributed.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(screen.getByLabelText('Upload CSV file'), { target: { files: [csvFile] } });

    const startButton = screen.getByRole('button', { name: /Start Analysis/i });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockNonAttributedReportsCreate).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByLabelText('Map impression_url')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Map impression_time')).not.toBeInTheDocument();

    const payload = mockNonAttributedReportsCreate.mock.calls[0][0];
    expect(payload.fieldMappings).toMatchObject({
      event_url: 'registration_url',
      event_time: 'registration_time',
    });
    expect(payload.fieldMappings.source_url).toBeUndefined();
    expect(payload.fieldMappings.source_time).toBeUndefined();
  });
});
