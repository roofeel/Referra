import { useEffect, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppSidebar } from '../components/common/AppSidebar';
import { deliveryDashboardApi, type DeliveryDashboardResponse } from '../service/deliveryDashboard';

type Range = '24h' | '7d' | '30d';

const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 };

const utcTimeFormat: Intl.DateTimeFormatOptions = { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false };
const utcDateTimeFormat: Intl.DateTimeFormatOptions = { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'medium' };

function formatUtcTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', utcTimeFormat).format(new Date(value));
}

function formatUtcDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', utcDateTimeFormat).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function MetricCard({ label, value, change, icon, tone }: { label: string; value: string; change: string; icon: string; tone: string }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,.28)]">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{label}</p>
        <span className={`material-symbols-outlined rounded-lg p-2 text-lg ${tone}`}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${change === 'Loading' ? 'text-amber-600' : 'text-emerald-600'}`}><span className="material-symbols-outlined text-sm">{change === 'Loading' ? 'hourglass_top' : 'verified'}</span>{change}</p>
    </article>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState<Range>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DeliveryDashboardResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const chartData = dashboard?.hourly.map((point) => ({ ...point, time: formatUtcTime(point.time) })) ?? [];
  const liveDmaData = dashboard?.dma.map((item) => ({ ...item, code: item.dma.slice(0, 3).toUpperCase(), delta: 0 })) ?? [];
  const liveCreativeData = dashboard?.creative || [];
  const liveImpressionCompare = dashboard?.comparison.map((point) => ({ ...point, time: formatUtcTime(point.time) })) ?? [];
  const liveFunnelData = dashboard ? [
    { name: 'Bid requests', value: dashboard.metrics.bidRequests, color: '#2563eb' },
    { name: 'Bids returned', value: dashboard.metrics.bids, color: '#14b8a6' },
    { name: 'Impressions', value: dashboard.metrics.impressions, color: '#f59e0b' },
  ] : [];

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const payload = await deliveryDashboardApi.get(range);
        if (!alive) return;
        setDashboard(payload);
        setLoadError(null);
        if (payload.lastUpdated) setLastUpdated(new Date(payload.lastUpdated));
      } catch (error) {
        if (alive) setLoadError(error instanceof Error ? error.message : 'Failed to load Athena metrics');
      }
    };
    void load();
    if (!autoRefresh) return () => { alive = false; };
    const timer = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [autoRefresh, range]);

  const totalToday = dashboard?.metrics.impressions ?? 0;
  const liveIpm = dashboard ? dashboard.metrics.ipm.toFixed(2) : '—';
  const liveBidRate = dashboard && dashboard.metrics.bidRequests ? `${((dashboard.metrics.bids / dashboard.metrics.bidRequests) * 100).toFixed(2)}%` : '—';

  function refresh() {
    setIsRefreshing(true);
    setRefreshNotice('Refresh task submitted…');
    void deliveryDashboardApi.refresh().then(async () => {
      setIsRefreshing(false);
      setRefreshNotice('Refreshing Athena data in the background…');
      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      const payload = await deliveryDashboardApi.get(range);
      setDashboard(payload);
      setLastUpdated(payload.lastUpdated ? new Date(payload.lastUpdated) : new Date());
      setLoadError(null);
      setRefreshNotice('Refresh completed');
      window.setTimeout(() => setRefreshNotice(null), 3_000);
    }).catch((error) => {
      setIsRefreshing(false);
      setLoadError(error instanceof Error ? error.message : 'Failed to queue Athena refresh');
      setRefreshNotice(null);
    });
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="dashboard" ariaLabel="Dashboard Navigation" />
      {refreshNotice ? <div role="status" className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-900/10"><span className="material-symbols-outlined text-base text-blue-600">{refreshNotice === 'Refresh completed' ? 'check_circle' : 'sync'}</span>{refreshNotice}</div> : null}
      <main className="relative ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-8 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-700">Campaign intelligence</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Delivery Overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 md:inline">Updated {lastUpdated ? `${formatUtcTime(lastUpdated)} UTC` : '—'}</span>
            <button type="button" onClick={() => setAutoRefresh((value) => !value)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${autoRefresh ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-300'}`} /> Auto refresh {autoRefresh ? 'on' : 'off'}
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={refresh} disabled={isRefreshing} className="flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"><span className="material-symbols-outlined text-sm">{isRefreshing ? 'progress_activity' : 'refresh'}</span>Refresh</button>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="mt-1 text-sm text-slate-500">Aggregated from impression, install and bidding streams.</p>{loadError ? <p className="mt-2 text-xs font-semibold text-rose-600">Athena unavailable: {loadError}</p> : dashboard ? <p className="mt-2 text-xs font-semibold text-emerald-600">Live Athena data · {dashboard.lastUpdated ? `${formatUtcDateTime(dashboard.lastUpdated)} UTC` : 'waiting for first aggregation'}</p> : <p className="mt-2 text-xs font-semibold text-amber-600">Loading Athena aggregates…</p>}</div>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm">
              {(['24h'] as Range[]).map((item) => <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-md px-3 py-1.5 transition ${range === item ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{item === '24h' ? 'Last 24 hours' : item === '7d' ? '7 days' : '30 days'}</button>)}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Impressions today" value={dashboard ? formatNumber(totalToday) : '—'} change={dashboard ? 'Live Athena' : 'No data'} icon="visibility" tone="bg-blue-50 text-blue-600" />
            <MetricCard label="IPM · today" value={liveIpm} change={dashboard ? 'Live Athena' : 'No data'} icon="speed" tone="bg-teal-50 text-teal-600" />
            <MetricCard label="Bid response rate" value={liveBidRate} change={dashboard ? 'Live Athena' : 'No data'} icon="gavel" tone="bg-amber-50 text-amber-600" />
            <MetricCard label="Bid requests today" value={dashboard ? formatNumber(dashboard.metrics.bidRequests) : '—'} change={dashboard ? 'Live Athena' : 'No data'} icon="campaign" tone="bg-violet-50 text-violet-600" />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <article className="rounded-xl border border-slate-200/80 bg-white p-5 xl:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">IPM by hour</h3></div><div className="flex flex-wrap items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />IPM</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-teal-500" />Bid rate</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />Impressions</span></div></div>
              <div className="mt-5 h-[270px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} barCategoryGap="25%" margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} /><YAxis yAxisId="impressions" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value))} /><YAxis yAxisId="ipm" orientation="right" hide /><YAxis yAxisId="rate" orientation="right" hide /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [name === 'ipm' ? `${value} IPM` : name === 'impressions' ? formatNumber(Number(value)) : `${value}%`, name === 'ipm' ? 'IPM' : name === 'impressions' ? 'Impressions' : 'Bid rate']} /><Bar yAxisId="impressions" dataKey="impressions" name="Impressions" fill="#f59e0b" radius={[3, 3, 0, 0]} /><Area yAxisId="ipm" type="monotone" dataKey="ipm" name="IPM" stroke="#2563eb" fill="#dbeafe" fillOpacity={0.7} strokeWidth={2.5} /><Line yAxisId="rate" type="monotone" dataKey="bidRate" name="Bid rate" stroke="#14b8a6" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
            </article>

            <article className="rounded-xl border border-slate-200/80 bg-white p-5 xl:col-span-2"><div><h3 className="text-sm font-bold text-slate-900">Delivery funnel</h3><p className="mt-1 text-xs text-slate-500">Current 24 hour stream health</p></div>{liveFunnelData.length ? <><div className="relative mt-3 h-[205px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={liveFunnelData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">{liveFunnelData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatNumber(Number(value))} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-900">{formatNumber(liveFunnelData[2]?.value ?? 0)}</span><span className="text-[10px] uppercase tracking-wider text-slate-400">impressions</span></div></div><div className="space-y-2">{liveFunnelData.map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-600"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-bold text-slate-800">{formatNumber(item.value)}</span></div>)}</div></> : <div className="flex h-[245px] items-center justify-center text-xs text-slate-500">No delivery data available.</div>}</article>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <article className="rounded-xl border border-slate-200/80 bg-white p-5 xl:col-span-3"><div className="flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-900">Impressions · today vs yesterday</h3></div></div>{liveImpressionCompare.length ? <div className="mt-5 h-[245px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={liveImpressionCompare} barGap={2} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}><CartesianGrid stroke="#eef2f6" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => `${formatNumber(Number(value))}`} /><Bar dataKey="today" name="Today" fill="#2563eb" radius={[3, 3, 0, 0]} /><Bar dataKey="yesterday" name="Yesterday" fill="#cbd5e1" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="flex h-[245px] items-center justify-center text-xs text-slate-500">No comparison data available.</div>}</article>
            <article className="rounded-xl border border-slate-200/80 bg-white p-5 xl:col-span-2"><div className="flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-900">Top DMA by IPM</h3><p className="mt-1 text-xs text-slate-500">Geographic delivery efficiency</p></div><span className="material-symbols-outlined text-lg text-slate-400">more_horiz</span></div><div className="mt-4 space-y-4">{liveDmaData.map((item, index) => <div key={item.code}><div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-semibold text-slate-700"><span className="mr-2 text-[10px] text-slate-400">0{index + 1}</span>{item.dma}</span><span className="shrink-0 font-black text-slate-900">{item.ipm.toFixed(2)} <span className={`ml-1 text-[10px] ${item.delta > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{item.delta > 0 ? '+' : ''}{item.delta}%</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(item.ipm / 2) * 100}%` }} /></div></div>)}</div></article>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div><h3 className="text-sm font-bold text-slate-900">Top creatives by IPM</h3><p className="mt-1 text-xs text-slate-500">Creative-level delivery efficiency · installs per 1,000 impressions</p></div>
              <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Athena attribution</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Creative</th><th className="px-5 py-3">IPM</th><th className="px-5 py-3">Impressions</th><th className="px-5 py-3">Installs</th></tr></thead><tbody className="divide-y divide-slate-100">{liveCreativeData.length ? liveCreativeData.map((item) => <tr key={item.creative}><td className="px-5 py-4 font-semibold text-slate-800">{item.creative}</td><td className="px-5 py-4 font-black text-slate-900">{item.ipm.toFixed(2)}</td><td className="px-5 py-4 text-slate-600">{formatNumber(item.impressions)}</td><td className="px-5 py-4 text-slate-600">{formatNumber(item.installs)}</td></tr>) : <tr><td className="px-5 py-6 text-slate-500" colSpan={4}>No creative-level URL data available for this range.</td></tr>}</tbody></table>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
