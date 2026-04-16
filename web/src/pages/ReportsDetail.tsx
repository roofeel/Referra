import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { AppSidebar } from '../components/common/AppSidebar';
import { DashboardDetailDrawer } from '../components/dashboard/DashboardDetailDrawer';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardInsights } from '../components/dashboard/DashboardInsights';
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { DashboardTable } from '../components/dashboard/DashboardTable';
import { AttachRelatedEventsDrawer } from '../components/reports/AttachRelatedEventsDrawer';
import type { TableRow } from '../components/dashboard/dashboardData';
import { api } from '../service';
import { buildApiUrl } from '../service/http';
import type { ReportDetailResponse } from '../service/reports';

export default function ReportsDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const [payload, setPayload] = useState<ReportDetailResponse | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAttachDrawerOpen, setIsAttachDrawerOpen] = useState(false);
  const [isAttachingRelatedEvents, setIsAttachingRelatedEvents] = useState(false);
  const [page, setPage] = useState(1);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftCohortMode, setDraftCohortMode] = useState<'non-cohort' | 'cohort'>('non-cohort');
  const [draftWindowHours, setDraftWindowHours] = useState<'12' | '24' | '48' | '72'>('24');
  const [draftImpressionToFirstPageLoadHours, setDraftImpressionToFirstPageLoadHours] = useState<'' | '12' | '24' | '48' | '72'>('');
  const [draftFirstPageLoadToRegistrationHours, setDraftFirstPageLoadToRegistrationHours] = useState<
    '' | '12' | '24' | '48' | '72'
  >('');
  const [draftDurationFilterOperator, setDraftDurationFilterOperator] = useState<'and' | 'or'>('and');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedCohortMode, setAppliedCohortMode] = useState<'non-cohort' | 'cohort'>('non-cohort');
  const [appliedWindowHours, setAppliedWindowHours] = useState<'12' | '24' | '48' | '72'>('24');
  const [appliedImpressionToFirstPageLoadHours, setAppliedImpressionToFirstPageLoadHours] = useState<
    '' | '12' | '24' | '48' | '72'
  >('');
  const [appliedFirstPageLoadToRegistrationHours, setAppliedFirstPageLoadToRegistrationHours] = useState<
    '' | '12' | '24' | '48' | '72'
  >('');
  const [appliedDurationFilterOperator, setAppliedDurationFilterOperator] = useState<'and' | 'or'>('and');
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 50;
  const toast = useToast();

  useEffect(() => {
    setPage(1);
    setDraftStartDate('');
    setDraftEndDate('');
    setDraftCohortMode('non-cohort');
    setDraftWindowHours('24');
    setDraftImpressionToFirstPageLoadHours('');
    setDraftFirstPageLoadToRegistrationHours('');
    setDraftDurationFilterOperator('and');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedCohortMode('non-cohort');
    setAppliedWindowHours('24');
    setAppliedImpressionToFirstPageLoadHours('');
    setAppliedFirstPageLoadToRegistrationHours('');
    setAppliedDurationFilterOperator('and');
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
        options.cohortMode = appliedCohortMode;
        options.windowHours = Number(appliedWindowHours);
        if (appliedImpressionToFirstPageLoadHours) {
          options.impressionToFirstPageLoadHours = Number(appliedImpressionToFirstPageLoadHours);
        }
        if (appliedFirstPageLoadToRegistrationHours) {
          options.firstPageLoadToRegistrationHours = Number(appliedFirstPageLoadToRegistrationHours);
        }
        options.durationFilterOperator = appliedDurationFilterOperator;

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
  }, [
    appliedCohortMode,
    appliedDurationFilterOperator,
    appliedEndDate,
    appliedFirstPageLoadToRegistrationHours,
    appliedImpressionToFirstPageLoadHours,
    appliedStartDate,
    appliedWindowHours,
    page,
    pageSize,
    refreshKey,
    reportId,
  ]);

  const selectedDetail = selectedRow ? payload?.eventDetails[selectedRow.eventId] || null : null;
  const uidDownloadHref = reportId ? buildApiUrl(`/api/reports/${reportId}/uid-download`) : '';

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAttachDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <span className="material-symbols-outlined text-base">link</span>
              Attach Related Events
            </button>

          </div>
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
                reportType={payload.reportType}
                startDate={draftStartDate}
                endDate={draftEndDate}
                cohortMode={draftCohortMode}
                windowHours={draftWindowHours}
                showFirstPageLoadFilters={payload.hasRelatedEventFieldMappings}
                impressionToFirstPageLoadHours={draftImpressionToFirstPageLoadHours}
                firstPageLoadToRegistrationHours={draftFirstPageLoadToRegistrationHours}
                durationFilterOperator={draftDurationFilterOperator}
                onStartDateChange={setDraftStartDate}
                onEndDateChange={setDraftEndDate}
                onCohortModeChange={setDraftCohortMode}
                onWindowHoursChange={setDraftWindowHours}
                onImpressionToFirstPageLoadHoursChange={setDraftImpressionToFirstPageLoadHours}
                onFirstPageLoadToRegistrationHoursChange={setDraftFirstPageLoadToRegistrationHours}
                onDurationFilterOperatorChange={setDraftDurationFilterOperator}
                onApply={() => {
                  setAppliedStartDate(draftStartDate);
                  setAppliedEndDate(draftEndDate);
                  setAppliedCohortMode(draftCohortMode);
                  setAppliedWindowHours(draftWindowHours);
                  setAppliedImpressionToFirstPageLoadHours(draftImpressionToFirstPageLoadHours);
                  setAppliedFirstPageLoadToRegistrationHours(draftFirstPageLoadToRegistrationHours);
                  setAppliedDurationFilterOperator(draftDurationFilterOperator);
                  setPage(1);
                }}
                onReset={() => {
                  setDraftStartDate('');
                  setDraftEndDate('');
                  setDraftCohortMode('non-cohort');
                  setDraftWindowHours('24');
                  setDraftImpressionToFirstPageLoadHours('');
                  setDraftFirstPageLoadToRegistrationHours('');
                  setDraftDurationFilterOperator('and');
                  setAppliedStartDate('');
                  setAppliedEndDate('');
                  setAppliedCohortMode('non-cohort');
                  setAppliedWindowHours('24');
                  setAppliedImpressionToFirstPageLoadHours('');
                  setAppliedFirstPageLoadToRegistrationHours('');
                  setAppliedDurationFilterOperator('and');
                  setPage(1);
                }}
              />
              <DashboardMetrics metrics={payload.metrics} />
              <DashboardInsights referrerTypeStats={payload.referrerTypeStats} />
              <DashboardTable
                reportType={payload.reportType}
                showFirstPageLoadColumns={payload.hasRelatedEventFieldMappings}
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
      <AttachRelatedEventsDrawer
        isOpen={isAttachDrawerOpen}
        uidDownloadHref={uidDownloadHref}
        onClose={() => {
          if (isAttachingRelatedEvents) return;
          setIsAttachDrawerOpen(false);
        }}
        onSubmit={async (attachPayload) => {
          if (!reportId) {
            throw new Error('Missing report id');
          }
          try {
            setIsAttachingRelatedEvents(true);
            const result = await api.reports.attachRelatedEvents(reportId, attachPayload);
            toast.success(
              `Attached ${result.matchedEvents} events to ${result.matchedRows}/${result.rowsUpdated} rows`,
            );
            setRefreshKey((prev) => prev + 1);
          } catch (attachError) {
            const message = attachError instanceof Error ? attachError.message : 'Attach related events failed';
            toast.error(message);
            throw attachError;
          } finally {
            setIsAttachingRelatedEvents(false);
          }
        }}
      />
    </div>
  );
}
