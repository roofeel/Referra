import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';
import { deliveryDashboardApi, type DeliveryDashboardResponse } from '../../service/deliveryDashboard';
import { buildDailyCsvRows } from '../../components/dashboard/dashboardCsv';

vi.mock('../../service/deliveryDashboard', () => ({ deliveryDashboardApi: { get: vi.fn(), refresh: vi.fn() } }));

const payload: DeliveryDashboardResponse = {
  source: 'athena', dataSources: { impressions: 'impressions', installs: 'installs', bidRequests: 'bids' },
  queryConditions: { impressions: 'test', installs: 'test', bidRequests: 'test' },
  filters: [23702], filterLabels: { 23702: 'Test strategy' }, lineItems: [{ id: '123', label: '123' }],
  selectedFilterId: 23702, selectedLineItemId: null,
  bidMetricsEnabled: false, bidPricesEnabled: false, winRateEnabled: false, lastUpdated: null,
  metrics: { impressions: 4000, installs: 10, bidRequests: 0, bids: 8000, ipm: 2.5 },
  hourly: [
    { time: '2026-10-09T23:00:00Z', impressions: 1000, installs: 4, bidResponses: 2000, ipm: 4, previousIpm: 0, bidRate: 0, winRate: 50 },
    { time: '2026-10-09T01:00:00Z', impressions: 3000, installs: 6, bidResponses: 6000, ipm: 2, previousIpm: 0, bidRate: 0, winRate: 50 },
    { time: '2026-10-10T00:00:00Z', impressions: 0, installs: 1, bidResponses: 0, ipm: 0, previousIpm: 0, bidRate: 0, winRate: 0 },
  ],
  bidPrices: [], comparison: [], dma: [], creative: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(deliveryDashboardApi.get).mockResolvedValue(payload);
});
afterEach(() => vi.restoreAllMocks());

describe('Dashboard', () => {
  it('renders the delivery overview dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?filterId=23702']}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Delivery Overview' })).toBeInTheDocument();
    expect(screen.getByText('IPM by hour')).toBeInTheDocument();
    expect(screen.getByText('Creatives by IPM')).toBeInTheDocument();
    await screen.findByText(/Live Athena data/);
  });

  it('downloads daily CSV for the selected range and disables export while filters change', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:daily');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let downloadedFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    render(<MemoryRouter initialEntries={['/dashboard?startDate=2026-10-09&endDate=2026-10-10&filterId=23702']}><Dashboard /></MemoryRouter>);
    const download = screen.getByRole('button', { name: 'Download daily CSV' });
    expect(download).toBeDisabled();
    await waitFor(() => expect(download).toBeEnabled());
    expect(deliveryDashboardApi.get).toHaveBeenCalledWith('2026-10-09', '2026-10-10', 23702, undefined);
    fireEvent.click(download);
    expect(downloadedFilename).toBe('delivery-daily-2026-10-09-to-2026-10-10-strategy-23702.csv');
    expect(await (createUrl.mock.calls[0][0] as Blob).text()).toContain('2026-10-09,23702,All,4000,10,2.50');
    vi.mocked(deliveryDashboardApi.get).mockImplementation(() => new Promise(() => {}));
    fireEvent.change(screen.getByRole('combobox', { name: 'Line Item' }), { target: { value: '123' } });
    expect(download).toBeDisabled();
  });

  it('disables daily download when there is no data', async () => {
    vi.mocked(deliveryDashboardApi.get).mockResolvedValue({ ...payload, hourly: [] });
    render(<MemoryRouter initialEntries={['/dashboard?filterId=23702']}><Dashboard /></MemoryRouter>);
    await screen.findByText(/Live Athena data/);
    expect(screen.getByRole('button', { name: 'Download daily CSV' })).toBeDisabled();
  });

  it('groups by UTC day and calculates rates from daily totals', () => {
    expect(buildDailyCsvRows({ ...payload, winRateEnabled: true, selectedLineItemId: '123' })).toEqual([
      ['Date (UTC)', 'Strategy ID', 'Line Item', 'Impressions', 'Installs', 'IPM', 'Bid responses', 'Win rate (%)'],
      ['2026-10-09', 23702, '123', 4000, 10, '2.50', 8000, '50.00'],
      ['2026-10-10', 23702, '123', 0, 1, '0.00', 0, '0.00'],
    ]);
    expect(buildDailyCsvRows(payload)[0]).not.toContain('Bid responses');
  });
});
