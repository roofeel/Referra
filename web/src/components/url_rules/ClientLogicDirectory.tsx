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
  isLoading?: boolean;
  error?: string | null;
  selectedRowId?: string | null;
  onSelectRow?: (rowId: string) => void;
  onTestInSandbox?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  deletingRowId?: string | null;
};

export function ClientLogicDirectory({
  rows,
  isLoading = false,
  error = null,
  selectedRowId = null,
  onSelectRow,
  onTestInSandbox,
  onDeleteRow,
  deletingRowId = null,
}: ClientLogicDirectoryProps) {
  const start = rows.length > 0 ? 1 : 0;
  const end = rows.length;

  return (
    <section className="col-span-12 space-y-6">
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
        <button type="button" className="ml-auto px-4 text-xs font-medium text-blue-700 hover:underline">
          Clear Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-500">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Client Name</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Rule Name</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Last Updated</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td className="px-6 py-8 text-sm text-slate-500" colSpan={5}>
                  Loading URL rules...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-6 py-8 text-sm text-rose-600" colSpan={5}>
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-sm text-slate-500" colSpan={5}>
                  No URL rules yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = row.id === selectedRowId;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectRow?.(row.id)}
                    className={`group cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-l-4 border-blue-700 bg-blue-700/5 hover:bg-blue-700/10'
                        : 'hover:bg-slate-100/50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{row.clientName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`text-sm ${isSelected ? 'font-bold text-blue-700' : 'font-semibold text-blue-700'}`}>
                          {row.ruleName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{row.updated}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectRow?.(row.id)}
                          className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-700/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onTestInSandbox?.(row.id)}
                          className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          Test in Sandbox
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRow?.(row.id)}
                          disabled={deletingRowId === row.id}
                          className="rounded border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingRowId === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <span className="text-xs font-medium text-slate-500">
            Viewing {start}-{end} of {rows.length} url rules modules
          </span>
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
