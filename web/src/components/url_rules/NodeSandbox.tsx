import { useMemo, useState } from 'react';

type NodeSandboxProps = {
  inDrawer?: boolean;
  logicSource: string;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getSearchParamIgnoreCase(url: URL, key: string) {
  const normalizedKey = key.toLowerCase();
  for (const [paramKey, value] of url.searchParams.entries()) {
    if (paramKey.toLowerCase() === normalizedKey) {
      return safeDecode(value);
    }
  }
  return '';
}

function extractRlDlFromOurl(ourlRaw: string) {
  const ourl = ourlRaw.trim();
  if (!ourl) return null;

  try {
    const parsed = new URL(ourl);
    return {
      rl: getSearchParamIgnoreCase(parsed, 'rl'),
      dl: getSearchParamIgnoreCase(parsed, 'dl'),
    };
  } catch {
    return null;
  }
}

function resolveParams(ourlRaw: string, rlRaw: string, dlRaw: string) {
  const ourl = ourlRaw.trim();
  let rl = rlRaw.trim();
  let dl = dlRaw.trim();

  if (ourl && (!rl || !dl)) {
    const extracted = extractRlDlFromOurl(ourl);
    if (extracted) {
      if (!rl) rl = extracted.rl;
      if (!dl) dl = extracted.dl;
    }
  }

  return { ourl, rl, dl };
}

export function NodeSandbox({ inDrawer = false, logicSource }: NodeSandboxProps) {
  const [ourlValue, setOurlValue] = useState('https://example.com/landing?rl=sample_rl&dl=sample_dl');
  const [rlValue, setRlValue] = useState('sample_rl');
  const [dlValue, setDlValue] = useState('sample_dl');
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');

  const canExecute = useMemo(() => {
    return Boolean(ourlValue.trim()) && Boolean(logicSource.trim());
  }, [ourlValue, logicSource]);

  function handleOurlChange(nextOurl: string) {
    setOurlValue(nextOurl);

    const extracted = extractRlDlFromOurl(nextOurl);
    if (!extracted) return;

    setRlValue(extracted.rl);
    setDlValue(extracted.dl);
  }

  async function handleExecute() {
    if (!canExecute || isExecuting) return;

    setIsExecuting(true);
    setErrorText('');

    try {
      const buildRunner = new Function(
        `
${logicSource}
if (typeof categorizeFunnel !== 'function') {
  throw new Error('logicSource must define categorizeFunnel(ourl, rl, dl)');
}
return categorizeFunnel;
`,
      );

      const runner = buildRunner();
      if (typeof runner !== 'function') {
        throw new Error('categorizeFunnel is not a function');
      }

      const { ourl, rl, dl } = resolveParams(ourlValue, rlValue, dlValue);
      const resolved = await runner(ourl, rl, dl);
      setResultText(JSON.stringify(resolved, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
      setResultText('');
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className={`${inDrawer ? '' : 'sticky top-24'} overflow-hidden rounded-xl border border-slate-200 bg-white`}>
      <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
        <h2 className="text-xs font-bold uppercase tracking-wider">Node.js Sandbox</h2>
        <span className="material-symbols-outlined text-sm text-slate-400">terminal</span>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <label htmlFor="ourl-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ourl
          </label>
          <textarea
            id="ourl-input"
            value={ourlValue}
            onChange={(event) => handleOurlChange(event.target.value)}
            className="h-24 w-full resize-none rounded-lg border-none bg-slate-100 p-3 font-mono text-xs placeholder:text-slate-400 focus:ring-1 focus:ring-blue-700"
            placeholder="https://astrazeneca.com/global?gclid=az_8892..."
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="rl-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              rl
            </label>
            <input
              id="rl-input"
              value={rlValue}
              onChange={(event) => setRlValue(event.target.value)}
              className="h-10 w-full rounded-lg border-none bg-slate-100 px-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-700"
              placeholder="sample_rl"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="dl-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              dl
            </label>
            <input
              id="dl-input"
              value={dlValue}
              onChange={(event) => setDlValue(event.target.value)}
              className="h-10 w-full rounded-lg border-none bg-slate-100 px-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-700"
              placeholder="sample_dl"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleExecute()}
          disabled={!canExecute || isExecuting}
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-800"
        >
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          {isExecuting ? 'Executing...' : 'Execute Async'}
        </button>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolved Object</span>
            <span
              className={`text-[10px] font-bold uppercase ${
                errorText ? 'text-red-500' : resultText ? 'text-emerald-500' : 'text-slate-400'
              }`}
            >
              {errorText ? 'Error' : resultText ? 'Success' : 'Idle'}
            </span>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            {errorText ? (
              <pre className="font-mono text-[10px] text-red-400">{errorText}</pre>
            ) : resultText ? (
              <pre className="font-mono text-[10px] text-emerald-400">{resultText}</pre>
            ) : (
              <pre className="font-mono text-[10px] text-slate-400">{`Click "Execute Async" to run categorizeFunnel(ourl, rl, dl).`}</pre>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-blue-100 bg-blue-50/50 p-4">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-lg text-blue-500">info</span>
          <p className="text-[11px] leading-relaxed text-blue-700">
            Node.js 18.x runtime. Built-in modules <strong>url</strong>, <strong>crypto</strong>, and <strong>path</strong> are available.
          </p>
        </div>
      </div>
    </div>
  );
}
