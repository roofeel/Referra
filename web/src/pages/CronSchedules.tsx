import { useEffect, useState } from 'react';
import { AppSidebar } from '../components/common/AppSidebar';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { DeliveryRefreshSchedule } from '../service/deliveryRefresh';
import type { ManualAttributedJob } from '../service/manualAttribution';

type SchedulerCardProps = {
  title: string;
  description: string;
  timezone: string;
  initialCron: string;
  initialEnabled: boolean;
  onSave: (payload: { cronExpression: string; enabled: boolean }) => Promise<void>;
};

function SchedulerCard({ title, description, timezone, initialCron, initialEnabled, onSave }: SchedulerCardProps) {
  const toast = useToast();
  const [cron, setCron] = useState(initialCron);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCron(initialCron);
    setEnabled(initialEnabled);
  }, [initialCron, initialEnabled]);

  async function save() {
    setSaving(true);
    try {
      await onSave({ cronExpression: cron.trim(), enabled });
      toast.success('Cron schedule saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <label className="mt-5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Enable automatic execution
      </label>
      <label className="mt-4 block text-sm">
        Cron expression
        <input value={cron} onChange={(event) => setCron(event.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 font-mono" placeholder="0 * * * *" />
      </label>
      <p className="mt-2 text-xs text-slate-500">Timezone: {timezone}</p>
      <button type="button" onClick={() => void save()} disabled={saving || (enabled && !cron.trim())} className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Schedule'}
      </button>
    </section>
  );
}

export default function CronSchedules() {
  const toast = useToast();
  const [deliverySchedule, setDeliverySchedule] = useState<DeliveryRefreshSchedule | null>(null);
  const [manualJobs, setManualJobs] = useState<ManualAttributedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.deliveryRefresh.getSchedule(), api.manualAttribution.listAttributedJobs()])
      .then(([schedule, jobs]) => {
        setDeliverySchedule(schedule);
        setManualJobs(jobs.tasks || []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load schedules'))
      .finally(() => setIsLoading(false));
  }, [toast]);

  async function saveDeliverySchedule(payload: { cronExpression: string; enabled: boolean }) {
    const updated = await api.deliveryRefresh.updateSchedule(payload);
    setDeliverySchedule(updated);
  }

  async function saveManualSchedule(job: ManualAttributedJob, payload: { cronExpression: string; enabled: boolean }) {
    const updated = await api.manualAttribution.updateAttributedJob(job.jobId, {
      cronExpression: payload.cronExpression,
      cronEnabled: payload.enabled,
    });
    setManualJobs((current) => current.map((item) => (item.jobId === updated.jobId ? updated : item)));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900">
      <AppSidebar activeItem="cron-schedules" ariaLabel="Settings Navigation" />
      <main className="ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-slate-200/70 bg-white px-8">
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Settings</p><h1 className="text-base font-bold">Cron Schedules</h1></div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? <p className="text-sm text-slate-500">Loading schedules...</p> : null}
          {!isLoading && deliverySchedule ? <div className="max-w-3xl space-y-5">
            <SchedulerCard title="Delivery Overview refresh" description="Refreshes the delivery dashboard metrics on its own schedule." timezone={deliverySchedule.timezone || 'Asia/Shanghai'} initialCron={deliverySchedule.cronExpression} initialEnabled={deliverySchedule.enabled} onSave={saveDeliverySchedule} />
            {manualJobs.map((job) => <SchedulerCard key={job.jobId} title={job.name || job.jobId} description={`Manual attribution job · ${job.jobId}`} timezone="Asia/Shanghai" initialCron={job.cronExpression || ''} initialEnabled={job.cronEnabled} onSave={(payload) => saveManualSchedule(job, payload)} />)}
            {manualJobs.length === 0 ? <p className="text-sm text-slate-500">No manual attribution jobs yet.</p> : null}
          </div> : null}
        </div>
      </main>
    </div>
  );
}
