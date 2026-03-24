import { AppSidebar } from '../components/common/AppSidebar';
import { useEffect, useMemo, useState } from 'react';
import { ClientLogicDirectory } from '../components/url_rules/ClientLogicDirectory';
import { CreateRuleDrawer } from '../components/url_rules/CreateRuleDrawer';
import { LogicDrawer } from '../components/url_rules/LogicDrawer';
import { useToast } from '../components/ToastProvider';
import { UrlRulesHeader } from '../components/url_rules/UrlRulesHeader';
import type { ClientRow } from '../components/url_rules/urlRulesData';
import { api } from '../service';
import type { UrlRule } from '../service/urlRules';

function formatUpdatedText(iso: string, updatedBy?: string | null) {
  const updatedAt = new Date(iso);
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

function normalizeStatus(status: string): 'Active' | 'Draft' {
  return status.toLowerCase() === 'active' ? 'Active' : 'Draft';
}

export default function UrlRules() {
  const [rules, setRules] = useState<UrlRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [sandboxRuleId, setSandboxRuleId] = useState<string | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let alive = true;

    async function loadRules() {
      try {
        setIsLoading(true);
        setError(null);
        const items = await api.urlRules.list();
        if (!alive) return;

        setRules(items);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load URL rules');
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    void loadRules();
    return () => {
      alive = false;
    };
  }, []);

  const tableRows = useMemo<ClientRow[]>(
    () =>
      rules.map((item, index) => ({
        id: item.id,
        clientName: item.client?.name || 'Unknown Client',
        ruleName: item.name,
        shortName: item.shortName,
        shortNameClasses: index === 0 ? 'bg-blue-700/10 text-blue-700' : 'bg-slate-100 text-slate-500',
        status: normalizeStatus(item.status),
        updated: formatUpdatedText(item.updatedAt, item.updatedBy),
        preview: item.logicSource || 'async function categorizeFunnel(ourl, rl, dl) { ... }',
      })),
    [rules],
  );

  const selectedRule = useMemo(
    () => rules.find((item) => item.id === selectedRuleId) || null,
    [rules, selectedRuleId],
  );

  function handleOpenEditor(ruleId: string) {
    setIsCreateDrawerOpen(false);
    setSelectedRuleId(ruleId);
    setSandboxRuleId(null);
  }

  function handleOpenSandbox(ruleId: string) {
    setIsCreateDrawerOpen(false);
    setSelectedRuleId(ruleId);
    setSandboxRuleId(ruleId);
  }

  function handleOpenCreateDrawer() {
    setSelectedRuleId(null);
    setSandboxRuleId(null);
    setIsCreateDrawerOpen(true);
  }

  async function handleDeleteRule(ruleId: string) {
    const targetRule = rules.find((item) => item.id === ruleId);
    const name = targetRule?.name || 'this rule';
    const confirmed = window.confirm(`Delete "${name}"?`);
    if (!confirmed) return;

    try {
      setDeletingRuleId(ruleId);
      await api.urlRules.delete(ruleId);
      setRules((prev) => prev.filter((item) => item.id !== ruleId));

      if (selectedRuleId === ruleId) {
        setSelectedRuleId(null);
      }
      if (sandboxRuleId === ruleId) {
        setSandboxRuleId(null);
      }

      toast.success('Rule deleted');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete URL rule';
      toast.error(message);
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function handleSaveRule(payload: {
    id: string;
    name: string;
    status: 'active' | 'draft' | 'archived';
    logicSource: string;
  }) {
    try {
      setSavingRuleId(payload.id);
      const updated = await api.urlRules.update(payload.id, {
        name: payload.name,
        status: payload.status,
        logicSource: payload.logicSource,
      });
      setRules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success('Rule updated');
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Failed to update URL rule';
      toast.error(message);
    } finally {
      setSavingRuleId(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="url-rules" ariaLabel="URL Rules Navigation" />

      <main className="relative ml-64 flex min-h-screen flex-col">
        <UrlRulesHeader onCreateRule={handleOpenCreateDrawer} />

        <div className="flex-1 space-y-8 p-8">
          <ClientLogicDirectory
            rows={tableRows}
            isLoading={isLoading}
            error={error}
            selectedRowId={selectedRuleId}
            onSelectRow={handleOpenEditor}
            onTestInSandbox={handleOpenSandbox}
            onDeleteRow={handleDeleteRule}
            deletingRowId={deletingRuleId}
          />
        </div>

        <LogicDrawer
          isOpen={selectedRule !== null}
          rule={selectedRule}
          showSandbox={selectedRule !== null && sandboxRuleId === selectedRule.id}
          onSave={handleSaveRule}
          isSaving={selectedRule !== null && savingRuleId === selectedRule.id}
          onClose={() => {
            setSelectedRuleId(null);
            setSandboxRuleId(null);
          }}
        />
        <CreateRuleDrawer
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          onCreated={(created) => {
            setRules((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
            setSelectedRuleId(created.id);
            setSandboxRuleId(null);
            setIsCreateDrawerOpen(false);
          }}
        />
      </main>
    </div>
  );
}
