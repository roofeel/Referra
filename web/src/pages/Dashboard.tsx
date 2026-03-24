import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

type MetricTone = 'positive' | 'negative' | 'neutral';

const navItems = [
  { label: 'Data Analysis', icon: 'analytics', active: true },
  { label: 'URL Rules', icon: 'rule' },
  { label: 'Config', icon: 'settings_input_component' },
  { label: 'System', icon: 'admin_panel_settings' },
];

const metrics = [
  { title: 'Total Events', value: '1,284,930', note: '12.4% vs prev', tone: 'positive', icon: 'data_object' },
  { title: 'Impression Count', value: '842,102', note: '65% of total volume', tone: 'neutral', icon: 'visibility', progress: 65 },
  { title: 'Pageload Count', value: '312,440', note: '37.1% conversion from imp', tone: 'neutral', icon: 'browser_updated' },
  { title: 'Registration Count', value: '12,840', note: '2.1% vs target', tone: 'negative', icon: 'person_add' },
  { title: 'Successful Attributions', value: '9,412', note: 'Verified logical chains', tone: 'neutral', icon: 'check_circle' },
  { title: 'Attribution Rate (%)', value: '73.3%', note: 'Target: > 75.0%', tone: 'neutral', icon: 'percent' },
  { title: 'Avg Duration', value: '4.2h', note: 'Time-to-action median', tone: 'neutral', icon: 'timer' },
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

  const iconClass =
    tone === 'positive'
      ? 'text-blue-600 bg-blue-50'
      : tone === 'negative'
        ? 'text-slate-400'
        : 'text-slate-400';

  return (
    <article className="rounded-xl border border-slate-200/60 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <span className={`material-symbols-outlined p-1.5 rounded text-lg ${iconClass}`}>{icon}</span>
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${noteClass}`}>
        {tone === 'positive' && <span className="material-symbols-outlined text-sm">trending_up</span>}
        {tone === 'negative' && <span className="material-symbols-outlined text-sm">trending_down</span>}
        {note}
      </div>
      {typeof progress === 'number' ? (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
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
    <div className="bg-[#f2f4f6] text-slate-900 antialiased flex overflow-hidden h-screen">
      {/* Sidebar */}
      <aside className="bg-slate-800 fixed left-0 top-0 h-full flex flex-col z-40 w-64">
        <div className="p-6">
          <div className="text-xl font-black text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
            Referrer AI
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-xs font-medium transition ${
                item.active
                  ? 'text-white bg-blue-700/20 border-blue-600'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg ${item.active ? 'text-blue-400' : ''}`}
                style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg mb-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={identityLabel} className="h-8 w-8 rounded flex items-center justify-center object-cover" />
            ) : (
              <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                {initials || 'PI'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name ?? 'Admin Terminal'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email ?? 'Precision Intelligence'}</p>
            </div>
          </div>
          <div className="space-y-1">
            <button
              type="button"
              className="text-slate-400 hover:text-white px-4 py-2 transition-colors flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest w-full"
            >
              <span className="material-symbols-outlined text-sm">auto_stories</span>
              Documentation
            </button>
            <button
              type="button"
              className="text-slate-400 hover:text-white px-4 py-2 transition-colors flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest w-full"
            >
              <span className="material-symbols-outlined text-sm">help</span>
              Help Center
            </button>
            <button
              type="button"
              onClick={logout}
              className="text-slate-400 hover:text-white px-4 py-2 transition-colors flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest w-full"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 ml-64 flex flex-col relative overflow-hidden">
        {/* Content Area */}
        <div className="p-8 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
          {/* Filter Area */}
          <section className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200/15">
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Client selection</label>
                <div className="relative">
                  <select className="w-full bg-slate-100 border-none text-sm font-medium py-2.5 px-4 rounded-lg focus:ring-2 focus:ring-blue-700/20 appearance-none text-slate-900">
                    <option>Global Enterprise Solutions (All)</option>
                    <option>Astra Financial</option>
                    <option>Vanguard Logistics</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 pointer-events-none text-sm">expand_more</span>
                </div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Date Range</label>
                <div className="flex items-center bg-slate-100 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-900">
                  <span className="material-symbols-outlined text-sm mr-2">calendar_today</span>
                  Oct 01 - Oct 31, 2023
                </div>
              </div>
              <div className="w-48">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Attribution Logic</label>
                <select className="w-full bg-slate-100 border-none text-sm font-medium py-2.5 px-4 rounded-lg text-slate-900">
                  <option>impression → reg</option>
                  <option>earliest pageload</option>
                </select>
              </div>
              <div className="w-32">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Window</label>
                <select className="w-full bg-slate-100 border-none text-sm font-medium py-2.5 px-4 rounded-lg text-slate-900">
                  <option>24h</option>
                  <option>48h</option>
                  <option>7d</option>
                </select>
              </div>
              <button
                type="button"
                className="bg-blue-700 text-white px-6 py-2.5 font-bold rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </section>

          {/* URL Classification Bento */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/15">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">URL Classification &amp; Performance</h3>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-medium"><span className="w-2 h-2 rounded-full bg-blue-700 inline-block" /> ourl</span>
                  <span className="flex items-center gap-1 text-[10px] font-medium"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> rl</span>
                  <span className="flex items-center gap-1 text-[10px] font-medium"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> dl</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 h-48">
                {distribution.map((item) => (
                  <div key={item.label} className="flex flex-col justify-end gap-2">
                    <div className={`w-full rounded-t-sm ${item.color}`} style={{ height: item.height }} />
                    <div className="text-[10px] font-bold text-center text-slate-700">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between pt-6 border-t border-slate-200/10">
                <div className="text-center">
                  <div className="text-xl font-black text-slate-900">99.2%</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Parsing Success</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-slate-900">142</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Missed Rules</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-slate-900">84%</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">AI Parameter Coverage</div>
                </div>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  AI Extraction Insights
                </h3>
                <p className="text-xs text-blue-900 leading-relaxed mb-6">
                  Deep analysis identified 428 new recurring URL patterns that are currently classified as 'Unknown'. Recommendation: Upgrade rule version to v2.5.0 to capture an additional 8.2% of attribution paths.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                    <span>UNMATCHED TOKENS</span>
                    <span>3,219</span>
                  </div>
                  <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-700 h-full" style={{ width: '22%' }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 pt-2">
                    <span>AI CONFIDENCE AVG</span>
                    <span>94.8%</span>
                  </div>
                  <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: '94%' }} />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 opacity-5">
                <span className="material-symbols-outlined text-[160px]">neurology</span>
              </div>
            </div>
          </section>

          {/* Data Table */}
          <section className="bg-white rounded-xl border border-slate-200/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    {['event_id', 'uid', 'event_name', 'ts', 'url_category', 'rl_type', 'attribution_status', 'duration'].map((header) => (
                      <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        {header}
                      </th>
                    ))}
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map((row) => (
                    <tr
                      key={row.eventId}
                      onClick={() => {
                        setSelectedRow(row);
                        setIsDetailOpen(true);
                      }}
                      className={`cursor-pointer transition hover:bg-slate-50 group ${selectedRow.eventId === row.eventId ? 'bg-blue-50/60' : 'bg-white'}`}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{row.eventId}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-900">{row.uid}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">{row.eventName}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.ts}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{row.category}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{row.type}</td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 font-bold text-[10px] ${statusClasses(row.status).split(' ')[1]}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusClasses(row.status).split(' ')[0]}`} />
                          {row.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-right text-slate-500">{row.duration}</td>
                      <td className="px-4 py-3">
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">chevron_right</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Showing 1-10 of 12,840 results</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50">Previous</button>
                <button type="button" className="px-3 py-1 bg-blue-700 text-white border border-blue-700 rounded">1</button>
                <button type="button" className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">2</button>
                <button type="button" className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">3</button>
                <span className="mx-1">...</span>
                <button type="button" className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">Next</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FAB */}
      <button
        type="button"
        className="fixed bottom-8 right-8 z-30 bg-slate-900 text-white shadow-xl px-6 py-4 rounded-full flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        <span className="text-sm font-bold">New Analysis Task</span>
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isDetailOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsDetailOpen(false)}
        aria-hidden={!isDetailOpen}
      />

      {/* Detail Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
        aria-hidden={!isDetailOpen}
        className={`fixed right-0 top-16 bottom-0 w-96 bg-white shadow-2xl border-l border-slate-200/30 z-50 overflow-y-auto transition-transform duration-300 ${
          isDetailOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 id="event-detail-title" className="text-sm font-bold uppercase tracking-widest text-slate-900">Event Detail</h2>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close Event Detail"
            >
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">link</span> URL Context
              </h3>
              <div className="p-3 bg-slate-100 rounded-lg break-all">
                <p className="text-[11px] leading-relaxed font-mono text-slate-700">{selectedDetail.url}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">rule_folder</span> Rule Analysis
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Rule Version</span>
                  <span className="font-bold">{selectedDetail.ruleVersion}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Matched Rule ID</span>
                  <span className="font-mono bg-slate-100 px-1.5 rounded">{selectedDetail.matchedRuleId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Confidence Score</span>
                  <span className="text-emerald-600 font-bold">{selectedDetail.confidenceScore}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-blue-700 uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span> AI results
              </h3>
              <div className="p-3 border-l-2 border-blue-700 bg-blue-50">
                <p className="text-[11px] text-blue-900 leading-relaxed">{selectedDetail.aiResult}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3">Extracted Parameters</h3>
              <div className="space-y-2">
                {selectedDetail.extractedParameters.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-bold text-slate-400">{key}</span>
                    <div className="flex-1 border-b border-dotted border-slate-300 h-0" />
                    <span className="text-xs font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4">Attribution Path</h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {selectedDetail.attributionPath.map(([title, detail, color]) => (
                  <div key={title} className="relative">
                    <div className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${color}`} />
                    <p className="text-xs font-bold text-slate-900">{title}</p>
                    <p className="text-[10px] text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200">
            <button
              type="button"
              className="w-full bg-slate-100 py-3 rounded-lg text-sm font-bold text-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">flag</span>
              Flag for Manual Review
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
