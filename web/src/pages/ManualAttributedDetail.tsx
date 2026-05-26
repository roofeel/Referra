import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppSidebar } from '../components/common/AppSidebar';
import { api } from '../service';
import type { ManualAttributedExecution, ManualAttributedJob } from '../service/manualAttribution';

function statusClass(status: ManualAttributedJob['status']) {
  if (status === 'draft') return 'bg-amber-100 text-amber-700';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'running') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

function groupExecutionsByDay(executions: ManualAttributedExecution[]) {
  const grouped: Record<string, ManualAttributedExecution[]> = {};
  for (const execution of executions) {
    const day = execution.createdAt.slice(0, 10);
    grouped[day] ||= [];
    grouped[day].push(execution);
  }
  return Object.entries(grouped).sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0));
}

export default function ManualAttributedDetail() {
  const { jobId = '' } = useParams();
  const decodedJobId = decodeURIComponent(jobId);
  const [job, setJob] = useState<ManualAttributedJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedExecutions, setExpandedExecutions] = useState<Record<string, boolean>>({});

  const loadJob = useCallback(async () => {
    if (!decodedJobId) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.manualAttribution.getAttributedJob(decodedJobId);
      setJob(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load job detail');
    } finally {
      setIsLoading(false);
    }
  }, [decodedJobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  useEffect(() => {
    if (!job || (job.status !== 'pending' && job.status !== 'running')) return undefined;
    const timer = window.setInterval(() => {
      void loadJob();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [job, loadJob]);

  const groupedExecutions = groupExecutionsByDay(job?.executions || []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="manual-attributed" ariaLabel="Manual Attribution Navigation" />
      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Manual Attribution Job</p>
            <h1 className="text-base font-bold text-slate-900">{job?.name || decodedJobId}</h1>
          </div>
          <Link to="/manual-attribution/attributed" className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            Back to List
          </Link>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          {isLoading ? <div className="text-sm text-slate-500">Loading job detail...</div> : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          {job && !isLoading && !error ? (
            <>
              <section className="rounded-xl border border-slate-200/70 bg-white p-5">
                <div className="grid gap-4 text-xs text-slate-600 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job ID</p>
                    <p className="mt-1 font-semibold text-slate-900">{job.jobId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
                    <span className={`mt-1 inline-flex rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Created At</p>
                    <p className="mt-1 font-semibold text-slate-900">{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution Count</p>
                    <p className="mt-1 font-semibold text-slate-900">{job.executions?.length || 0}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200/70 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">Execute Logs</h2>
                {groupedExecutions.length === 0 ? (
                  <div className="mt-3 text-xs text-slate-500">No execute logs available</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {groupedExecutions.map(([day, executions]) => {
                      const dayKey = `${job.jobId}:${day}`;
                      const isDayExpanded = !!expandedDays[dayKey];
                      return (
                        <div key={dayKey} className="rounded border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }))}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700"
                          >
                            <span>{day}</span>
                            <span>{executions.length} 次</span>
                          </button>
                          {isDayExpanded ? (
                            <div className="space-y-2 border-t border-slate-200 p-3">
                              {executions.map((execution) => {
                                const isExecutionExpanded = !!expandedExecutions[execution.executionId];
                                return (
                                  <div key={execution.executionId} className="rounded border border-slate-200 bg-slate-50">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedExecutions((prev) => ({ ...prev, [execution.executionId]: !prev[execution.executionId] }))
                                      }
                                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-700"
                                    >
                                      <span>{new Date(execution.createdAt).toLocaleString()}</span>
                                      <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusClass(execution.status)}`}>
                                        {execution.status}
                                      </span>
                                    </button>
                                    {isExecutionExpanded ? (
                                      <div className="space-y-1 border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
                                        <p>Execution ID: {execution.executionId}</p>
                                        <p>QueryExecutionId: {execution.queryExecutionId || '-'}</p>
                                        <p>结果文件路径: {execution.resultFilePath || '-'}</p>
                                        {execution.error ? <p className="text-red-600">Error: {execution.error}</p> : null}
                                        {execution.downloadUrl ? (
                                          <a
                                            href={execution.downloadUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-block rounded bg-emerald-600 px-2 py-1 font-semibold text-white"
                                          >
                                            Download Result
                                          </a>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
