type ManualExecuteDrawerProps = {
  open: boolean;
  title: string;
  templateVariables: string[];
  variableValues: Record<string, string>;
  isExecuting: boolean;
  onClose: () => void;
  onChangeVariable: (name: string, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function ManualExecuteDrawer(props: ManualExecuteDrawerProps) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 z-40 bg-black/30" onClick={props.onClose} aria-hidden="true" />
      <aside className="relative z-50 ml-auto h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Manual Execute</p>
            <h2 className="text-sm font-bold text-slate-900">{props.title}</h2>
          </div>
          <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100" onClick={props.onClose} aria-label="Close execute drawer">
            ✕
          </button>
        </div>
        <div className="mt-6">
          <form className="space-y-4" onSubmit={props.onSubmit}>
            {props.templateVariables.length === 0 ? <p className="text-xs text-slate-500">No template variables detected. Execute will run directly.</p> : null}
            {props.templateVariables.map((name) => (
              <label key={name} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {name}
                <input
                  type="text"
                  value={props.variableValues[name] || ''}
                  onChange={(event) => props.onChangeVariable(name, event.target.value)}
                  className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder={name}
                />
              </label>
            ))}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={props.isExecuting}
                className="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {props.isExecuting ? 'Queueing...' : 'Execute'}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
