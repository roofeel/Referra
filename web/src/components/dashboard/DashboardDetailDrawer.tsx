import { useMemo, useState, type ReactNode } from 'react';
import type { EventDetail, TableRow } from './dashboardData';

type InlineToken = {
  text: string;
  strong?: boolean;
  em?: boolean;
  code?: boolean;
  href?: string;
};

type DashboardDetailDrawerProps = {
  detail: EventDetail | null;
  selectedRow?: TableRow | null;
  canGenerateUserJourney?: boolean;
  isGeneratingUserJourney?: boolean;
  onGenerateUserJourney?: () => void;
  isOpen: boolean;
  onClose: () => void;
};

type ParameterDefinition = {
  key: string;
  label: string;
  meaning: string;
};

type ParameterCategory = {
  title: string;
  descriptions: string[];
  items: ParameterDefinition[];
};

const PARAMETER_CATEGORIES: ParameterCategory[] = [
  {
    title: 'Device / Browser',
    descriptions: [],
    items: [
      { key: 'BN', label: 'Browser Name', meaning: 'Browser name/version' },
      { key: 'UA', label: 'User-Agent', meaning: 'Full UA for device, fraud, and fingerprinting' },
      { key: 'SR', label: 'Screen Resolution', meaning: 'Screen size' },
      { key: 'VP', label: 'Viewport', meaning: 'Viewport size' },
      { key: 'CD', label: 'Color Depth', meaning: 'Color depth (usually 24-bit)' },
      { key: 'TZ', label: 'Timezone Offset', meaning: 'Offset in minutes (e.g. 240 = UTC-4)' },
      { key: 'DE', label: 'Document Encoding', meaning: 'Page encoding' },
      { key: 'MD', label: 'Mobile Device', meaning: 'Mobile device flag' },
    ],
  },
  {
    title: 'Page',
    descriptions: [],
    items: [
      { key: 'DL', label: 'Document Location', meaning: 'Current page URL (often conversion page)' },
      { key: 'DT', label: 'Document Title', meaning: 'Page title' },
      { key: 'RL', label: 'Referrer / Redirect Location', meaning: 'Previous hop URL with callback/verification params' },
    ],
  },
  {
    title: 'Attribution',
    descriptions: [],
    items: [
      { key: 'ID', label: 'Client ID', meaning: 'Client Matching Key' },
      { key: 'UID', label: 'User ID', meaning: 'Unique User ID' },
      { key: 'V', label: 'Protocol Version', meaning: 'Tracking protocol version' },
      { key: 'ACTION', label: 'Action', meaning: 'Conversion action' },
    ],
  },
  {
    title: 'Ad Attribution',
    descriptions: [],
    items: [
      { key: 'UTM_CAMPAIGN', label: 'UTM Campaign', meaning: 'Campaign name' },
      { key: 'UTM_SOURCE', label: 'UTM Source', meaning: 'Traffic source' },
      { key: 'UTM_MEDIUM', label: 'UTM Medium', meaning: 'Traffic medium' },
      { key: 'UTM_CONTENT', label: 'UTM Content', meaning: 'Creative/content id' },
      { key: 'UTM_TERM', label: 'UTM Term', meaning: 'Keyword term' },
      { key: 'UTM_PARTNER', label: 'UTM Partner', meaning: 'Partner name' },
    ],
  }
];

function tryParseUrl(urlValue: string) {
  try {
    return new URL(urlValue);
  } catch {
    return null;
  }
}

