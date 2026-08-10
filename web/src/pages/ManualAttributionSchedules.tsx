import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppSidebar } from '../components/common/AppSidebar';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { ManualAttributedJob } from '../service/manualAttribution';

export default function ManualAttributionSchedules() {
  const toast = useToast();
  const [jobs, setJobs] = useState<ManualAttributedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.manualAttribution.listAttributedJobs();
      setJobs(result.tasks || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load cron schedules');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(job: ManualAttributedJob) {
    setUpdating(job.jobId);
    try {
      const updated = await api.manualAttribution.updateAttributedJob(job.jobId, { cronEnabled: !job.cronEnabled });
      setJobs((current) => current.map((item) => item.jobId === job.jobId ? updated : item));
      toast.success(updated.cronEnabled ? 'Cron schedule enabled' : 'Cron schedule disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update cron schedule');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="manual-schedules" ariaLabel="Manual Attribution Navigation" />
      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Manual Attribution</p>
            <h1 className="text-base font-bold">Cron Schedules</h1>
          </div>
          <Link to="/manual-attribution/attributed" className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Open Jobs</Link>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <section className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-900">
            Cron timezone: <strong>{'Asia/Shanghai'}</strong> by default. Override with the API environment variable <code>CRON_TIMEZONE</code>.
          </section>
          <section className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
            {loading ? <div className="p-8 text-sm text-slate-500">Loading schedules...</div> : jobs.length === 0 ? <div className="p-8 text-sm text-slate-500">No jobs configured.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                  <thead><tr className="bg-slate-100">
                    <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-500">Job</th>
                    <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-500">Cron</th>
                    <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-500">Variables</th>
                    <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-5 py-3 text-right font-black uppercase tracking-widest text-slate-500">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {jobs.map((job) => <tr key={job.jobId} className="hover:bg-slate-50">
                      <td className="px-5 py-4"><Link className="font-bold text-blue-700 hover:underline" to={`/manual-attribution/attributed/${encodeURIComponent(job.jobId)}`}>{job.name || job.jobId}</Link><p className="mt-1 font-mono text-[10px] text-slate-400">{job.jobId}</p></td>
                      <td className="px-5 py-4 font-mono text-slate-700">{job.cronExpression || <span className="text-slate-400">Not configured</span>}</td>
                      <td className="max-w-xs px-5 py-4 font-mono text-[11px] text-slate-600">{JSON.stringify(job.cronVariables || {})}</td>
                      <td className="px-5 py-4"><span className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest ${job.cronEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{job.cronEnabled ? 'Enabled' : 'Disabled'}</span></td>
                      <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Link to={`/manual-attribution/attributed/${encodeURIComponent(job.jobId)}`} className="rounded bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-200">Logs</Link><button type="button" disabled={updating === job.jobId || !job.cronExpression} onClick={() => void toggle(job)} className="rounded bg-violet-50 px-3 py-1.5 font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50">{updating === job.jobId ? 'Saving...' : job.cronEnabled ? 'Disable' : 'Enable'}</button></div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
