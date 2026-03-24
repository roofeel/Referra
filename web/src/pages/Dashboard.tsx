import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

type MetricTone = 'positive' | 'negative' | 'neutral';

const navItems = [
  { label: 'Data Analysis', icon: 'DA', active: true },
  { label: 'URL Rules', icon: 'UR' },
  { label: 'Config', icon: 'CF' },
  { label: 'System', icon: 'SY' },
];

const metrics = [
  { title: 'Total Events', value: '1,284,930', note: '12.4% vs prev', tone: 'positive', icon: 'EV' },
  { title: 'Impression Count', value: '842,102', note: '65% of total volume', tone: 'neutral', icon: 'IM', progress: 65 },
  { title: 'Pageload Count', value: '312,440', note: '37.1% conversion from imp', tone: 'neutral', icon: 'PL' },
  { title: 'Registration Count', value: '12,840', note: '2.1% vs target', tone: 'negative', icon: 'RG' },
  { title: 'Successful Attributions', value: '9,412', note: 'Verified logical chains', tone: 'neutral', icon: 'AT' },
  { title: 'Attribution Rate (%)', value: '73.3%', note: 'Target: > 75.0%', tone: 'neutral', icon: 'AR' },
  { title: 'Avg Duration', value: '4.2h', note: 'Time-to-action median', tone: 'neutral', icon: 'TM' },
  { title: 'P50 / P90 Duration', value: '1.8h / 14.2h', note: 'Standard deviation: 2.4h', tone: 'neutral', icon: 'P9' },
] satisfies Array<{
  title: string;
  value: string;
  note: string;
  tone: MetricTone;
  icon: string;
  progress?: number;
}>;

const distribution = [
  { label: 'organic', height: '85%', color: 'bg-blue-700' },
  { label: 'referral', height: '45%', color: 'bg-blue-300' },
  { label: 'direct', height: '25%', color: 'bg-slate-300' },
  { label: 'paid', height: '60%', color: 'bg-blue-500/45' },
];

const tableRows = [
  {
    eventId: 'ev_9x128a',
    uid: 'u_881-x92',
    eventName: 'REGISTRATION',
    ts: '2023-10-24 14:22:01',
    category: 'Organic Search',
    type: 'Direct Link',
    status: 'SUCCESS',
    duration: '12.4m',
  },
  {
    eventId: 'ev_9x129b',
    uid: 'u_421-k12',
    eventName: 'PAGELOAD',
    ts: '2023-10-24 14:23:45',
    category: 'Paid Social',
    type: 'Short URL',
    status: 'PENDING',
    duration: '0.8m',
  },
  {
    eventId: 'ev_9x130c',
    uid: 'u_109-f54',
    eventName: 'REGISTRATION',
    ts: '2023-10-24 14:25:12',
    category: 'Referral',
    type: 'Partner Portal',
    status: 'UNMATCHED',
    duration: '4.1h',
  },
  {
    eventId: 'ev_9x131d',
    uid: 'u_881-x92',
    eventName: 'IMPRESSION',
    ts: '2023-10-24 14:26:59',
    category: 'Internal',
    type: 'Cross-Product',
    status: 'SUCCESS',
    duration: '--',
  },
];

