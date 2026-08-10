import { useEffect, useState } from 'react';
import { AppSidebar } from '../components/common/AppSidebar';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { DeliveryRefreshSchedule } from '../service/deliveryRefresh';

export default function CronSchedules() {
  const toast = useToast();
  const [schedule, setSchedule] = useState<DeliveryRefreshSchedule | null>(null);
  const [cron, setCron] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void api.deliveryRefresh.getSchedule().then((value) => { setSchedule(value); setCron(value.cronExpression); setEnabled(value.enabled); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load schedule')); }, [toast]);
  async function save() { setSaving(true); try { const value = await api.deliveryRefresh.updateSchedule({ cronExpression: cron, enabled }); setSchedule(value); toast.success('Cron schedule saved'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save schedule'); } finally { setSaving(false); } }
  return <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900"><AppSidebar activeItem="cron-schedules" ariaLabel="Settings Navigation" /><main className="ml-64 flex flex-1 flex-col overflow-hidden"><header className="flex h-16 items-center border-b border-slate-200/70 bg-white px-8"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Settings</p><h1 className="text-base font-bold">Cron Schedules</h1></div></header><div className="flex-1 overflow-y-auto p-8"><section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-sm font-bold">Delivery Overview refresh</h2><p className="mt-1 text-xs text-slate-500">This is the only scheduled job currently managed here.</p><label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enable automatic refresh</label><label className="mt-4 block text-sm">Cron expression<input value={cron} onChange={(e) => setCron(e.target.value)} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 font-mono" placeholder="0 * * * *" /></label><p className="mt-2 text-xs text-slate-500">Timezone: {schedule?.timezone || 'Asia/Shanghai'}。</p><button type="button" onClick={() => void save()} disabled={saving || !cron.trim()} className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Schedule'}</button></section></div></main></div>;
}
