import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useOptionalAuth } from '../auth/AuthContext';
import { AppSidebar } from '../components/common/AppSidebar';
import { TablePagination } from '../components/common/TablePagination';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { AthenaTable } from '../service/athenaTables';

const allTableTypes = '__all_table_types__';

function formatUpdatedText(iso: string, updatedBy?: string | null) {
  const updatedAt = new Date(iso);
  if (Number.isNaN(updatedAt.getTime())) return iso;

  const diffMs = Date.now() - updatedAt.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  let relative = 'Just now';
  if (diffMs >= dayMs) {
    relative = `${Math.floor(diffMs / dayMs)}d ago`;
  } else if (diffMs >= hourMs) {
    relative = `${Math.floor(diffMs / hourMs)}h ago`;
  } else if (diffMs >= minuteMs) {
    relative = `${Math.floor(diffMs / minuteMs)}m ago`;
  }

  return `${relative} by ${updatedBy || 'System'}`;
}

const emptyForm = {
  tableType: '',
  tableNamePattern: '',
  ddl: '',
};

function buildTableNameExample(pattern: string) {
  const normalized = pattern.trim();
  if (!normalized) return '';

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyyMMdd = `${yyyy}${mm}${dd}`;
  const yyyy_MM_dd = `${yyyy}-${mm}-${dd}`;

  const replacements: Array<[RegExp, string]> = [
    [/\{yyyyMMdd\}|\$\{yyyyMMdd\}|\byyyyMMdd\b|\bYYYYMMDD\b/g, yyyyMMdd],
    [/\{yyyy-MM-dd\}|\$\{yyyy-MM-dd\}|\byyyy-MM-dd\b|\bYYYY-MM-DD\b/g, yyyy_MM_dd],
    [/\{yyyy\}|\$\{yyyy\}|\byyyy\b|\bYYYY\b/g, yyyy],
    [/\{MM\}|\$\{MM\}|\bMM\b/g, mm],
    [/\{dd\}|\$\{dd\}|\bdd\b/g, dd],
  ];

  let output = normalized;
  for (const [patternRegex, value] of replacements) {
    output = output.replace(patternRegex, value);
  }
  return output;
}

