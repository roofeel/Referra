import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../ToastProvider';
import { api } from '../../service';
import type { UrlRule } from '../../service/urlRules';

const DEFAULT_CODE = `async function categorizeFunnel(ourl, rl, dl) {
  const path = ourl.pathname;
  const params = ourl.searchParams;

  if (path.startsWith('/checkout')) {
    return { segment: 'high_intent', priority: 1 };
  }

  const isReferred = params.has('utm_source');

  return {
    segment: isReferred ? 'marketing_inbound' : 'organic',
    timestamp: Date.now(),
  };
}`;

type CreateRuleDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: UrlRule) => void;
};

export function CreateRuleDrawer({ isOpen, onClose, onCreated }: CreateRuleDrawerProps) {
  const [clients, setClients] = useState<Array<{ id?: string; name: string; value: string }>>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isSaving, setIsSaving] = useState(false);
  const totalCodeLines = Math.max(code.split('\n').length, 1);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    async function loadClients() {
      try {
        const response = await api.urlRules.listClients();
        if (!mounted) return;
        const items = Array.isArray(response)
          ? response
          : Array.isArray((response as { clients?: Array<{ id: string; name: string }> })?.clients)
            ? (response as { clients: Array<{ id: string; name: string }> }).clients
            : [];

        const options = items.map((item) => ({
          id: item.id,
          name: item.name,
          value: `id:${item.id}`,
        }));

        setClients((prev) => {
          const merged = [...prev];
          options.forEach((option) => {
            const existingIndex = merged.findIndex(
              (item) => item.name.toLowerCase() === option.name.toLowerCase(),
            );
            if (existingIndex === -1) {
              merged.push(option);
            } else {
              merged[existingIndex] = option;
            }
          });
          return merged;
        });
        setSelectedClient((prev) => prev || options[0]?.value || '');
      } catch {
        if (!mounted) return;
        toast.error('Failed to load clients');
      }
    }

    void loadClients();
    return () => {
      mounted = false;
    };
  }, [isOpen, toast]);

  const selectedClientOption = useMemo(
    () => clients.find((item) => item.value === selectedClient),
    [clients, selectedClient],
  );

  function addOrSelectClient(rawName: string) {
    const normalized = rawName.trim();
    if (!normalized) {
      toast.error('Client name is required');
      return;
    }

    const exists = clients.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setSelectedClient(exists.value);
      toast.success('Client selected');
      return;
    }

    const option = { name: normalized, value: `new:${normalized}` };
    setClients((prev) => [...prev, option]);
    setSelectedClient(option.value);
    toast.success('Client added');
  }

  function handleAddClientClick() {
    const nextClientName = window.prompt('请输入新的 Client 名称');
    if (!nextClientName) return;
    addOrSelectClient(nextClientName);
  }

  async function handleSave() {
    const normalizedRuleName = ruleName.trim();
    if (!normalizedRuleName) {
      toast.error('Rule name is required');
      return;
    }

    try {
      setIsSaving(true);
      const created = await api.urlRules.create({
        clientId: selectedClientOption?.id,
        clientName: selectedClientOption?.id ? undefined : selectedClientOption?.name,
        ruleName: normalizedRuleName,
        logicSource: code,
        status: 'draft',
        updatedBy: user?.name || user?.email || 'System',
      });
      toast.success('Rule created');
      onCreated(created);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save URL rule';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[65] flex w-full max-w-[720px] flex-col border-l border-slate-200 bg-white shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Url Rules</span>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-700" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Create URL Rule</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close create rule drawer"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200"
        >
          <span className="material-symbols-outlined text-slate-500">close</span>
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="drawer-client-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Client
              </label>
              <select
                id="drawer-client-select"
                value={selectedClient}
                onChange={(event) => setSelectedClient(event.target.value)}
                className="w-full rounded-lg border-none bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-100"
              >
                {clients.map((client) => (
                  <option key={client.value} value={client.value}>
                    {client.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddClientClick}
                className="text-xs font-semibold text-blue-700 transition-colors hover:text-blue-800 hover:underline"
              >
                + Add new client
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="drawer-rule-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rule Name
              </label>
              <input
                id="drawer-rule-name"
                type="text"
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
                placeholder="e.g. Acme Checkout Routing"
                className="w-full rounded-lg border-none bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#333] bg-[#1e1e1e] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#333] bg-[#252526] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-amber-400">javascript</span>
              <span className="font-mono text-xs text-slate-300">categorizeFunnel.js</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">Node.js v20 LTS</span>
          </div>

          <div className="flex min-h-[360px] font-mono text-[13px] leading-relaxed">
            <div className="select-none border-r border-[#333] bg-[#1e1e1e] px-3 py-4 text-right text-slate-600">
              {Array.from({ length: totalCodeLines }).map((_, index) => (
                <div key={`line-${index + 1}`}>{index + 1}</div>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-4 text-slate-300">
              <textarea
                aria-label="Rule Logic Code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                className="h-full min-h-[328px] w-full resize-none border-none bg-transparent font-mono text-[13px] leading-relaxed text-slate-300 outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 bg-white p-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="material-symbols-outlined text-lg">rocket_launch</span>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
