import type { EventDetail } from './dashboardData';

type InlineToken = {
  text: string;
  strong?: boolean;
  em?: boolean;
  code?: boolean;
  href?: string;
};

type DashboardDetailDrawerProps = {
  detail: EventDetail | null;
  canGenerateUserJourney?: boolean;
  isGeneratingUserJourney?: boolean;
  onGenerateUserJourney?: () => void;
  isOpen: boolean;
  onClose: () => void;
};

function renderInlineMarkdown(text: string) {
  const tokens: InlineToken[] = [];
  const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let start = 0;

  for (const match of text.matchAll(pattern)) {
    const full = match[0];
    const index = match.index ?? 0;
    if (index > start) {
      tokens.push({ text: text.slice(start, index) });
    }

    if (full.startsWith('[')) {
      const linkMatch = full.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push({ text: linkMatch[1], href: linkMatch[2] });
      } else {
        tokens.push({ text: full });
      }
    } else if (full.startsWith('`') && full.endsWith('`')) {
      tokens.push({ text: full.slice(1, -1), code: true });
    } else if (full.startsWith('**') && full.endsWith('**')) {
      tokens.push({ text: full.slice(2, -2), strong: true });
    } else if (full.startsWith('*') && full.endsWith('*')) {
      tokens.push({ text: full.slice(1, -1), em: true });
    } else {
      tokens.push({ text: full });
    }

    start = index + full.length;
  }

  if (start < text.length) {
    tokens.push({ text: text.slice(start) });
  }

  return tokens.map((token, index) => {
    const key = `${token.text}-${index}`;
    if (token.href) {
      return (
        <a
          key={key}
          href={token.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
        >
          {token.text}
        </a>
      );
    }
    if (token.code) {
      return (
        <code key={key} className="rounded bg-slate-200/80 px-1 py-[1px] font-mono text-[11px] text-slate-800">
          {token.text}
        </code>
      );
    }
    if (token.strong) {
      return (
        <strong key={key} className="font-semibold text-slate-900">
          {token.text}
        </strong>
      );
    }
    if (token.em) {
      return (
        <em key={key} className="italic text-slate-800">
          {token.text}
        </em>
      );
    }
    return <span key={key}>{token.text}</span>;
  });
}

function renderJourneyMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;
  let blockIndex = 0;

  const flushParagraph = (start: number, end: number) => {
    const text = lines
      .slice(start, end)
      .map((line) => line.trim())
      .join(' ')
      .trim();
    if (!text) return;
    elements.push(
      <p key={`p-${blockIndex++}`} className="text-[11px] leading-6 text-slate-700">
        {renderInlineMarkdown(text)}
      </p>,
    );
  };

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const headingClass =
        level <= 2
          ? 'mt-2 text-[12px] font-semibold text-slate-900'
          : 'mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700';
      elements.push(
        <h4 key={`h-${blockIndex++}`} className={headingClass}>
          {renderInlineMarkdown(title)}
        </h4>,
      );
      i += 1;
      continue;
    }

    if (/^([-*])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1].trim());
        i += 1;
      }
      elements.push(
        <ul key={`ul-${blockIndex++}`} className="ml-4 list-disc space-y-1 text-[11px] leading-6 text-slate-700">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1].trim());
        i += 1;
      }
      elements.push(
        <ol key={`ol-${blockIndex++}`} className="ml-4 list-decimal space-y-1 text-[11px] leading-6 text-slate-700">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphStart = i;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i].trim()) && !/^[-*]\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim())) {
      i += 1;
    }
    flushParagraph(paragraphStart, i);
  }

  return elements;
}

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
                  <div className="space-y-2">{renderJourneyMarkdown(detail.userJourneyDoc)}</div>
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
