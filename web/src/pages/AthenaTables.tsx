import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useOptionalAuth } from '../auth/AuthContext';
import { AthenaTableFormDrawer, type AthenaTableFormValues } from '../components/athena_tables/AthenaTableFormDrawer';
import { AppSidebar } from '../components/common/AppSidebar';
import { TablePagination } from '../components/common/TablePagination';
import { useToast } from '../components/ToastProvider';
import { api } from '../service';
import { replaceDateTokens } from '../lib/dateTokens';
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

const emptyForm: AthenaTableFormValues = {
  tableType: '',
  tableNamePattern: '',
  ddl: '',
};

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



  const tableNameExample = useMemo(() => {
    return replaceDateTokens(form.tableNamePattern);
  }, [form.tableNamePattern, replaceDateTokens]);

  const tableNameExamplesById = useMemo(
    () =>
      Object.fromEntries(
        filteredItems.map((item) => [item.id, replaceDateTokens(item.tableNamePattern)]),
      ),
    [filteredItems, replaceDateTokens],
  );
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
                            {tableNameExamplesById[item.id] || ''}
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

      <AthenaTableFormDrawer
        isOpen={isFormOpen}
        isEditing={isEditing}
        isSaving={isSaving}
        form={form}
        tableNameExample={tableNameExample}
        onClose={closeFormDrawer}
        onSubmit={handleSave}
        onFormChange={setForm}
      />
    </div>
  );
}
