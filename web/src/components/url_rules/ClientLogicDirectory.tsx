import type { ClientRow, ClientStatus } from './urlRulesData';

function StatusBadge({ status }: { status: ClientStatus }) {
  const isActive = status === 'Active';
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

type ClientLogicDirectoryProps = {
  rows: ClientRow[];
};

export function ClientLogicDirectory({ rows }: ClientLogicDirectoryProps) {
  return (
    <section className="col-span-12 space-y-6 lg:col-span-9">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 p-2">
        <div className="mr-2 flex items-center gap-2 border-r border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <span className="material-symbols-outlined text-sm">filter_list</span>
          Directory
        </div>
        <select className="min-w-[140px] rounded border-none bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-700">
          <option>Status: All Live</option>
          <option>Active</option>
          <option>Draft</option>
          <option>Archived</option>
        </select>
        <select className="min-w-[140px] rounded border-none bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-700">
          <option>Region: Global</option>
          <option>North America</option>
          <option>EMEA</option>
          <option>APAC</option>
        </select>
        <button type="button" className="ml-auto px-4 text-xs font-medium text-blue-700 hover:underline">
          Clear Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-500">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Client Name</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Last Updated</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Function Preview (Node.js)</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr
                key={row.name}
                className={`group cursor-pointer transition-colors ${
                  row.selected
                    ? 'border-l-4 border-blue-700 bg-blue-700/5 hover:bg-blue-700/10'
                    : 'hover:bg-slate-100/50'
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded text-xs font-bold ${row.shortNameClasses}`}>
                      {row.shortName}
                    </div>
                    <div className={`text-sm ${row.selected ? 'font-bold text-blue-700' : 'font-semibold text-blue-700'}`}>
                      {row.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">{row.updated}</td>
                <td className="px-6 py-4">
                  <div className={`max-w-md rounded border p-2 ${row.selected ? 'border-blue-700/20 bg-white shadow-sm' : 'border-slate-200 bg-slate-100'}`}>
                    <code className={`block truncate font-mono text-[10px] ${row.selected ? 'text-blue-700' : 'text-slate-600'}`}>
                      {row.preview}
                    </code>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {row.selected ? (
                    <button type="button" className="rounded bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Open Editor
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded px-3 py-1 text-xs font-bold text-blue-700 opacity-0 transition-all hover:bg-blue-700/5 group-hover:opacity-100"
                    >
                      Edit Logic
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <span className="text-xs font-medium text-slate-500">Viewing 1-3 of 154 url rules modules</span>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded border border-slate-300 p-2 transition-all hover:bg-slate-100 active:scale-90">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white p-2 shadow-sm transition-all hover:bg-slate-100 active:scale-90"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