const eventDetails = {
  ev_9x128a: {
    url: 'https://enterprise.kinetic-intel.com/v1/auth/callback?session=xyz_7721&ref=ad_campaign_alpha_441&utm_source=google&utm_medium=cpc',
    ruleVersion: 'v2.4.1 (Active)',
    matchedRuleId: 'r_auth_772',
    confidenceScore: '98.2%',
    aiResult: 'Parameter ref mapped to internal_campaign_id based on historical path variance.',
    extractedParameters: [
      ['utm_source', 'google'],
      ['session', 'xyz_7721'],
      ['campaign', 'alpha_441'],
    ],
    attributionPath: [
      ['Impression (Ad #441)', 'Oct 24, 09:12 AM • Google Search', 'bg-emerald-500'],
      ['Landing Page', 'Oct 24, 11:45 AM • /solutions/enterprise', 'bg-blue-500'],
      ['Registration', 'Oct 24, 14:22 PM • Success', 'bg-blue-700'],
    ],
  },
  ev_9x129b: {
    url: 'https://engage.kinetic-intel.com/social/launch?click_id=ps_5512&ref=meta_launch_q4&utm_source=meta&utm_medium=paid_social',
    ruleVersion: 'v2.4.1 (Active)',
    matchedRuleId: 'r_social_551',
    confidenceScore: '91.4%',
    aiResult: 'Meta paid-social click identifier aligned with paid_campaign_group after fallback token normalization.',
    extractedParameters: [
      ['utm_source', 'meta'],
      ['click_id', 'ps_5512'],
      ['campaign', 'launch_q4'],
    ],
    attributionPath: [
      ['Paid Social Click', 'Oct 24, 14:17 PM • Meta Campaign', 'bg-blue-500'],
      ['Redirect', 'Oct 24, 14:21 PM • Short URL Resolver', 'bg-slate-400'],
      ['Pageload', 'Oct 24, 14:23 PM • Pending Match', 'bg-blue-700'],
    ],
  },
  ev_9x130c: {
    url: 'https://partners.kinetic-intel.com/invite?partner_id=ref_892&token=zz19-alpha&src=channel_referral',
    ruleVersion: 'v2.3.0 (Specified)',
    matchedRuleId: 'r_partner_089',
    confidenceScore: '64.7%',
    aiResult: 'Referral token likely maps to partner_program_id, but the final registration event is outside the current confidence threshold.',
    extractedParameters: [
      ['partner_id', 'ref_892'],
      ['token', 'zz19-alpha'],
      ['src', 'channel_referral'],
    ],
    attributionPath: [
      ['Referral Click', 'Oct 24, 10:02 AM • Partner Portal', 'bg-emerald-500'],
      ['Landing Page', 'Oct 24, 10:06 AM • /invite/accept', 'bg-blue-500'],
      ['Registration', 'Oct 24, 14:25 PM • Unmatched', 'bg-rose-500'],
    ],
  },
  ev_9x131d: {
    url: 'https://internal.kinetic-intel.com/cross-product?placement=banner_11&origin=analytics_hub&uid=u_881-x92',
    ruleVersion: 'v2.4.1 (Active)',
    matchedRuleId: 'r_internal_118',
    confidenceScore: '96.1%',
    aiResult: 'Cross-product internal source matched through signed placement metadata and prior session stitching.',
    extractedParameters: [
      ['placement', 'banner_11'],
      ['origin', 'analytics_hub'],
      ['uid', 'u_881-x92'],
    ],
    attributionPath: [
      ['Internal Impression', 'Oct 24, 14:26 PM • Analytics Hub', 'bg-emerald-500'],
      ['Cross-Product Link', 'Oct 24, 14:26 PM • Internal Router', 'bg-blue-500'],
      ['Verification', 'Oct 24, 14:27 PM • Success', 'bg-blue-700'],
    ],
  },
} satisfies Record<
  string,
  {
    url: string;
    ruleVersion: string;
    matchedRuleId: string;
    confidenceScore: string;
    aiResult: string;
    extractedParameters: Array<[string, string]>;
    attributionPath: Array<[string, string, string]>;
  }
>;

function statusClasses(status: string) {
  if (status === 'SUCCESS') {
    return 'bg-emerald-500 text-emerald-600';
  }

  if (status === 'PENDING') {
    return 'bg-blue-500 text-blue-600';
  }

  return 'bg-rose-500 text-rose-600';
}

