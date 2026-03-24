export function NodeSandbox() {
  return (
    <div className="sticky top-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
        <h2 className="text-xs font-bold uppercase tracking-wider">Node.js Sandbox</h2>
        <span className="material-symbols-outlined text-sm text-slate-400">terminal</span>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <label htmlFor="ourl-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Input String (ourl)
          </label>
          <textarea
            id="ourl-input"
            className="h-32 w-full resize-none rounded-lg border-none bg-slate-100 p-3 font-mono text-xs placeholder:text-slate-400 focus:ring-1 focus:ring-blue-700"
            placeholder="https://astrazeneca.com/global?gclid=az_8892..."
          />
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-800"
        >
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          Execute Async
        </button>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolved Object</span>
            <span className="text-[10px] font-bold uppercase text-emerald-500">Success</span>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            <pre className="font-mono text-[10px] text-emerald-400">{`{
  channel: 'Paid Search',
  intent: 'High',
  provider: 'Google',
  latency_ms: 0.42
}`}</pre>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-100 bg-blue-50/50 p-4">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-lg text-blue-500">info</span>
          <p className="text-[11px] leading-relaxed text-blue-700">
            Node.js 18.x runtime. Built-in modules <strong>url</strong>, <strong>crypto</strong>, and <strong>path</strong> are available.
          </p>
        </div>
      </div>
    </div>
  );
}
