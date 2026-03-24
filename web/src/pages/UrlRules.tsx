import { AppSidebar } from '../components/common/AppSidebar';
import { useEffect, useMemo, useState } from 'react';
import { ClientLogicDirectory } from '../components/url_rules/ClientLogicDirectory';
import { LogicDrawer } from '../components/url_rules/LogicDrawer';
import { NodeSandbox } from '../components/url_rules/NodeSandbox';
import { UrlRulesFooter } from '../components/url_rules/UrlRulesFooter';
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
        name: item.name,
        shortName: item.shortName,
        shortNameClasses: index === 0 ? 'bg-blue-700/10 text-blue-700' : 'bg-slate-100 text-slate-500',
        status: normalizeStatus(item.status),
        updated: formatUpdatedText(item.updatedAt, item.updatedBy),
        preview: item.logicSource || 'async function categorizeFunnel(ourl) { ... }',
      })),
    [rules],
  );

  const selectedRule = useMemo(
    () => rules.find((item) => item.id === selectedRuleId) || null,
    [rules, selectedRuleId],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="url-rules" ariaLabel="URL Rules Navigation" />

      <main className="relative ml-64 flex min-h-screen flex-col">
        <UrlRulesHeader />

        <div className="flex-1 space-y-8 p-8">
          <div className="grid grid-cols-12 items-start gap-8">
            <ClientLogicDirectory
              rows={tableRows}
              isLoading={isLoading}
              error={error}
              selectedRowId={selectedRuleId}
              onSelectRow={setSelectedRuleId}
              onTestInSandbox={setSandboxRuleId}
            />

            <aside className="col-span-12 space-y-6 lg:col-span-3">
              {sandboxRuleId ? <NodeSandbox /> : null}
            </aside>
          </div>
        </div>

        <LogicDrawer
          isOpen={selectedRule !== null}
          rule={selectedRule}
          onClose={() => setSelectedRuleId(null)}
        />
        <UrlRulesFooter drawerOpen={selectedRule !== null} />
      </main>
    </div>
  );
}
