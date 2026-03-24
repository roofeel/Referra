const sourceCode = `async function categorizeFunnel(ourl) {
  const url = new URL(ourl);
  const source = url.searchParams.get('utm_source');

  if (source === 'google') {
    return {
      channel: 'Search',
      type: 'Paid'
    };
  }

  return { channel: 'Direct' };
}`;

export function LogicDrawer() {
  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex w-[500px] translate-x-0 flex-col border-l border-slate-200 bg-white shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Url Rules</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">AstraZeneca Global</h2>
        </div>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200">
          <span className="material-symbols-outlined text-slate-500">close</span>
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="rounded-lg border border-slate-200 bg-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Version</span>
            <span className="rounded bg-blue-700/10 px-2 py-0.5 text-[10px] font-bold text-blue-700">v2.4.12-prod</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last deployed by</span>
              <span className="font-semibold text-slate-900">Adrian Vane</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Timestamp</span>
              <span className="font-semibold text-slate-900">Today, 11:42 AM</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">JavaScript Source</label>
            <button type="button" className="text-[10px] font-bold text-blue-700 hover:underline">
              Format Code
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2">
              <span className="material-symbols-outlined text-sm text-amber-400">javascript</span>
              <span className="font-mono text-[10px] text-slate-400">index.js</span>
            </div>
            <div className="p-4 font-mono text-[11px] leading-relaxed text-slate-300">
              <pre className="overflow-x-auto"><code>{sourceCode}</code></pre>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Environment Variables</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-slate-200 bg-slate-100 p-3">
              <div className="mb-1 text-[9px] text-slate-500">LOG_LEVEL</div>
              <div className="text-xs font-mono font-bold">&quot;info&quot;</div>
            </div>
            <div className="rounded border border-slate-200 bg-slate-100 p-3">
              <div className="mb-1 text-[9px] text-slate-500">RETRY_COUNT</div>
              <div className="text-xs font-mono font-bold">3</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 bg-white p-6">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-800 hover:shadow-xl"
        >
          <span className="material-symbols-outlined text-lg">rocket_launch</span>
          Save &amp; Deploy Logic
        </button>
        <button
          type="button"
          className="w-full rounded bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
        >
          Draft as New Version
        </button>
      </div>
    </div>
  );
}
