import type { UrlRule } from '../../service/urlRules';
import { useEffect, useMemo, useState } from 'react';
import { NodeSandbox } from './NodeSandbox';

type LogicDrawerProps = {
  isOpen: boolean;
  rule: UrlRule | null;
  showSandbox?: boolean;
  onSave: (payload: { id: string; name: string; status: 'active' | 'draft' | 'archived'; logicSource: string }) => Promise<void>;
  isSaving?: boolean;
  onClose: () => void;
};

function formatTimestamp(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '-';
  return value.toLocaleString();
}

export function LogicDrawer({ isOpen, rule, showSandbox = false, onSave, isSaving = false, onClose }: LogicDrawerProps) {
  if (!isOpen || !rule) {
    return null;
  }

  const sourceCode = rule.logicSource || 'async function categorizeFunnel(ourl, rl, dl) { return { channel: "Direct" }; }';
  const [draftName, setDraftName] = useState(rule.name);
  const [draftStatus, setDraftStatus] = useState<'active' | 'draft' | 'archived'>(
    (rule.status?.toLowerCase() as 'active' | 'draft' | 'archived') || 'draft',
  );
  const [draftCode, setDraftCode] = useState(sourceCode);
  const totalCodeLines = Math.max(draftCode.split('\n').length, 1);

  useEffect(() => {
    setDraftName(rule.name);
    setDraftStatus((rule.status?.toLowerCase() as 'active' | 'draft' | 'archived') || 'draft');
    setDraftCode(sourceCode);
  }, [rule.id, rule.name, rule.status, sourceCode]);

  const hasChanges = useMemo(() => {
    const originalStatus = (rule.status?.toLowerCase() as 'active' | 'draft' | 'archived') || 'draft';
    return draftName.trim() !== rule.name || draftCode !== sourceCode || draftStatus !== originalStatus;
  }, [draftCode, draftName, draftStatus, rule.name, rule.status, sourceCode]);

  async function handleSave() {
    const normalizedName = draftName.trim();
    if (!normalizedName || isSaving || !hasChanges) return;
    await onSave({
      id: rule.id,
      name: normalizedName,
      status: draftStatus,
      logicSource: draftCode,
    });
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[720px] flex-col border-l border-slate-200 bg-white shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Url Rules</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{rule.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close logic drawer"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200"
        >
          <span className="material-symbols-outlined text-slate-500">close</span>
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="rounded-lg border border-slate-200 bg-slate-100 p-4">
          <div className="mb-4 space-y-1.5">
            <label htmlFor="edit-rule-name" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Rule Name
            </label>
            <input
              id="edit-rule-name"
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300"
            />
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Version</span>
              <span className="rounded bg-blue-700/10 px-2 py-0.5 text-[10px] font-bold text-blue-700">{rule.activeVersion}</span>
            </div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Status
              <select
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value as 'active' | 'draft' | 'archived')}
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-300"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last deployed by</span>
              <span className="font-semibold text-slate-900">{rule.updatedBy || 'System'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Timestamp</span>
              <span className="font-semibold text-slate-900">{formatTimestamp(rule.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">JavaScript Source</label>
            <span className="text-[10px] font-bold text-slate-400">Editable</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2">
              <span className="material-symbols-outlined text-sm text-amber-400">javascript</span>
              <span className="font-mono text-[10px] text-slate-400">index.js</span>
            </div>
            <div className="flex min-h-[300px] font-mono text-[11px] leading-relaxed text-slate-300">
              <div className="select-none border-r border-slate-700 bg-slate-900 px-3 py-4 text-right text-slate-600">
                {Array.from({ length: totalCodeLines }).map((_, index) => (
                  <div key={`line-${index + 1}`}>{index + 1}</div>
                ))}
              </div>
              <div className="flex-1 p-4">
                <textarea
                  aria-label="Rule Logic Code"
                  value={draftCode}
                  onChange={(event) => setDraftCode(event.target.value)}
                  spellCheck={false}
                  className="h-full min-h-[268px] w-full resize-none border-none bg-transparent font-mono text-[11px] leading-relaxed text-slate-300 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {showSandbox ? (
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Test In Sandbox</label>
            <NodeSandbox inDrawer logicSource={draftCode} />
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-100 bg-white p-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !draftName.trim() || !hasChanges}
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

    </div>
  );
}
