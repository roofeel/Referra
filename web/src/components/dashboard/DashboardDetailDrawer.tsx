import type { EventDetail } from './dashboardData';

type DashboardDetailDrawerProps = {
  detail: EventDetail | null;
  isOpen: boolean;
  onClose: () => void;
};

export function DashboardDetailDrawer({ detail, isOpen, onClose }: DashboardDetailDrawerProps) {
  if (!detail) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
        aria-hidden={!isOpen}
        className={`fixed bottom-0 right-0 top-0 z-50 w-96 overflow-y-auto border-l border-slate-200/30 bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 id="event-detail-title" className="text-sm font-bold uppercase tracking-widest text-slate-900">
              Event Detail
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100"
              aria-label="Close Event Detail"
            >
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                <span className="material-symbols-outlined text-sm">link</span>
                URL Context
              </h3>
              <div className="break-all rounded-lg bg-slate-100 p-3">
                <p className="font-mono text-[11px] leading-relaxed text-slate-700">{detail.url}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                <span className="material-symbols-outlined text-sm">rule_folder</span>
                Rule Analysis
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Rule Version</span>
                  <span className="font-bold">{detail.ruleVersion}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Matched Rule ID</span>
                  <span className="rounded bg-slate-100 px-1.5 font-mono">{detail.matchedRuleId}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-blue-700">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                AI results
              </h3>
              <div className="border-l-2 border-blue-700 bg-blue-50 p-3">
                <p className="text-[11px] leading-relaxed text-blue-900">{detail.aiResult}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[10px] font-bold uppercase text-slate-500">Extracted Parameters</h3>
              <div className="space-y-2">
                {detail.extractedParameters.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-bold text-slate-400">{key}</span>
                    <div className="h-0 flex-1 border-b border-dotted border-slate-300" />
                    <span className="text-xs font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-[10px] font-bold uppercase text-slate-500">Attribution Path</h3>
              <div className="relative space-y-6 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-slate-200">
                {detail.attributionPath.map(([title, detailText, color]) => (
                  <div key={title} className="relative">
                    <div className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${color}`} />
                    <p className="text-xs font-bold text-slate-900">{title}</p>
                    <p className="text-[10px] text-slate-500">{detailText}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-lg">flag</span>
              Flag for Manual Review
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
