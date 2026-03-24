import type { UrlRule } from '../../service/urlRules';
import { NodeSandbox } from './NodeSandbox';

type LogicDrawerProps = {
  isOpen: boolean;
  rule: UrlRule | null;
  showSandbox?: boolean;
  onClose: () => void;
};

function formatTimestamp(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '-';
  return value.toLocaleString();
}

export function LogicDrawer({ isOpen, rule, showSandbox = false, onClose }: LogicDrawerProps) {
  if (!isOpen || !rule) {
    return null;
  }

  const sourceCode = rule.logicSource || 'async function categorizeFunnel(ourl, rl, dl) { return { channel: "Direct" }; }';
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
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Version</span>
            <span className="rounded bg-blue-700/10 px-2 py-0.5 text-[10px] font-bold text-blue-700">{rule.activeVersion}</span>
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
            <button type="button" className="text-[10px] font-bold text-blue-700 hover:underline">
              Format Code
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2">
              <span className="material-symbols-outlined text-sm text-amber-400">javascript</span>
              <span className="font-mono text-[10px] text-slate-400">index.js</span>
            </div>
            <div className="p-4 font-mono text-[11px] leading-relaxed text-slate-300">
              <pre className="overflow-x-auto"><code>{sourceCode}</code></pre>
            </div>
          </div>
        </div>
        
        {showSandbox ? (
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Test In Sandbox</label>
            <NodeSandbox inDrawer logicSource={sourceCode} />
          </div>
        ) : null}
      </div>

    </div>
  );
}
