import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSidebar } from '../components/common/AppSidebar';
import { TablePagination } from '../components/common/TablePagination';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { ManualAttributedJob } from '../service/manualAttribution';

const DEFAULT_SQL_TEMPLATE = `SELECT *
FROM your_database.your_table
WHERE date(event_time) BETWEEN date '{{start_date}}' AND date '{{end_date}}'
LIMIT 1000`;

function statusClass(status: ManualAttributedJob['status']) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'running') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

export default function ManualAttributed() {
  const toast = useToast();
  const [filters, setFilters] = useState({ search: '', status: '', startDate: '', endDate: '' });
  const [tasks, setTasks] = useState<ManualAttributedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ManualAttributedJob | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobStartDate, setJobStartDate] = useState('');
  const [jobEndDate, setJobEndDate] = useState('');
  const [database, setDatabase] = useState('default');
  const [workgroup, setWorkgroup] = useState('primary');
  const [resultS3, setResultS3] = useState('');
  const [sqlTemplate, setSqlTemplate] = useState(DEFAULT_SQL_TEMPLATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.manualAttribution.listAttributedJobs({
        search: filters.search || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setTasks(payload.tasks || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [filters.endDate, filters.search, filters.startDate, filters.status]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const hasRunning = tasks.some((item) => item.status === 'pending' || item.status === 'running');
    if (!hasRunning) return undefined;

    const timer = window.setInterval(() => {
      void loadTasks();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [loadTasks, tasks]);

  const renderedPreview = useMemo(() => {
    return sqlTemplate
      .replaceAll('{{start_date}}', jobStartDate)
      .replaceAll('{{end_date}}', jobEndDate)
      .replaceAll('{{start_ts}}', jobStartDate ? `${jobStartDate} 00:00:00` : '')
      .replaceAll('{{end_ts}}', jobEndDate ? `${jobEndDate} 23:59:59` : '');
  }, [jobEndDate, jobStartDate, sqlTemplate]);

  function resetForm() {
    setEditingJob(null);
    setJobName('');
    setJobStartDate('');
    setJobEndDate('');
    setDatabase('default');
    setWorkgroup('primary');
    setResultS3('');
    setSqlTemplate(DEFAULT_SQL_TEMPLATE);
  }

  function handleOpenCreate() {
    resetForm();
    setIsCreateOpen(true);
  }

  function handleOpenEdit(job: ManualAttributedJob) {
    setEditingJob(job);
    setJobName(job.name || '');
    setJobStartDate(job.startDate || '');
    setJobEndDate(job.endDate || '');
    setDatabase(job.database || 'default');
    setWorkgroup(job.workgroup || 'primary');
    setResultS3(job.resultS3 || '');
    setSqlTemplate(job.sqlTemplate || job.renderedSql || DEFAULT_SQL_TEMPLATE);
    setIsCreateOpen(true);
  }

  function handleCloseDrawer() {
    setIsCreateOpen(false);
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = jobName.trim();
    if (!name) {
      toast.error('Job name is required');
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        sqlTemplate,
        startDate: jobStartDate || undefined,
        endDate: jobEndDate || undefined,
        database: database || undefined,
        workgroup: workgroup || undefined,
        resultS3: resultS3 || undefined,
      };
      if (editingJob) {
        await api.manualAttribution.updateAttributedJob(editingJob.jobId, payload);
        toast.success('Manual attribution job updated');
      } else {
        await api.manualAttribution.createAttributedJob(payload);
        toast.success('Manual attribution job saved');
      }
      handleCloseDrawer();
      await loadTasks();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save manual attribution job');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(job: ManualAttributedJob) {
    const confirmed = window.confirm(`Delete "${job.name || job.jobId}"?`);
    if (!confirmed) return;

    try {
      setDeletingJobId(job.jobId);
      await api.manualAttribution.deleteAttributedJob(job.jobId);
      setTasks((prev) => prev.filter((item) => item.jobId !== job.jobId));
      if (editingJob?.jobId === job.jobId) {
        handleCloseDrawer();
      }
      toast.success('Manual attribution job deleted');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete manual attribution job');
    } finally {
      setDeletingJobId(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="manual-attributed" ariaLabel="Manual Attribution Navigation" />
      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search by name / jobId / queryExecutionId / database"
              className="h-10 w-full rounded-lg border-none bg-slate-100 py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Manual Query
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="min-w-[160px] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Status
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                  className="mt-1 h-8 w-full rounded-md border-none bg-slate-100 px-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </label>

              <label className="min-w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Start Date
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="mt-1 h-8 w-full rounded-md border-none bg-slate-100 px-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="min-w-[180px] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                End Date
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="mt-1 h-8 w-full rounded-md border-none bg-slate-100 px-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilters({ search: '', status: '', startDate: '', endDate: '' })}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => void loadTasks()}
                  className="rounded-md bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
            {isLoading ? (
              <div className="p-8 text-sm text-slate-500">Loading manual attribution tasks...</div>
            ) : error ? (
              <div className="p-8 text-sm text-red-600">{error}</div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">No manual attribution tasks yet. Click "New Manual Query" to create one.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Job</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Athena</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date Range</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Created At</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tasks.map((task) => (
                        <tr key={task.jobId} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900">{task.name || task.jobId}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            <p>QueryExecutionId: {task.queryExecutionId || '-'}</p>
                            <p className="mt-1">Workgroup: {task.workgroup}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(task.status)}`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-700">{task.startDate} ~ {task.endDate}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{new Date(task.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(task)}
                                className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingJobId === task.jobId}
                                onClick={() => void handleDelete(task)}
                                className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                              >
                                {deletingJobId === task.jobId ? 'Deleting...' : 'Delete'}
                              </button>
                              {task.downloadUrl ? (
                                <a href={task.downloadUrl} target="_blank" rel="noreferrer" className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                                  Download
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination summary={`Showing 1-${tasks.length} of ${tasks.length} tasks`} />
              </>
            )}
          </section>
        </div>

        {isCreateOpen ? (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={handleCloseDrawer} aria-hidden="true" />
            <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Manual Attribution</p>
                  <h3 className="text-sm font-bold text-slate-900">{editingJob ? 'Edit Manual Attribution Job' : 'Create Manual Attribution Job'}</h3>
                </div>
                <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100" onClick={handleCloseDrawer} aria-label="Close drawer">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <div className="h-[calc(100%-4rem)] overflow-y-auto p-6">
                <p className="text-xs text-slate-500">
                  Variables: <code>{'{{start_date}}'}</code>, <code>{'{{end_date}}'}</code>, <code>{'{{start_ts}}'}</code>, <code>{'{{end_ts}}'}</code>
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Use template variables in SQL for dynamic execution. Keep these placeholders and inject actual dates at runtime.
                </p>
                <details className="mt-3 rounded border border-sky-200 bg-sky-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-sky-900">Table Naming Rule (Monthly)</summary>
                  <div className="mt-2 space-y-2 text-xs text-slate-700">
                    <p>
                      Table names are <span className="font-semibold">not auto-generated</span>. Fill monthly tables manually in SQL.
                    </p>
                    <p>
                      Pattern: <code>impression_waf_logs_YYYYMM</code>, <code>pixel_waf_logs_YYYYMM</code>
                    </p>
                    <p>Examples: <code>impression_waf_logs_202604</code>, <code>impression_waf_logs_202605</code>, <code>pixel_waf_logs_202605</code></p>
                    <p>For cross-month windows (for example a 14-day lookback), include all related monthly impression tables with <code>UNION ALL</code>.</p>
                    <pre className="overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 text-[11px] text-slate-100">{`FROM your_database.pixel_waf_logs_202605 p
JOIN (
  SELECT * FROM your_database.impression_waf_logs_202604
  UNION ALL
  SELECT * FROM your_database.impression_waf_logs_202605
) i ON ...`}</pre>
                  </div>
                </details>
                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                  <label className="block text-sm text-slate-700">
                    Job Name
                    <input
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. May SKAN manual attribution backfill"
                      className="mt-1 h-9 w-full rounded border border-slate-300 px-3"
                      required
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm text-slate-700">
                      Athena Database
                      <input value={database} onChange={(e) => setDatabase(e.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-3" />
                    </label>
                    <label className="text-sm text-slate-700">
                      Workgroup
                      <input value={workgroup} onChange={(e) => setWorkgroup(e.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-3" />
                    </label>
                    <label className="text-sm text-slate-700">
                      Athena Result S3
                      <input value={resultS3} onChange={(e) => setResultS3(e.target.value)} placeholder="s3://bucket/prefix/" className="mt-1 h-9 w-full rounded border border-slate-300 px-3" />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-700">
                      Start Date
                      <input type="date" value={jobStartDate} onChange={(e) => setJobStartDate(e.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-3" />
                    </label>
                    <label className="text-sm text-slate-700">
                      End Date
                      <input type="date" value={jobEndDate} onChange={(e) => setJobEndDate(e.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-3" />
                    </label>
                  </div>
                  <label className="block text-sm text-slate-700">
                    SQL Template
                    <textarea value={sqlTemplate} onChange={(e) => setSqlTemplate(e.target.value)} className="mt-1 h-52 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs" required />
                  </label>
                  <details className="rounded border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">Rendered SQL Preview</summary>
                    <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">{renderedPreview}</pre>
                  </details>
                  <button disabled={isSubmitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </div>
            </aside>
          </>
        ) : null}
      </main>
    </div>
  );
}
