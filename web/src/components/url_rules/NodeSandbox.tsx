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

function extractParamsFromInput(raw: string) {
  const value = raw.trim();
  if (!value) {
    return { ourl: '', rl: '', dl: '' };
  }

  try {
    const url = new URL(value);
    return {
      ourl: url.href,
      rl: safeDecode(url.searchParams.get('rl') || ''),
      dl: safeDecode(url.searchParams.get('dl') || ''),
    };
  } catch {
    return {
      ourl: value,
      rl: '',
      dl: '',
    };
  }
}

export function NodeSandbox({ inDrawer = false, logicSource }: NodeSandboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');

  const canExecute = useMemo(() => {
    return Boolean(inputValue.trim()) && Boolean(logicSource.trim());
  }, [inputValue, logicSource]);

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

      const { ourl, rl, dl } = extractParamsFromInput(inputValue);
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
            Input String (ourl)
          </label>
          <textarea
            id="ourl-input"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="h-32 w-full resize-none rounded-lg border-none bg-slate-100 p-3 font-mono text-xs placeholder:text-slate-400 focus:ring-1 focus:ring-blue-700"
            placeholder="https://astrazeneca.com/global?gclid=az_8892..."
          />
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
