import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayPicker, type DateRange } from 'react-day-picker';
import { AppSidebar } from '../components/common/AppSidebar';
import { TablePagination } from '../components/common/TablePagination';
import { AttributedUploadDataDrawer } from '../components/reports/AttributedUploadDataDrawer';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { ReportLog, ReportTask, ReportTaskStatus, ReportsResponse } from '../service/reports';

function statusStyles(status: ReportTaskStatus) {
  switch (status) {
    case 'Running':
      return {
        badgeClass: 'bg-blue-50 text-blue-700',
        dotClass: 'bg-blue-500',
        icon: '',
        progressTrackClass: 'bg-slate-200',
        progressBarClass: 'bg-blue-600',
        progressTextClass: 'text-blue-700',
      };
    case 'Completed':
      return {
        badgeClass: 'bg-emerald-50 text-emerald-700',
        dotClass: '',
        icon: 'check_circle',
        progressTrackClass: 'bg-emerald-100',
        progressBarClass: 'bg-emerald-500',
        progressTextClass: 'text-emerald-700',
      };
    case 'Failed':
      return {
        badgeClass: 'bg-red-50 text-red-700',
        dotClass: '',
        icon: 'error',
        progressTrackClass: 'bg-red-100',
        progressBarClass: 'bg-red-500',
        progressTextClass: 'text-red-700',
      };
    default:
      return {
        badgeClass: 'bg-slate-100 text-slate-700',
        dotClass: '',
        icon: 'pause_circle',
        progressTrackClass: 'bg-slate-200',
        progressBarClass: 'bg-slate-400',
        progressTextClass: 'text-slate-500',
      };
  }
}

