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

export default function NonAttributedReportsDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const [payload, setPayload] = useState<ReportDetailResponse | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftCohortMode, setDraftCohortMode] = useState<'non-cohort' | 'cohort'>('non-cohort');
  const [draftWindowHours, setDraftWindowHours] = useState<'12' | '24' | '48' | '72'>('24');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedCohortMode, setAppliedCohortMode] = useState<'non-cohort' | 'cohort'>('non-cohort');
  const [appliedWindowHours, setAppliedWindowHours] = useState<'12' | '24' | '48' | '72'>('24');
  const pageSize = 50;

  useEffect(() => {
    setPage(1);
    setDraftStartDate('');
    setDraftEndDate('');
    setDraftCohortMode('non-cohort');
    setDraftWindowHours('24');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedCohortMode('non-cohort');
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
        const options: Parameters<typeof api.nonAttributedReports.detail>[1] = { page, pageSize };
        if (appliedStartDate) options.startDate = appliedStartDate;
        if (appliedEndDate) options.endDate = appliedEndDate;
        options.cohortMode = appliedCohortMode;
        options.windowHours = Number(appliedWindowHours);

        const data = await api.nonAttributedReports.detail(reportId, options);
        if (!alive) return;
        setPayload(data);
        setSelectedRow(data.rows[0] || null);
        setIsDetailOpen(false);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load non-attributed report detail');
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [appliedCohortMode, appliedEndDate, appliedStartDate, appliedWindowHours, page, pageSize, reportId]);

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
      <AppSidebar activeItem="non-attributed-reports" ariaLabel="Non-Attributed Reports Detail Navigation" />

      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Non-Attributed Report Detail</p>
            <h1 className="text-lg font-bold text-slate-900">{reportId ? `Report #${reportId}` : 'Report Detail'}</h1>
          </div>
          <Link
            to="/non-attributed-reports"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Non-Attributed Reports
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200/70 bg-white p-8 text-sm text-slate-500">
              Loading non-attributed report detail...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-sm text-red-700">{error}</div>
          ) : payload ? (
            <>
              <DashboardFilters
                clientName={payload.clientName}
                reportType={payload.reportType}
                startDate={draftStartDate}
                endDate={draftEndDate}
                cohortMode={draftCohortMode}
                windowHours={draftWindowHours}
                onStartDateChange={setDraftStartDate}
                onEndDateChange={setDraftEndDate}
                onCohortModeChange={setDraftCohortMode}
                onWindowHoursChange={setDraftWindowHours}
                onApply={() => {
                  setAppliedStartDate(draftStartDate);
                  setAppliedEndDate(draftEndDate);
                  setAppliedCohortMode(draftCohortMode);
                  setAppliedWindowHours(draftWindowHours);
                  setPage(1);
                }}
                onReset={() => {
                  setDraftStartDate('');
                  setDraftEndDate('');
                  setDraftCohortMode('non-cohort');
                  setDraftWindowHours('24');
                  setAppliedStartDate('');
                  setAppliedEndDate('');
                  setAppliedCohortMode('non-cohort');
                  setAppliedWindowHours('24');
                  setPage(1);
                }}
              />
              <DashboardMetrics metrics={payload.metrics} />
              <DashboardInsights referrerTypeStats={payload.referrerTypeStats} />
              <DashboardTable
                reportType={payload.reportType}
                showTimeColumns={false}
                showDurationColumn={false}
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
