import type { TableRow } from './dashboardData';
import { TablePagination } from '../common/TablePagination';
import { getTimeHeaderByReportType, type ReportType } from '../reports/attributionConfig';

type DashboardTableProps = {
  reportType: ReportType;
  showTimeColumns?: boolean;
  showDurationColumn?: boolean;
  showFirstPageLoadColumns?: boolean;
  rows: TableRow[];
  selectedRow: TableRow | null;
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSelectRow: (row: TableRow) => void;
};

export function DashboardTable({
  reportType,
  showTimeColumns = true,
  showDurationColumn = true,
  showFirstPageLoadColumns = false,
  rows,
  selectedRow,
  page,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
  onSelectRow,
}: DashboardTableProps) {
  const start = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalRows === 0 ? 0 : Math.min(page * pageSize, totalRows);
  const eventTimeHeader = getTimeHeaderByReportType(reportType, 'event_time');
  const sourceTimeHeader = getTimeHeaderByReportType(reportType, 'source_time');
  const headers = [
    'uid',
    'event_name',
    ...(showTimeColumns && showFirstPageLoadColumns
      ? [sourceTimeHeader, 'first_page_load_time', eventTimeHeader, 'impression -> first_page_load', 'first_page_load -> registration']
      : showTimeColumns
        ? [eventTimeHeader, sourceTimeHeader]
        : showFirstPageLoadColumns
          ? ['first_page_load_time', 'impression -> first_page_load', 'first_page_load -> registration']
          : []),
    'referrer_type',
    'referrer_desc',
    ...(showDurationColumn ? ['duration'] : []),
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/15 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {header}
                </th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.eventId}
                onClick={() => onSelectRow(row)}
                className={`group cursor-pointer transition hover:bg-slate-50 ${
                  selectedRow?.eventId === row.eventId ? 'bg-blue-50/60' : 'bg-white'
                }`}
              >
                <td className="px-4 py-3 text-xs font-medium text-slate-900">{row.uid}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {row.eventName}
                  </span>
                </td>
                {showTimeColumns && showFirstPageLoadColumns ? (
                  <>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.sourceTs}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.firstPageLoadTs || '--'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.ts}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{row.firstPageLoadDuration || '--'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                      {row.firstPageLoadToRegistrationDuration || '--'}
                    </td>
                  </>
                ) : null}
                {showTimeColumns && !showFirstPageLoadColumns ? <td className="px-4 py-3 text-xs text-slate-500">{row.ts}</td> : null}
                {showTimeColumns && !showFirstPageLoadColumns ? (
                  <td className="px-4 py-3 text-xs text-slate-500">{row.sourceTs}</td>
                ) : null}
                {!showTimeColumns && showFirstPageLoadColumns ? (
                  <>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.firstPageLoadTs || '--'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{row.firstPageLoadDuration || '--'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                      {row.firstPageLoadToRegistrationDuration || '--'}
                    </td>
                  </>
                ) : null}
                <td className="px-4 py-3 text-xs text-slate-700">{row.category}</td>
                <td className="max-w-[280px] truncate px-4 py-3 text-xs text-slate-700" title={row.type}>
                  {row.type}
                </td>
                {showDurationColumn ? (
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{row.duration}</td>
                ) : null}
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

      <TablePagination
        summary={rows.length === 0 ? 'No rows' : `Showing ${start}-${end} of ${totalRows} results`}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
}
