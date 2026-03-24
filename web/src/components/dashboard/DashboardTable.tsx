import type { TableRow } from './dashboardData';
import { statusClasses, tableRows } from './dashboardData';
import { TablePagination } from '../common/TablePagination';

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
              {['event_id', 'uid', 'event_name', 'ts', 'url_category', 'rl_type', 'duration'].map(
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

      <TablePagination summary="Showing 1-10 of 12,840 results" />
    </section>
  );
}
