import { useEffect, useState } from 'react';
import { AppSidebar } from '../components/common/AppSidebar';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';

const example = '[\n  { "clickUrlId": 23703, "showBid": true, "name": "Custom Bidder A" }\n]';

export default function DeliveryMetricSettings() {
  const toast = useToast();
  const [json, setJson] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.deliverySettings.get()
      .then((settings) => {
        if (!active) return;
        setJson(JSON.stringify(settings.filters, null, 2));
        setLoaded(true);
      })
      .catch((error) => {
        if (active) setError(error instanceof Error ? error.message : 'Failed to load settings');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save() {
    setError('');
    let filters: unknown;
    try {
      filters = JSON.parse(json);
      if (!Array.isArray(filters)) throw new Error('Filters JSON must be an array');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid JSON');
      return;
    }
    setSaving(true);
    try {
      const settings = await api.deliverySettings.save(filters);
      setJson(JSON.stringify(settings.filters, null, 2));
      toast.success('Delivery metrics settings saved');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-slate-900">
      <AppSidebar activeItem="delivery-metrics" ariaLabel="Settings Navigation" />
      <main className="ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-slate-200/70 bg-white px-8">
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Settings</p><h1 className="text-base font-bold">Delivery Metrics</h1></div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-bold">Click URL filters</h2>
            <p className="mt-2 text-xs text-slate-500">Configure clickUrlId, showBid and name for each filter. An empty array disables ID filtering and bid metrics.</p>
            <label htmlFor="delivery-filters" className="mt-5 block text-sm font-semibold">Filters JSON</label>
            <textarea id="delivery-filters" value={json} onChange={(event) => setJson(event.target.value)} disabled={!loaded || saving} spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'delivery-filters-error' : undefined} className="mt-2 min-h-72 w-full rounded border border-slate-300 p-3 font-mono text-sm disabled:opacity-50" />
            {loading ? <p className="mt-2 text-sm text-slate-500">Loading settings...</p> : null}
            {error ? <p id="delivery-filters-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
            <p className="mt-2 text-xs text-slate-500">Saved changes apply immediately. Refresh the relevant dates on the dashboard to rebuild existing metrics with changed IDs or bid settings.</p>
            <button type="button" onClick={() => void save()} disabled={!loaded || saving} className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Settings'}</button>
            <details className="mt-5 text-xs text-slate-500"><summary className="cursor-pointer">JSON example</summary><pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3">{example}</pre></details>
          </section>
        </div>
      </main>
    </div>
  );
}
