import type { EventDetail } from './dashboardData';

type DashboardDetailDrawerProps = {
  detail: EventDetail | null;
  canGenerateUserJourney?: boolean;
  isGeneratingUserJourney?: boolean;
  onGenerateUserJourney?: () => void;
  isOpen: boolean;
  onClose: () => void;
};

export function DashboardDetailDrawer({
  detail,
  canGenerateUserJourney = false,
  isGeneratingUserJourney = false,
  onGenerateUserJourney,
  isOpen,
  onClose,
}: DashboardDetailDrawerProps) {
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
        className={`fixed bottom-0 right-0 top-0 z-50 w-[40rem] max-w-[92vw] overflow-y-auto border-l border-slate-200/30 bg-white shadow-2xl transition-transform duration-300 ${
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
                  <span className="text-slate-500">Rule Name</span>
                  <span className="font-bold">{detail.ruleName}</span>
                </div>
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

            {detail.firstPageLoadDuration || detail.firstPageLoadEventTime ? (
              <div>
                <h3 className="mb-3 text-[10px] font-bold uppercase text-slate-500">Durations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">First Page Load Time</span>
                    <span className="font-bold text-slate-900">{detail.firstPageLoadEventTime || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Impression -&gt; First Page Load</span>
                    <span className="font-mono font-bold text-slate-900">{detail.firstPageLoadDuration || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">First Page Load -&gt; Registration</span>
                    <span className="font-mono font-bold text-slate-900">
                      {detail.firstPageLoadToRegistrationDuration || '--'}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {detail.journey ? (
              <div>
                <h3 className="mb-3 text-[10px] font-bold uppercase text-slate-500">Event Logs</h3>
                {detail.journey.rows.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No matched journey rows in this time window.</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {detail.journey.rows.map((row, index) => (
                      <div key={`${row.ts}-${row.idValue}-${index}`} className="rounded bg-slate-50 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Time</p>
                        <p className="text-[11px] font-semibold text-slate-800">{row.ts}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Event</p>
                        <p className="text-[11px] text-slate-700">{row.event || '--'}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">URL</p>
                        <p className="break-all font-mono text-[10px] text-slate-600">{row.url}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <h3 className="mb-3 text-[10px] font-bold uppercase text-slate-500">User Journey</h3>
              <button
                type="button"
                onClick={onGenerateUserJourney}
                disabled={!canGenerateUserJourney || isGeneratingUserJourney}
                className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <span className="material-symbols-outlined text-sm">
                  {isGeneratingUserJourney ? 'progress_activity' : 'auto_awesome'}
                </span>
                {isGeneratingUserJourney ? 'Generating...' : 'Generate User Journey'}
              </button>
              {detail.userJourneyDoc ? (
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <pre className="whitespace-pre-wrap text-[11px] leading-5 text-slate-700">{detail.userJourneyDoc}</pre>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">No generated report yet.</p>
              )}
            </div>
          </div>

          {/* <div className="mt-12 border-t border-slate-200 pt-6">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-lg">flag</span>
              Flag for Manual Review
            </button>
          </div> */}
        </div>
      </aside>
    </>
  );
}
