import type { TableRow } from './dashboardData';
import { statusClasses, tableRows } from './dashboardData';

type DashboardTableProps = {
  selectedRow: TableRow;
  onSelectRow: (row: TableRow) => void;
};

export function DashboardTable({ selectedRow, onSelectRow }: DashboardTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/15 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              {['event_id', 'uid', 'event_name', 'ts', 'url_category', 'rl_type', 'attribution_status', 'duration'].map(
                (header) => (
                  <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ),
              )}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableRows.map((row) => (
              <tr
                key={row.eventId}
                onClick={() => onSelectRow(row)}
                className={`group cursor-pointer transition hover:bg-slate-50 ${
                  selectedRow.eventId === row.eventId ? 'bg-blue-50/60' : 'bg-white'
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.eventId}</td>
                <td className="px-4 py-3 text-xs font-medium text-slate-900">{row.uid}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {row.eventName}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.ts}</td>
                <td className="px-4 py-3 text-xs text-slate-700">{row.category}</td>
                <td className="px-4 py-3 text-xs text-slate-700">{row.type}</td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold ${statusClasses(row.status).split(' ')[1]}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${statusClasses(row.status).split(' ')[0]}`} />
                    {row.status}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{row.duration}</td>
                <td className="px-4 py-3">
                  <span className="material-symbols-outlined text-slate-300 transition-colors group-hover:text-blue-600">
                    chevron_right
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-xs font-medium text-slate-500">
        <span>Showing 1-10 of 12,840 results</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button type="button" className="rounded border border-blue-700 bg-blue-700 px-3 py-1 text-white">
            1
          </button>
          <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50">
            2
          </button>
          <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50">
            3
          </button>
          <span className="mx-1">...</span>
          <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