function MetricCard({
  title,
  value,
  note,
  icon,
  tone,
  progress,
}: {
  title: string;
  value: string;
  note: string;
  icon: string;
  tone: MetricTone;
  progress?: number;
}) {
  const noteClass =
    tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : 'text-slate-500';

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">{title}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600">
          {icon}
        </span>
      </div>
      <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <div className={`mt-3 text-[11px] font-semibold ${noteClass}`}>{note}</div>
      {typeof progress === 'number' ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-700" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </article>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedRow, setSelectedRow] = useState(tableRows[0]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const identityLabel = user?.name ?? user?.email ?? 'Admin Terminal';
  const selectedDetail = eventDetails[selectedRow.eventId];
  const initials = identityLabel
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    if (!isDetailOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDetailOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen]);

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-700/40 bg-slate-900 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-700/30">
          <div className="flex h-full flex-col">
            <div className="px-6 py-6">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black">RA</div>
                <div>
                  <div className="text-lg font-black tracking-[-0.04em]">Referrer AI</div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Control Plane</div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 pb-6">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-sm font-medium transition ${
                      item.active
                        ? 'border-blue-500 bg-blue-500/15 text-white'
                        : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold">
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="border-t border-slate-700/40 p-4">
              <div className="rounded-2xl bg-slate-800/80 p-4">
                <div className="flex items-center gap-3">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={identityLabel}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white">
                      {initials || 'RA'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{user?.name ?? 'Admin Terminal'}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email ?? 'Precision Intelligence'}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Docs
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 backdrop-blur">
            <div className="flex flex-col gap-4 px-6 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-blue-700">Data Analysis</p>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Attribution Dashboard</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Alerts
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-600"
                >
                  Upload Data
                </button>
              </div>
            </div>
          </header>

          <div className="px-6 py-6 sm:px-8">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)]">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_180px_120px_180px_auto]">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Client Selection</span>
                  <select className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    <option>Global Enterprise Solutions (All)</option>
                    <option>Astra Financial</option>
                    <option>Vanguard Logistics</option>
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Date Range</span>
                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Oct 01 - Oct 31, 2023</div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Logic</span>
                  <select className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    <option>impression → reg</option>
                    <option>earliest pageload</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Window</span>
                  <select className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    <option>24h</option>
                    <option>48h</option>
                    <option>7d</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">URL Parsing</span>
                  <select className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    <option>Current (v2.4.1)</option>
                    <option>Specified (v2.3.0)</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.title} {...metric} />
              ))}
            </section>

            <section className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">URL Classification & Performance</h2>
                      <p className="mt-2 text-sm text-slate-500">Category distribution and rule coverage against current parsing logic.</p>
                    </div>
                    <div className="flex gap-3 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-700" /> ourl</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-300" /> rl</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" /> dl</span>
                    </div>
                  </div>

                  <div className="mt-8 grid h-52 grid-cols-4 gap-4">
                    {distribution.map((item) => (
                      <div key={item.label} className="flex flex-col justify-end gap-3">
                        <div className={`w-full rounded-t-xl ${item.color}`} style={{ height: item.height }} />
                        <div className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
                    <div>
                      <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">99.2%</div>
                      <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Parsing Success</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">142</div>
                      <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Missed Rules</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">84%</div>
                      <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">AI Parameter Coverage</div>
                    </div>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-3xl border border-blue-100 bg-[linear-gradient(180deg,#ecf4ff_0%,#f8fbff_100%)] p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)]">
                  <div className="relative z-10">
                    <h2 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-blue-800">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-[11px] font-bold text-white">AI</span>
                      AI Extraction Insights
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      Deep analysis identified 428 new recurring URL patterns currently classified as unknown. Recommended rule upgrade to v2.5.0 captures an estimated 8.2% more attribution paths.
                    </p>

                    <div className="mt-8 space-y-5">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                          <span>Unmatched Tokens</span>
                          <span>3,219</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full w-[22%] rounded-full bg-blue-700" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                          <span>AI Confidence Avg</span>
                          <span>94.8%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full w-[94%] rounded-full bg-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-blue-700/10 blur-2xl" />
                </article>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {['event_id', 'uid', 'event_name', 'ts', 'url_category', 'rl_type', 'attribution_status', 'duration'].map((header) => (
                        <th key={header} className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tableRows.map((row) => (
                      <tr
                        key={row.eventId}
                        onClick={() => {
                          setSelectedRow(row);
                          setIsDetailOpen(true);
                        }}
                        className={`cursor-pointer transition hover:bg-slate-50 ${selectedRow.eventId === row.eventId ? 'bg-blue-50/60' : 'bg-white'}`}
                      >
                        <td className="px-4 py-4 font-mono text-xs text-slate-500">{row.eventId}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-900">{row.uid}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-extrabold tracking-[0.14em] text-blue-700">{row.eventName}</span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">{row.ts}</td>
                        <td className="px-4 py-4 text-xs text-slate-700">{row.category}</td>
                        <td className="px-4 py-4 text-xs text-slate-700">{row.type}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-slate-700">
                            <span className={`h-2 w-2 rounded-full ${statusClasses(row.status).split(' ')[0]}`} />
                            <span className={statusClasses(row.status).split(' ')[1]}>{row.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-xs text-slate-500">{row.duration}</td>
                        <td className="px-4 py-4 text-right text-slate-300">›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing 1-10 of 12,840 results</span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50">
                    Previous
                  </button>
                  <button type="button" className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white">
                    1
                  </button>
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                    2
                  </button>
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                    3
                  </button>
                  <span>...</span>
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 rounded-full bg-slate-950 px-6 py-4 text-sm font-bold text-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.7)] transition hover:scale-[1.02]"
      >
        New Analysis Task
      </button>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isDetailOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsDetailOpen(false)}
        aria-hidden={!isDetailOpen}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
        aria-hidden={!isDetailOpen}
        className={`fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-200/80 bg-white shadow-2xl transition-transform duration-300 ${
          isDetailOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex min-h-full flex-col p-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 id="event-detail-title" className="text-sm font-black uppercase tracking-[0.22em] text-slate-950">
                Event Detail
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close Event Detail"
            >
              ✕
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">URL Context</h3>
              <div className="mt-3 rounded-2xl bg-slate-100 p-4">
                <p className="break-all font-mono text-[12px] leading-6 text-slate-700">{selectedDetail.url}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Rule Analysis</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Rule Version</span>
                  <span className="font-bold">{selectedDetail.ruleVersion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Matched Rule ID</span>
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">{selectedDetail.matchedRuleId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Confidence Score</span>
                  <span className="font-bold text-emerald-600">{selectedDetail.confidenceScore}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-700">AI Results</h3>
              <div className="mt-3 rounded-r-2xl border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                {selectedDetail.aiResult}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Extracted Parameters</h3>
              <div className="mt-3 space-y-3">
                {selectedDetail.extractedParameters.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{key}</span>
                    <span className="h-px flex-1 border-b border-dotted border-slate-300" />
                    <span className="font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Attribution Path</h3>
              <div className="relative mt-4 space-y-6 pl-6 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200">
                {selectedDetail.attributionPath.map(([title, detail, color]) => (
                  <div key={title} className="relative">
                    <span className={`absolute -left-6 top-1 block h-4 w-4 rounded-full border-4 border-white ${color}`} />
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6">
            <button
              type="button"
              className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
            >
              Flag for Manual Review
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
