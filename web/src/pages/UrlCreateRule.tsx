import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppSidebar } from '../components/common/AppSidebar';

const DEFAULT_CODE = `async function categorizeFunnel(ourl) {
  // Initialize routing logic for funnel classification
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

export default function UrlCreateRule() {
  const ADD_CLIENT_VALUE = '__add_client__';
  const [clients, setClients] = useState(['Chime', 'Novig']);
  const [selectedClient, setSelectedClient] = useState('Chime');
  const [code, setCode] = useState(DEFAULT_CODE);
  const totalCodeLines = Math.max(code.split('\n').length, 1);

  function addOrSelectClient(rawName: string) {
    const normalized = rawName.trim();
    if (!normalized) return;

    const exists = clients.some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setSelectedClient(clients.find((item) => item.toLowerCase() === normalized.toLowerCase()) || selectedClient);
      return;
    }

    setClients((prev) => [...prev, normalized]);
    setSelectedClient(normalized);
  }

  function handleClientSelectChange(value: string) {
    if (value !== ADD_CLIENT_VALUE) {
      setSelectedClient(value);
      return;
    }

    const nextClientName = window.prompt('请输入新的 Client 名称');
    if (!nextClientName) return;
    addOrSelectClient(nextClientName);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f2f4f6] text-slate-900 antialiased">
      <AppSidebar activeItem="url-rules" ariaLabel="URL Rules Navigation" />

      <main className="relative ml-64 min-h-screen px-8 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <nav className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link to="/url-rules" className="hover:text-slate-800">
                  Url Rules
                </Link>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span>Create Rule</span>
              </nav>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Edit URL Rule</h1>
              <p className="mt-1 text-sm text-slate-500">Define rule identity and logic execution flow for this profile.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/url-rules"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                className="rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </header>

          <div className="grid grid-cols-12 items-start gap-6">
            <section className="col-span-12 space-y-6 lg:col-span-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                  <span className="material-symbols-outlined text-base">badge</span>
                  Rule Identity
                </h2>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="client-select"
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      Client Select
                    </label>
                    <select
                      id="client-select"
                      value={selectedClient}
                      onChange={(event) => handleClientSelectChange(event.target.value)}
                      className="w-full rounded-lg border-none bg-slate-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                    >
                      {clients.map((client) => (
                        <option key={client} value={client}>
                          {client}
                        </option>
                      ))}
                      <option value={ADD_CLIENT_VALUE}>+ Add new client...</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="rule-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Rule Name
                    </label>
                    <input
                      id="rule-name"
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      className="w-full rounded-lg border-none bg-slate-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="col-span-12 lg:col-span-8">
              <div className="overflow-hidden rounded-xl border border-[#333] bg-[#1e1e1e] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#333] bg-[#252526] px-4 py-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-sm text-amber-400"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        javascript
                      </span>
                      <span className="font-mono text-xs text-slate-300">categorizeFunnel.js</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">Node.js v20 LTS</span>
                </div>

                <div className="flex min-h-[520px] font-mono text-[13px] leading-relaxed">
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
                      className="h-full min-h-[488px] w-full resize-none border-none bg-transparent font-mono text-[13px] leading-relaxed text-slate-300 outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#007acc] px-4 py-2 text-[10px] font-bold tracking-tight text-white">
                  <div className="flex items-center gap-4">
                  </div>
                  <div className="flex items-center gap-4">
                    <span>UTF-8</span>
                    <span>JavaScript</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Lint: OK
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                  >
                    <span className="material-symbols-outlined text-sm">format_align_left</span>
                    Format Code
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
