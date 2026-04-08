import type { FormEvent } from 'react';

export type AthenaTableFormValues = {
  tableType: string;
  tableNamePattern: string;
  ddl: string;
};

type AthenaTableFormDrawerProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  form: AthenaTableFormValues;
  tableNameExample: string;
  onClose: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onFormChange: (next: AthenaTableFormValues) => void;
};

export function AthenaTableFormDrawer({
  isOpen,
  isEditing,
  isSaving,
  form,
  tableNameExample,
  onClose,
  onSubmit,
  onFormChange,
}: AthenaTableFormDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close Athena table drawer backdrop"
        onClick={onClose}
        className="fixed inset-0 z-[58] bg-slate-950/20"
      />
      <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[680px] flex-col border-l border-slate-200 bg-white shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Athena Tables</span>
              <span className={`h-1.5 w-1.5 rounded-full ${isEditing ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {isEditing ? 'Edit Athena Table' : 'New Athena Table'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Athena table drawer"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-4">
              <div className="grid grid-cols-1 gap-4">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Table Type</span>
                  <input
                    value={form.tableType}
                    onChange={(event) => onFormChange({ ...form, tableType: event.target.value })}
                    placeholder="e.g. user_events"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-700"
                  />
                </label>

                <label className="space-y-1.5 text-sm text-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Table Name Pattern</span>
                  <input
                    value={form.tableNamePattern}
                    onChange={(event) => onFormChange({ ...form, tableNamePattern: event.target.value })}
                    placeholder="e.g. user_events_{yyyyMMdd}"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-700"
                  />
                  {tableNameExample ? (
                    <p className="text-xs text-slate-500">
                      Example table name: <span className="font-mono text-slate-700">{tableNameExample}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Input a pattern to preview generated table name.</p>
                  )}
                </label>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2">
                <span className="material-symbols-outlined text-sm text-amber-400">table_chart</span>
                <span className="font-mono text-[10px] text-slate-400">ddl.sql</span>
              </div>
              <div className="p-4">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">DDL</span>
                  <textarea
                    value={form.ddl}
                    onChange={(event) => onFormChange({ ...form, ddl: event.target.value })}
                    placeholder="CREATE EXTERNAL TABLE ..."
                    rows={14}
                    className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200 outline-none transition-colors focus:border-blue-500"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 bg-white p-6">
            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              {isSaving ? 'Saving...' : isEditing ? 'Update Athena Table' : 'Create Athena Table'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