export default function AthenaTables() {
  const auth = useOptionalAuth();
  const toast = useToast();
  const [items, setItems] = useState<AthenaTable[]>([]);
  const [search, setSearch] = useState('');
  const [tableTypeFilter, setTableTypeFilter] = useState(allTableTypes);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const availableTableTypes = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.tableType.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [items],
  );

  useEffect(() => {
    let alive = true;

    async function loadAthenaTables() {
      try {
        setIsLoading(true);
        const data = await api.athenaTables.list();
        if (!alive) return;
        setItems(data);
      } catch (error) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : 'Failed to load Athena tables';
        toast.error(message);
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    void loadAthenaTables();

    return () => {
      alive = false;
    };
  }, [toast]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      if (tableTypeFilter !== allTableTypes && item.tableType !== tableTypeFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [item.tableType, item.tableNamePattern, item.ddl].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [items, search, tableTypeFilter]);

  const tableNameExample = useMemo(() => buildTableNameExample(form.tableNamePattern), [form.tableNamePattern]);
  const hasActiveFilters = search.trim().length > 0 || tableTypeFilter !== allTableTypes;
  const start = filteredItems.length > 0 ? 1 : 0;
  const end = filteredItems.length;
  const isEditing = editingId !== null;

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function startEdit(item: AthenaTable) {
    setEditingId(item.id);
    setForm({
      tableType: item.tableType,
      tableNamePattern: item.tableNamePattern,
      ddl: item.ddl,
    });
    setIsFormOpen(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    const tableType = form.tableType.trim();
    const tableNamePattern = form.tableNamePattern.trim();
    const ddl = form.ddl.trim();

    if (!tableType || !tableNamePattern || !ddl) {
      toast.error('Table type, table name pattern and DDL are required');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        tableType,
        tableNamePattern,
        ddl,
        updatedBy: auth?.user?.name || auth?.user?.email || 'System',
      };

      if (editingId) {
        const updated = await api.athenaTables.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success('Athena table updated');
      } else {
        const created = await api.athenaTables.create(payload);
        setItems((prev) => [created, ...prev]);
        toast.success('Athena table created');
      }

      setEditingId(null);
      setForm(emptyForm);
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Athena table';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this Athena table DDL?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.athenaTables.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
        setIsFormOpen(false);
      }

      toast.success('Athena table deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete Athena table';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  function closeFormDrawer() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="athena-tables" ariaLabel="Athena Tables Navigation" />

      <main className="relative ml-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-8">
          <div className="flex items-center gap-8">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search type / pattern / ddl..."
                className="w-64 rounded border-none bg-slate-100 py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={startCreate}
              className="flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                add_box
              </span>
              New Athena Table
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-8 p-8">
          <section className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Athena Tables</h1>
              <p className="mt-1 text-sm text-slate-500">Manage Athena table DDL templates and table types.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 p-2">
              <div className="mr-2 flex items-center gap-2 border-r border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Directory
              </div>
              <select
                value={tableTypeFilter}
                onChange={(event) => setTableTypeFilter(event.target.value)}
                className="min-w-[180px] rounded border-none bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-700"
              >
                <option value={allTableTypes}>Table Type: All</option>
                {availableTableTypes.map((tableType) => (
                  <option key={tableType} value={tableType}>
                    {tableType}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ml-auto px-4 text-xs font-medium text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 hover:underline"
                onClick={() => {
                  setSearch('');
                  setTableTypeFilter(allTableTypes);
                }}
                disabled={!hasActiveFilters}
              >
                Clear Filters
              </button>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-500">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Table Name Pattern</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Example Table Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Last Updated</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">DDL Preview</th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td className="px-6 py-8 text-sm text-slate-500" colSpan={6}>
                          Loading Athena tables...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td className="px-6 py-8 text-sm text-slate-500" colSpan={6}>
                          {hasActiveFilters ? 'No Athena table DDL matches current filters.' : 'No Athena table DDL yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`group align-top transition-colors ${
                            editingId === item.id
                              ? 'border-l-4 border-blue-700 bg-blue-700/5 hover:bg-blue-700/10'
                              : 'hover:bg-slate-100/50'
                          }`}
                        >
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.tableType}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-700">{item.tableNamePattern}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-700">
                            {buildTableNameExample(item.tableNamePattern)}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {formatUpdatedText(item.updatedAt, item.updatedBy)}
                          </td>
                          <td className="px-6 py-4">
                            <pre className="max-h-24 overflow-hidden whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
                              {item.ddl}
                            </pre>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-700/5"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="rounded border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingId === item.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination summary={`Viewing ${start}-${end} of ${filteredItems.length} athena tables`} />
            </div>
          </section>
        </div>
      </main>

      {isFormOpen ? (
        <>
          <button
            type="button"
            aria-label="Close Athena table drawer backdrop"
            onClick={closeFormDrawer}
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
                onClick={closeFormDrawer}
                aria-label="Close Athena table drawer"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSave}>
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <div className="rounded-lg border border-slate-200 bg-slate-100 p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <label className="space-y-1.5 text-sm text-slate-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Table Type</span>
                      <input
                        value={form.tableType}
                        onChange={(event) => setForm((prev) => ({ ...prev, tableType: event.target.value }))}
                        placeholder="e.g. user_events"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-700"
                      />
                    </label>

                    <label className="space-y-1.5 text-sm text-slate-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Table Name Pattern
                      </span>
                      <input
                        value={form.tableNamePattern}
                        onChange={(event) => setForm((prev) => ({ ...prev, tableNamePattern: event.target.value }))}
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
                        onChange={(event) => setForm((prev) => ({ ...prev, ddl: event.target.value }))}
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
                  onClick={closeFormDrawer}
                  className="w-full rounded border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
