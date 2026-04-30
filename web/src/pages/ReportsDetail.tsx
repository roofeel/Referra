import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import type { ReportDetailResponse, ReportExportFieldsResponse, ReportExportJobResponse } from '../service/reports';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ReportsDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const [payload, setPayload] = useState<ReportDetailResponse | null>(null);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAttachDrawerOpen, setIsAttachDrawerOpen] = useState(false);
  const [isAttachingRelatedEvents, setIsAttachingRelatedEvents] = useState(false);
  const [exportFields, setExportFields] = useState<ReportExportFieldsResponse | null>(null);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>([]);
  const [exportFieldsLoading, setExportFieldsLoading] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [exportJob, setExportJob] = useState<ReportExportJobResponse | null>(null);
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);
  const [generatingJourneyEventId, setGeneratingJourneyEventId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftReferrerType, setDraftReferrerType] = useState('');
  const [draftCohortMode, setDraftCohortMode] = useState<'non-cohort' | 'cohort'>('non-cohort');
  const [draftBaseDurationEnabled, setDraftBaseDurationEnabled] = useState(true);
  const [draftWindowHours, setDraftWindowHours] = useState<'12' | '24' | '48' | '72'>('24');
  const [draftImpressionToFirstPageLoadEnabled, setDraftImpressionToFirstPageLoadEnabled] = useState(false);
  const [draftImpressionToFirstPageLoadHours, setDraftImpressionToFirstPageLoadHours] = useState<'' | '12' | '24' | '48' | '72'>('');
  const [draftFirstPageLoadToRegistrationEnabled, setDraftFirstPageLoadToRegistrationEnabled] = useState(false);
  const [draftFirstPageLoadToRegistrationHours, setDraftFirstPageLoadToRegistrationHours] = useState<
    '' | '12' | '24' | '48' | '72'
  >('');
  const [draftDurationFilterOperator, setDraftDurationFilterOperator] = useState<'and' | 'or'>('and');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedReferrerType, setAppliedReferrerType] = useState('');
  const [appliedCohortMode, setAppliedCohortMode] = useState<'non-cohort' | 'cohort'>('non-cohort');
  const [appliedBaseDurationEnabled, setAppliedBaseDurationEnabled] = useState(true);
  const [appliedWindowHours, setAppliedWindowHours] = useState<'12' | '24' | '48' | '72'>('24');
  const [appliedImpressionToFirstPageLoadEnabled, setAppliedImpressionToFirstPageLoadEnabled] = useState(false);
  const [appliedImpressionToFirstPageLoadHours, setAppliedImpressionToFirstPageLoadHours] = useState<
    '' | '12' | '24' | '48' | '72'
  >('');
  const [appliedFirstPageLoadToRegistrationEnabled, setAppliedFirstPageLoadToRegistrationEnabled] = useState(false);
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
    setDraftReferrerType('');
    setDraftCohortMode('non-cohort');
    setDraftBaseDurationEnabled(true);
    setDraftWindowHours('24');
    setDraftImpressionToFirstPageLoadEnabled(false);
    setDraftImpressionToFirstPageLoadHours('');
    setDraftFirstPageLoadToRegistrationEnabled(false);
    setDraftFirstPageLoadToRegistrationHours('');
    setDraftDurationFilterOperator('and');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedReferrerType('');
    setAppliedCohortMode('non-cohort');
    setAppliedBaseDurationEnabled(true);
    setAppliedWindowHours('24');
    setAppliedImpressionToFirstPageLoadEnabled(false);
    setAppliedImpressionToFirstPageLoadHours('');
    setAppliedFirstPageLoadToRegistrationEnabled(false);
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
        if (appliedReferrerType) options.referrerType = appliedReferrerType;
        options.cohortMode = appliedCohortMode;
        if (appliedBaseDurationEnabled) {
          options.windowHours = Number(appliedWindowHours);
        }
        if (appliedImpressionToFirstPageLoadEnabled) {
          options.impressionToFirstPageLoadHours = Number(appliedImpressionToFirstPageLoadHours || '24');
        }
        if (appliedFirstPageLoadToRegistrationEnabled) {
          options.firstPageLoadToRegistrationHours = Number(appliedFirstPageLoadToRegistrationHours || '24');
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
    appliedBaseDurationEnabled,
    appliedDurationFilterOperator,
    appliedEndDate,
    appliedFirstPageLoadToRegistrationEnabled,
    appliedFirstPageLoadToRegistrationHours,
    appliedImpressionToFirstPageLoadEnabled,
    appliedImpressionToFirstPageLoadHours,
    appliedReferrerType,
    appliedStartDate,
    appliedWindowHours,
    page,
    pageSize,
    refreshKey,
    reportId,
  ]);

  const selectedDetail = selectedRow ? payload?.eventDetails[selectedRow.eventId] || null : null;
  const isGeneratingUserJourney = Boolean(selectedRow?.eventId && generatingJourneyEventId === selectedRow.eventId);
  const reportTitle = payload?.reportName?.trim() || 'Report Detail';
  const referrerTypeOptions = payload
    ? payload.referrerTypeStats.map((item) => (item.referrerType || '').trim()).filter((item) => Boolean(item))
    : [];
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

  const handleGenerateUserJourney = async () => {
    if (!reportId) {
      toast.error('Missing report id');
      return;
    }
    if (!selectedRow?.eventId) {
      toast.error('Missing selected event');
      return;
    }

    try {
      setGeneratingJourneyEventId(selectedRow.eventId);
      const start = await api.reports.generateUserJourney(reportId, selectedRow.eventId);
      const timeoutMs = 2 * 60 * 1000;
      const pollIntervalMs = 1500;
      const deadline = Date.now() + timeoutMs;
      let status = await api.reports.getGenerateUserJourneyJobStatus(reportId, selectedRow.eventId, start.jobId);

      while (status.status === 'pending' || status.status === 'running') {
        if (Date.now() >= deadline) {
          throw new Error('Generate user journey is still running, please retry in a moment');
        }
        await sleep(pollIntervalMs);
        status = await api.reports.getGenerateUserJourneyJobStatus(reportId, selectedRow.eventId, start.jobId);
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Generate user journey failed');
      }

      if (!status.userJourneyDoc) {
        throw new Error('Generate user journey returned empty content');
      }

      setPayload((prev) => {
        if (!prev) return prev;
        const current = prev.eventDetails[status.rawId];
        if (!current) return prev;
        return {
          ...prev,
          eventDetails: {
            ...prev.eventDetails,
            [status.rawId]: {
              ...current,
              userJourneyDoc: status.userJourneyDoc,
            },
          },
        };
      });
      toast.success('User journey generated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generate user journey failed';
      toast.error(message);
    } finally {
      setGeneratingJourneyEventId(null);
    }
  };

  async function openExportDrawer() {
    if (!reportId) {
      toast.error('Missing report id');
      return;
    }
    setIsExportDrawerOpen(true);
    setExportJob(null);
    setExportFields(null);
    setSelectedExportFields([]);
    setExportFieldsLoading(true);
    try {
      const fields = await api.reports.getExportFields(reportId);
      setExportFields(fields);
      setSelectedExportFields([
        ...fields.fixedFields,
        ...fields.referrerRawFields.map((key) => `raw.${key}`),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load export fields');
      setIsExportDrawerOpen(false);
    } finally {
      setExportFieldsLoading(false);
    }
  }

  function toggleExportField(field: string) {
    setSelectedExportFields((prev) => (prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]));
  }

  async function pollExportJob(targetReportId: string, jobId: string) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const job = await api.reports.getExportJobStatus(targetReportId, jobId);
      setExportJob(job);
      if (job.status === 'completed' || job.status === 'failed') return job;
      await sleep(2000);
    }
    return null;
  }

  async function handleCreateExportJob() {
    if (!reportId) {
      toast.error('Missing report id');
      return;
    }
    if (selectedExportFields.length === 0) {
      toast.error('Please select at least one export field');
      return;
    }
    try {
      setExportSubmitting(true);
      const job = await api.reports.createExportJob(reportId, { selectedFields: selectedExportFields });
      setExportJob(job);
      const latest = await pollExportJob(reportId, job.jobId);
      if (!latest) {
        toast.error('Export job timeout, please try again later');
        return;
      }
      if (latest.status === 'failed') {
        toast.error(latest.error || 'Export failed');
        return;
      }
      if (latest.downloadUrl) {
        window.open(latest.downloadUrl, '_blank', 'noopener,noreferrer');
        toast.success('Export is ready');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export');
    } finally {
      setExportSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f4f6] text-slate-900 antialiased">
      <AppSidebar activeItem="reports" ariaLabel="Reports Detail Navigation" />

      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Report Detail</p>
            <h1 className="text-lg font-bold text-slate-900">{reportTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAttachDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
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
                referrerTypeOptions={referrerTypeOptions}
                startDate={draftStartDate}
                endDate={draftEndDate}
                referrerType={draftReferrerType}
                cohortMode={draftCohortMode}
                baseDurationEnabled={draftBaseDurationEnabled}
                windowHours={draftWindowHours}
                showFirstPageLoadFilters={payload.hasRelatedEventFieldMappings}
                impressionToFirstPageLoadEnabled={draftImpressionToFirstPageLoadEnabled}
                impressionToFirstPageLoadHours={draftImpressionToFirstPageLoadHours}
                firstPageLoadToRegistrationEnabled={draftFirstPageLoadToRegistrationEnabled}
                firstPageLoadToRegistrationHours={draftFirstPageLoadToRegistrationHours}
                durationFilterOperator={draftDurationFilterOperator}
                onStartDateChange={setDraftStartDate}
                onEndDateChange={setDraftEndDate}
                onReferrerTypeChange={setDraftReferrerType}
                onCohortModeChange={setDraftCohortMode}
                onBaseDurationEnabledChange={setDraftBaseDurationEnabled}
                onWindowHoursChange={setDraftWindowHours}
                onImpressionToFirstPageLoadEnabledChange={setDraftImpressionToFirstPageLoadEnabled}
                onImpressionToFirstPageLoadHoursChange={setDraftImpressionToFirstPageLoadHours}
                onFirstPageLoadToRegistrationEnabledChange={setDraftFirstPageLoadToRegistrationEnabled}
                onFirstPageLoadToRegistrationHoursChange={setDraftFirstPageLoadToRegistrationHours}
                onDurationFilterOperatorChange={setDraftDurationFilterOperator}
                onApply={() => {
                  setAppliedStartDate(draftStartDate);
                  setAppliedEndDate(draftEndDate);
                  setAppliedReferrerType(draftReferrerType);
                  setAppliedCohortMode(draftCohortMode);
                  setAppliedBaseDurationEnabled(draftBaseDurationEnabled);
                  setAppliedWindowHours(draftWindowHours);
                  setAppliedImpressionToFirstPageLoadEnabled(draftImpressionToFirstPageLoadEnabled);
                  setAppliedImpressionToFirstPageLoadHours(draftImpressionToFirstPageLoadHours);
                  setAppliedFirstPageLoadToRegistrationEnabled(draftFirstPageLoadToRegistrationEnabled);
                  setAppliedFirstPageLoadToRegistrationHours(draftFirstPageLoadToRegistrationHours);
                  setAppliedDurationFilterOperator(draftDurationFilterOperator);
                  setPage(1);
                }}
                onExport={() => {
                  void openExportDrawer();
                }}
                onReset={() => {
                  setDraftStartDate('');
                  setDraftEndDate('');
                  setDraftReferrerType('');
                  setDraftCohortMode('non-cohort');
                  setDraftBaseDurationEnabled(true);
                  setDraftWindowHours('24');
                  setDraftImpressionToFirstPageLoadEnabled(false);
                  setDraftImpressionToFirstPageLoadHours('');
                  setDraftFirstPageLoadToRegistrationEnabled(false);
                  setDraftFirstPageLoadToRegistrationHours('');
                  setDraftDurationFilterOperator('and');
                  setAppliedStartDate('');
                  setAppliedEndDate('');
                  setAppliedReferrerType('');
                  setAppliedCohortMode('non-cohort');
                  setAppliedBaseDurationEnabled(true);
                  setAppliedWindowHours('24');
                  setAppliedImpressionToFirstPageLoadEnabled(false);
                  setAppliedImpressionToFirstPageLoadHours('');
                  setAppliedFirstPageLoadToRegistrationEnabled(false);
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

      <DashboardDetailDrawer
        detail={selectedDetail}
        canGenerateUserJourney={Boolean(reportId && selectedRow?.eventId)}
        isGeneratingUserJourney={isGeneratingUserJourney}
        onGenerateUserJourney={() => {
          void handleGenerateUserJourney();
        }}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
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
      {isExportDrawerOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setIsExportDrawerOpen(false)} aria-hidden="true" />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Export CSV</p>
                <h3 className="text-sm font-bold text-slate-900">{reportTitle}</h3>
              </div>
              <button
                type="button"
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setIsExportDrawerOpen(false)}
                aria-label="Close export drawer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-y-auto p-4">
              {exportFieldsLoading ? <p className="text-sm text-slate-500">Loading export fields...</p> : null}
              {!exportFieldsLoading && exportFields ? (
                <>
                  <p className="mb-2 text-xs font-semibold text-slate-700">Report fields</p>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {exportFields.fixedFields.map((field) => (
                      <label key={field} className="flex items-center gap-2 rounded border border-slate-200 p-2 text-xs">
                        <input type="checkbox" checked={selectedExportFields.includes(field)} onChange={() => toggleExportField(field)} />
                        <span>{field}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mb-2 text-xs font-semibold text-slate-700">ReferrerRaw JSON fields</p>
                  <div className="grid grid-cols-2 gap-2">
                    {exportFields.referrerRawFields.map((field) => {
                      const exportField = `raw.${field}`;
                      return (
                        <label key={field} className="flex items-center gap-2 rounded border border-slate-200 p-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedExportFields.includes(exportField)}
                            onChange={() => toggleExportField(exportField)}
                          />
                          <span>{field}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCreateExportJob()}
                      disabled={exportSubmitting}
                      className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {exportSubmitting ? 'Exporting...' : 'Start Export'}
                    </button>
                    {exportJob ? (
                      <span className="text-xs text-slate-600">
                        Job {exportJob.jobId}: {exportJob.status}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
