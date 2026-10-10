import type { DeliveryDashboardResponse } from '../../service/deliveryDashboard';

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadCsv(rows: Array<Array<string | number>>, filename: string) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function buildDailyCsvRows(dashboard: DeliveryDashboardResponse): Array<Array<string | number>> {
  const daily = new Map<string, { impressions: number; installs: number; bidResponses: number }>();
  for (const point of dashboard.hourly) {
    const date = new Date(point.time).toISOString().slice(0, 10);
    const totals = daily.get(date) ?? { impressions: 0, installs: 0, bidResponses: 0 };
    totals.impressions += point.impressions;
    totals.installs += point.installs;
    totals.bidResponses += point.bidResponses;
    daily.set(date, totals);
  }
  const header = ['Date (UTC)', 'Strategy ID', 'Line Item', 'Impressions', 'Installs', 'IPM'];
  if (dashboard.winRateEnabled) header.push('Bid responses', 'Win rate (%)');
  return [header, ...Array.from(daily).sort(([left], [right]) => left.localeCompare(right)).map(([date, totals]) => {
    const row: Array<string | number> = [
      date, dashboard.selectedFilterId ?? '', dashboard.selectedLineItemId ?? 'All',
      totals.impressions, totals.installs,
      (totals.impressions ? totals.installs / totals.impressions * 1000 : 0).toFixed(2),
    ];
    if (dashboard.winRateEnabled) {
      row.push(totals.bidResponses, (totals.bidResponses ? totals.impressions / totals.bidResponses * 100 : 0).toFixed(2));
    }
    return row;
  })];
}
