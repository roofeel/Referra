import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppSidebar } from '../components/common/AppSidebar';
import { DashboardDetailDrawer } from '../components/dashboard/DashboardDetailDrawer';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardInsights } from '../components/dashboard/DashboardInsights';
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { DashboardTable } from '../components/dashboard/DashboardTable';
import type { TableRow } from '../components/dashboard/dashboardData';
import { api } from '../service';
import type { ReportDetailResponse } from '../service/reports';

export default function ReportsDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const [payload, setPayload] = useState<ReportDetailResponse | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftWindowHours, setDraftWindowHours] = useState<'24' | '48' | '72'>('24');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedWindowHours, setAppliedWindowHours] = useState<'24' | '48' | '72'>('24');
  const pageSize = 50;

  useEffect(() => {
    setPage(1);
    setDraftStartDate('');
    setDraftEndDate('');
    setDraftWindowHours('24');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedWindowHours('24');
  }, [reportId]);

  useEffect(() => {
    if (!reportId) {
      setError('Missing report id');
      setIsLoading(false);
      return;
    }

    let alive = true;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const options: Parameters<typeof api.reports.detail>[1] = { page, pageSize };
        if (appliedStartDate) options.startDate = appliedStartDate;
        if (appliedEndDate) options.endDate = appliedEndDate;
        options.windowHours = Number(appliedWindowHours);

        const data = await api.reports.detail(reportId, options);
        if (!alive) return;
        setPayload(data);
        setSelectedRow(data.rows[0] || null);
        setIsDetailOpen(false);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load report detail');
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [appliedEndDate, appliedStartDate, appliedWindowHours, page, pageSize, reportId]);

  const selectedDetail = selectedRow ? payload?.eventDetails[selectedRow.eventId] || null : null;

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
    <div className="flex h-screen overflow-hidden bg-[#f2f4f6] text-slate-900 antialiased">
      <AppSidebar activeItem="reports" ariaLabel="Reports Detail Navigation" />

      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Report Detail</p>
            <h1 className="text-lg font-bold text-slate-900">{reportId ? `Report #${reportId}` : 'Report Detail'}</h1>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Reports
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200/70 bg-white p-8 text-sm text-slate-500">
              Loading report detail...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-sm text-red-700">{error}</div>
          ) : payload ? (
            <>
              <DashboardFilters
                clientName={payload.clientName}
                startDate={draftStartDate}
                endDate={draftEndDate}
                windowHours={draftWindowHours}
                onStartDateChange={setDraftStartDate}
                onEndDateChange={setDraftEndDate}
                onWindowHoursChange={setDraftWindowHours}
                onApply={() => {
                  setAppliedStartDate(draftStartDate);
                  setAppliedEndDate(draftEndDate);
                  setAppliedWindowHours(draftWindowHours);
                  setPage(1);
                }}
                onReset={() => {
                  setDraftStartDate('');
                  setDraftEndDate('');
                  setDraftWindowHours('24');
                  setAppliedStartDate('');
                  setAppliedEndDate('');
                  setAppliedWindowHours('24');
                  setPage(1);
                }}
              />
              <DashboardMetrics metrics={payload.metrics} />
              <DashboardInsights
                distribution={payload.distribution}
                insights={payload.insights}
                referrerTypeStats={payload.referrerTypeStats}
              />
              <DashboardTable
                rows={payload.rows}
                selectedRow={selectedRow}
                page={payload.pagination.page}
                totalPages={payload.pagination.totalPages}
                totalRows={payload.pagination.totalRows}
                pageSize={payload.pagination.pageSize}
                onPageChange={(nextPage) => {
                  if (nextPage === page) return;
                  setPage(nextPage);
                }}
                onSelectRow={(row) => {
                  setSelectedRow(row);
                  setIsDetailOpen(true);
                }}
              />
            </>
          ) : (
            <div className="rounded-xl border border-slate-200/70 bg-white p-8 text-sm text-slate-500">No data</div>
          )}
        </div>
      </main>

      <DashboardDetailDrawer detail={selectedDetail} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </div>
  );
}
