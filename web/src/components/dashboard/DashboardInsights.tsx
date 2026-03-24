import { distribution } from './dashboardData';

export function DashboardInsights() {
  return (
    <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200/15 bg-white p-6 lg:col-span-2">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900">
            URL Classification &amp; Performance
          </h3>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-700" />
              ourl
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-300" />
              rl
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
              dl
            </span>
          </div>
        </div>
        <div className="grid h-48 grid-cols-4 gap-4">
          {distribution.map((item) => (
            <div key={item.label} className="flex flex-col justify-end gap-2">
              <div className={`w-full rounded-t-sm ${item.color}`} style={{ height: item.height }} />
              <div className="text-center text-[10px] font-bold text-slate-700">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between border-t border-slate-200/10 pt-6">
          <div className="text-center">
            <div className="text-xl font-black text-slate-900">99.2%</div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Parsing Success</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-slate-900">142</div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Missed Rules</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-slate-900">84%</div>
            <div className="text-[10px] font-bold uppercase text-slate-500">AI Parameter Coverage</div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-6">
        <div className="relative z-10">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-700">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            AI Extraction Insights
          </h3>
          <p className="mb-6 text-xs leading-relaxed text-blue-900">
            Deep analysis identified 428 new recurring URL patterns that are currently classified as 'Unknown'.
            Recommendation: Upgrade rule version to v2.5.0 to capture an additional 8.2% of attribution paths.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
              <span>UNMATCHED TOKENS</span>
              <span>3,219</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div className="h-full bg-blue-700" style={{ width: '22%' }} />
            </div>
            <div className="flex items-center justify-between pt-2 text-[10px] font-bold text-slate-700">
              <span>AI CONFIDENCE AVG</span>
              <span>94.8%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div className="h-full bg-emerald-500" style={{ width: '94%' }} />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-8 -right-8 opacity-5">
          <span className="material-symbols-outlined text-[160px]">neurology</span>
        </div>
      </div>
    </section>
  );
}