function collectUrlContextParams(urlValue: string) {
  const result = new Map<string, string>();
  const parsed = tryParseUrl(urlValue);
  if (!parsed) return result;

  parsed.searchParams.forEach((value, key) => {
    const upperKey = key.toUpperCase();
    if (!result.has(upperKey)) {
      result.set(upperKey, value);
    }
  });

  const rlRaw = result.get('RL');
  if (rlRaw) {
    const parsedRl = tryParseUrl(rlRaw);
    if (parsedRl) {
      parsedRl.searchParams.forEach((value, key) => {
        const upperKey = key.toUpperCase();
        if (!result.has(upperKey)) {
          result.set(upperKey, value);
        }
      });
    }
  }

  return result;
}

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
  const elements: ReactNode[] = [];
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
  selectedRow = null,
  canGenerateUserJourney = false,
  isGeneratingUserJourney = false,
  onGenerateUserJourney,
  isOpen,
  onClose,
}: DashboardDetailDrawerProps) {
  const [isFullLinkExpanded, setIsFullLinkExpanded] = useState(false);
  const urlContextParams = useMemo(() => collectUrlContextParams(detail?.url || ''), [detail?.url]);

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
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                  <span className="material-symbols-outlined text-sm">tune</span>
                  URL Parameter
                </h3>
                <button
                  type="button"
                  className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 hover:text-blue-800"
                  onClick={() => setIsFullLinkExpanded((prev) => !prev)}
                  aria-expanded={isFullLinkExpanded}
                >
                  {isFullLinkExpanded ? 'Hide full link' : 'Show full link'}
                </button>
              </div>
              {isFullLinkExpanded ? (
                <div className="mb-3 break-all rounded-lg bg-slate-100 p-3">
                  <p className="font-mono text-[11px] leading-relaxed text-slate-700">{detail.url}</p>
                </div>
              ) : null}
              <div className="space-y-3">
                {PARAMETER_CATEGORIES.map((category) => {
                  const isDeviceBrowser = category.title === 'Device / Browser';
                  const isAttribution = category.title === 'Attribution';
                  const isAdAttribution = category.title === 'Ad Attribution';
                  const orderedItems = isDeviceBrowser
                    ? [...category.items.filter((item) => item.key !== 'UA'), ...category.items.filter((item) => item.key === 'UA')]
                    : category.items;
                  const hasAnyAdAttributionValue = isAdAttribution
                    ? category.items.some((item) => {
                        const value = urlContextParams.get(item.key);
                        return Boolean(value && value.trim());
                      })
                    : true;

                  if (isAdAttribution && !hasAnyAdAttributionValue) {
                    return null;
                  }

                  return (
                    <section
                      key={category.title}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold text-slate-900">{category.title}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {category.items.length} fields
                        </span>
                      </div>
                      {category.descriptions.length > 0 ? (
                        <div className="px-3 pt-2">
                          {category.descriptions.map((description) => (
                            <p key={description} className="text-[10px] text-slate-500">
                              {description}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <div
                        className={
                          isDeviceBrowser || isAttribution || isAdAttribution
                            ? 'grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2'
                            : 'space-y-1.5 p-2'
                        }
                      >
                        {orderedItems.map((item) => (
                          <div
                            key={item.key}
                            className={`rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 transition-colors hover:bg-slate-100 ${
                              isDeviceBrowser && item.key === 'UA' ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-semibold text-slate-800">{item.label}</p>
                                <p className="text-[10px] text-slate-500">{item.meaning}</p>
                              </div>
                              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                                {item.key}
                              </span>
                            </div>
                            <p className="mt-1.5 break-all rounded bg-white px-2 py-1 font-mono text-[10px] text-slate-700">
                              {urlContextParams.get(item.key) || '--'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                <span className="material-symbols-outlined text-sm">rule_folder</span>
                Refferr Categroy Rule
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Rule Name</span>
                  <span className="font-bold">{detail.ruleName}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                <span className="material-symbols-outlined text-sm">timeline</span>
                Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">impression_time</span>
                  <span className="font-bold text-slate-900">{selectedRow?.sourceTs || '--'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">registration_time</span>
                  <span className="font-bold text-slate-900">{selectedRow?.ts || '--'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">duration</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRow?.duration || '--'}</span>
                </div>
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