export default function Reports() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    client: '',
    startDate: '',
    endDate: '',
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const debouncedSearch = useDebouncedValue(draftFilters.search, 250);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [payload, setPayload] = useState<ReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [playingTaskId, setPlayingTaskId] = useState<string | null>(null);
  const [logsTask, setLogsTask] = useState<ReportTask | null>(null);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const toast = useToast();

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const data = await api.reports.list({
      search: filters.search || undefined,
      status: filters.status || undefined,
      client: filters.client || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
    setPayload(data);
  }, [filters]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await loadReports();
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load reports');
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadReports]);

  useEffect(() => {
    if (!isDatePickerOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!datePickerRef.current) return;
      if (event.target instanceof Node && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.search === debouncedSearch) return prev;
      return { ...prev, search: debouncedSearch };
    });
  }, [debouncedSearch]);

  const stats = useMemo(
    () => [
      {
        label: 'Total Tasks',
        value: String(payload?.metrics.totalTasks ?? 0),
        extra: 'Filtered',
        extraClass: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Active Analyses',
        value: String(payload?.metrics.activeAnalyses ?? 0),
        extra: 'Live',
        extraClass: 'bg-blue-50 text-blue-700',
      },
      {
        label: 'Data Points (24h)',
        value: payload?.metrics.dataPoints24h ?? '0',
        extra: 'Streaming',
        extraClass: 'bg-slate-100 text-slate-700',
      },
    ],
    [payload],
  );

  const tasks: ReportTask[] = payload?.tasks || [];

  function applyFilters() {
    setFilters(draftFilters);
  }

  function resetFilters() {
    const empty = { search: '', status: '', client: '', startDate: '', endDate: '' };
    setDraftFilters(empty);
    setFilters(empty);
  }

  const dateRange = useMemo<DateRange | undefined>(() => {
    return {
      from: parseDateInput(draftFilters.startDate),
      to: parseDateInput(draftFilters.endDate),
    };
  }, [draftFilters.endDate, draftFilters.startDate]);

  const dateRangeLabel = useMemo(() => {
    const from = parseDateInput(draftFilters.startDate);
    const to = parseDateInput(draftFilters.endDate);
    if (from && to) return `${formatHumanDate(from)} - ${formatHumanDate(to)}`;
    if (from) return `${formatHumanDate(from)} - End`;
    if (to) return `Start - ${formatHumanDate(to)}`;
    return 'Select date range';
  }, [draftFilters.endDate, draftFilters.startDate]);

  function handleDateRangeSelect(range: DateRange | undefined) {
    setDraftFilters((prev) => ({
      ...prev,
      startDate: range?.from ? formatDateInput(range.from) : '',
      endDate: range?.to ? formatDateInput(range.to) : '',
    }));
  }

  async function refreshReportsWithHandling() {
    try {
      await loadReports();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTask(payload: Parameters<typeof api.reports.create>[0]) {
    await api.reports.create(payload);
    setIsUploadDrawerOpen(false);
    await refreshReportsWithHandling();
    toast.success('Analysis started');
  }

  async function handleDeleteTask(task: ReportTask) {
    const confirmed = window.confirm(`Delete "${task.taskName}"?`);
    if (!confirmed) return;

    try {
      setDeletingTaskId(task.id);
      await api.reports.delete(task.id);
      await refreshReportsWithHandling();
      toast.success('Task deleted');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete report task';
      toast.error(message);
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function handleRerun(task: ReportTask) {
    if (task.status === 'Running') return;
    if (playingTaskId === task.id) return;

    try {
      setPlayingTaskId(task.id);
      await api.reports.rerun(task.id);
      toast.success('Task rerun started');
      await refreshReportsWithHandling();
    } catch (rerunError) {
      const message = rerunError instanceof Error ? rerunError.message : 'Failed to rerun task';
      toast.error(message);
    } finally {
      setPlayingTaskId(null);
    }
  }

  async function handleViewLogs(task: ReportTask) {
    setLogsTask(task);
    setLogs([]);
    setLogsLoading(true);
    setLogsError(null);
    try {
      const items = await api.reports.listLogs(task.id);
      setLogs(items);
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="reports" ariaLabel="Reports Navigation" />

      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              search
            </span>
            <input
              type="text"
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search reports, clients..."
              className="h-10 w-full rounded-lg border-none bg-slate-100 py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsUploadDrawerOpen(true)}
            className="flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Upload Attributed Data
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <article key={item.label} className="rounded-xl border border-slate-200/70 bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-2xl font-black text-slate-900">{item.value}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${item.extraClass}`}>{item.extra}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="min-w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Client Account
                <select
                  value={draftFilters.client}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, client: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Clients</option>
                  {(payload?.clients || []).map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-[160px] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Task Status
                <select
                  value={draftFilters.status}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Statuses</option>
                  <option value="Running">Running</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                  <option value="Paused">Paused</option>
                </select>
              </label>

              <label className="min-w-[220px] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Date Range
                <div className="relative mt-1" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen((prev) => !prev)}
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition-colors hover:border-slate-300"
                  >
                    <span className="material-symbols-outlined text-sm text-slate-500">calendar_today</span>
                    <span className="flex-1 truncate text-left">{dateRangeLabel}</span>
                    <span className="material-symbols-outlined text-base text-slate-500">
                      {isDatePickerOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {isDatePickerOpen ? (
                    <div className="absolute left-0 top-12 z-30 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                      <DayPicker mode="range" numberOfMonths={2} selected={dateRange} onSelect={handleDateRangeSelect} />
                    </div>
                  ) : null}
                </div>
              </label>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="rounded-lg bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
            {isLoading ? (
              <div className="p-8 text-sm text-slate-500">Loading reports...</div>
            ) : error ? (
              <div className="p-8 text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Report Name</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Client</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Source</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Progress</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Attribution</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Created At</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tasks.map((task) => {
                        const styles = statusStyles(task.status);

                        return (
                          <tr
                            key={task.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/reports/${task.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                navigate(`/reports/${task.id}`);
                              }
                            }}
                            className="group cursor-pointer transition-colors hover:bg-slate-50"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900">{task.taskName}</p>
                              <p className="text-[10px] uppercase tracking-wider text-slate-500">ID: #{task.id}</p>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{task.client}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-slate-500">{task.sourceIcon}</span>
                                <span className="text-xs font-semibold uppercase text-slate-700">{task.source}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest ${styles.badgeClass}`}
                              >
                                {styles.dotClass ? (
                                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${styles.dotClass} animate-pulse`} />
                                ) : (
                                  <span
                                    className="material-symbols-outlined mr-1 text-[10px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                  >
                                    {styles.icon}
                                  </span>
                                )}
                                {task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`h-1.5 w-full overflow-hidden rounded-full ${styles.progressTrackClass}`}>
                                <div
                                  className={`h-full ${styles.progressBarClass} transition-all`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <p className={`mt-1 text-[10px] font-bold ${styles.progressTextClass}`}>{task.progressLabel}</p>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">{task.attribution}</td>
                            <td className="px-6 py-4 text-right text-xs text-slate-500">{task.createdAt}</td>
                            <td className="px-6 py-4">
                              <div
                                className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => navigate(`/reports/${task.id}`)}
                                  className="rounded p-1.5 text-blue-700 hover:bg-white"
                                  aria-label="View task"
                                >
                                  <span className="material-symbols-outlined text-lg">visibility</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleViewLogs(task)}
                                  className="rounded p-1.5 text-amber-700 hover:bg-white"
                                  aria-label="View logs"
                                >
                                  <span className="material-symbols-outlined text-lg">subject</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleRerun(task)}
                                  className="rounded p-1.5 text-slate-600 hover:bg-white"
                                  aria-label={task.status === 'Running' ? 'Task running' : 'Rerun task'}
                                  disabled={playingTaskId === task.id || task.status === 'Running'}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    play_arrow
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteTask(task)}
                                  disabled={deletingTaskId === task.id}
                                  className="rounded p-1.5 text-red-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Delete task"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <TablePagination summary={`Showing 1-${tasks.length} of ${tasks.length} reports`} />
              </>
            )}
          </section>
        </div>
        <AttributedUploadDataDrawer
          isOpen={isUploadDrawerOpen}
          clients={payload?.clients || []}
          rules={payload?.rules || []}
          athenaTables={payload?.athenaTables || []}
          onClose={() => setIsUploadDrawerOpen(false)}
          onSubmit={handleCreateTask}
        />
        {logsTask ? (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setLogsTask(null)} aria-hidden="true" />
            <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Execution Logs</p>
                  <h3 className="text-sm font-bold text-slate-900">{logsTask.taskName}</h3>
                </div>
                <button
                  type="button"
                  className="rounded p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => setLogsTask(null)}
                  aria-label="Close logs"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <div className="h-[calc(100%-4rem)] overflow-y-auto p-4">
                {logsLoading ? <p className="text-sm text-slate-500">Loading logs...</p> : null}
                {logsError ? <p className="text-sm text-red-600">{logsError}</p> : null}
                {!logsLoading && !logsError && logs.length === 0 ? (
                  <p className="text-sm text-slate-500">No logs yet.</p>
                ) : null}
                {!logsLoading && !logsError && logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                              log.level === 'error'
                                ? 'bg-red-100 text-red-700'
                                : log.level === 'warn'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.level}
                          </span>
                          <span className="text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 break-all font-mono text-xs text-slate-700">{log.message}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </aside>
          </>
        ) : null}
      </main>
    </div>
  );
}

function parseDateInput(value: string) {
  if (!value) return undefined;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts;
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHumanDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
