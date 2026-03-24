export function DashboardFilters() {
  return (
    <section className="mb-8 rounded-xl border border-slate-200/15 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-6">
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Client</label>
          <div className="relative">
            <select className="w-full appearance-none rounded-lg border-none bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-700/20">
              <option>Global Enterprise Solutions (All)</option>
              <option>Astra Financial</option>
              <option>Vanguard Logistics</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-sm text-slate-500">
              expand_more
            </span>
          </div>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Date Range</label>
          <div className="flex items-center rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900">
            <span className="material-symbols-outlined mr-2 text-sm">calendar_today</span>
            Oct 01 - Oct 31, 2023
          </div>
        </div>
        <div className="w-48">
          <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Attribution Logic</label>
          <select className="w-full rounded-lg border-none bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900">
            <option>impression → reg</option>
            <option>earliest pageload</option>
          </select>
        </div>
        <div className="w-32">
          <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Window</label>
          <select className="w-full rounded-lg border-none bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900">
            <option>24h</option>
            <option>48h</option>
            <option>7d</option>
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
    </section>
  );
}
