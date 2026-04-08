import { useEffect, useMemo, useState } from 'react';
import { useOptionalAuth } from '../auth/AuthContext';
import { AppSidebar } from '../components/common/AppSidebar';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import type { AthenaTable } from '../service/athenaTables';

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString();
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

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
    if (!keyword) return items;

    return items.filter((item) =>
      [item.tableType, item.tableNamePattern, item.ddl].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [items, search]);

  const tableNameExample = useMemo(() => buildTableNameExample(form.tableNamePattern), [form.tableNamePattern]);

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

  async function handleSave(event: React.FormEvent) {
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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="athena-tables" ariaLabel="Athena Tables Navigation" />

      <main className="relative ml-64 min-h-screen p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Athena Tables</h1>
              <p className="mt-1 text-sm text-slate-500">Manage Athena table DDL templates and table types.</p>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              New Athena Table
            </button>
          </header>

          {isFormOpen && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Table Type</span>
                    <input
                      value={form.tableType}
                      onChange={(event) => setForm((prev) => ({ ...prev, tableType: event.target.value }))}
                      placeholder="e.g. user_events"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Table Name Pattern</span>
                    <input
                      value={form.tableNamePattern}
                      onChange={(event) => setForm((prev) => ({ ...prev, tableNamePattern: event.target.value }))}
                      placeholder="e.g. user_events_{yyyyMMdd}"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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

                <label className="block space-y-1 text-sm text-slate-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">DDL</span>
                  <textarea
                    value={form.ddl}
                    onChange={(event) => setForm((prev) => ({ ...prev, ddl: event.target.value }))}
                    placeholder="CREATE EXTERNAL TABLE ..."
                    rows={8}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                      setIsFormOpen(false);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {editingId ? 'Cancel edit' : 'Cancel'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Saved Athena Tables</h2>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search type / pattern / ddl"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none md:w-96"
              />
            </div>

            {isLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading Athena tables...</p>
            ) : filteredItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No Athena table DDL yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Table Name Pattern</th>
                      <th className="px-3 py-2">Example Table Name</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">DDL Preview</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 align-top">
                        <td className="px-3 py-3 font-semibold text-slate-800">{item.tableType}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-700">{item.tableNamePattern}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-700">{buildTableNameExample(item.tableNamePattern)}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{formatUpdatedAt(item.updatedAt)}</td>
                        <td className="px-3 py-3">
                          <pre className="max-h-24 overflow-hidden whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-[11px] text-slate-700">
                            {item.ddl}
                          </pre>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="rounded border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              {deletingId === item.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
