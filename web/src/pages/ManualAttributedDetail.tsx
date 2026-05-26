import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppSidebar } from '../components/common/AppSidebar';
import { ManualExecuteDrawer } from '../components/manual_attribution/ManualExecuteDrawer';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { ManualAttributedJob } from '../service/manualAttribution';

function statusClass(status: ManualAttributedJob['status']) {
  if (status === 'draft') return 'bg-amber-100 text-amber-700';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'running') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

export default function ManualAttributedDetail() {
  const toast = useToast();
  const { jobId = '' } = useParams();
  const decodedJobId = decodeURIComponent(jobId);
  const [job, setJob] = useState<ManualAttributedJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuteOpen, setIsExecuteOpen] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

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

  async function handleOpenExecute() {
    if (!job) return;
    try {
      const payload = await api.manualAttribution.getAttributedJobTemplateVariables(job.jobId);
      const variables = payload.variables || [];
      const nextValues: Record<string, string> = {};
      for (const name of variables) {
        nextValues[name] = '';
      }
      setTemplateVariables(variables);
      setVariableValues(nextValues);
      setIsExecuteOpen(true);
    } catch (executeError) {
      toast.error(executeError instanceof Error ? executeError.message : 'Failed to load template variables');
    }
  }

  function handleCloseExecute() {
    setIsExecuteOpen(false);
    setTemplateVariables([]);
    setVariableValues({});
  }

  async function handleExecuteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) return;

    const variables: Record<string, string> = {};
    for (const name of templateVariables) {
      const value = (variableValues[name] || '').trim();
      if (!value) {
        toast.error(`Variable ${name} is required`);
        return;
      }
      variables[name] = value;
    }

    setIsExecuting(true);
    try {
      await api.manualAttribution.executeAttributedJob(job.jobId, { variables });
      toast.success('Manual attribution execution enqueued');
      handleCloseExecute();
      await loadJob();
    } catch (executeError) {
      toast.error(executeError instanceof Error ? executeError.message : 'Failed to execute manual attribution job');
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="manual-attributed" ariaLabel="Manual Attribution Navigation" />
      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Manual Attribution Job</p>
            <h1 className="text-base font-bold text-slate-900">{job?.name || decodedJobId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/manual-attribution/attributed" className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
              Back to List
            </Link>
            <button
              type="button"
              onClick={() => void handleOpenExecute()}
              disabled={!job || isLoading || isExecuting}
              className="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExecuting ? 'Queueing...' : 'Execute'}
            </button>
          </div>
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
                {!job.executions || job.executions.length === 0 ? (
                  <div className="mt-3 text-xs text-slate-500">No execute logs available</div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Created At</th>
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Status</th>
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Execution ID</th>
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">QueryExecutionId</th>
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Result File</th>
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Error</th>
                          <th className="px-3 py-2 font-black uppercase tracking-widest text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {job.executions.map((execution) => (
                          <tr key={execution.executionId} className="align-top">
                            <td className="px-3 py-2 text-slate-700">{new Date(execution.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusClass(execution.status)}`}>
                                {execution.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{execution.executionId}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{execution.queryExecutionId || '-'}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{execution.resultFilePath || '-'}</td>
                            <td className="px-3 py-2 text-red-600">{execution.error || '-'}</td>
                            <td className="px-3 py-2">
                              {execution.downloadUrl ? (
                                <a
                                  href={execution.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block rounded bg-emerald-600 px-2 py-1 font-semibold text-white"
                                >
                                  Download
                                </a>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
      <ManualExecuteDrawer
        open={isExecuteOpen}
        title={job?.name || job?.jobId || ''}
        templateVariables={templateVariables}
        variableValues={variableValues}
        isExecuting={isExecuting}
        onClose={handleCloseExecute}
        onChangeVariable={(name, value) => setVariableValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleExecuteSubmit}
      />
    </div>
  );
}
