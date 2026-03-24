import { AppSidebar } from '../components/common/AppSidebar';
import { AutomationCard } from '../components/url_rules/AutomationCard';
import { ClientLogicDirectory } from '../components/url_rules/ClientLogicDirectory';
import { LogicDrawer } from '../components/url_rules/LogicDrawer';
import { NodeSandbox } from '../components/url_rules/NodeSandbox';
import { UrlRulesFooter } from '../components/url_rules/UrlRulesFooter';
import { UrlRulesHeader } from '../components/url_rules/UrlRulesHeader';
import { clientRows } from '../components/url_rules/urlRulesData';

export default function UrlRules() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-900 antialiased">
      <AppSidebar activeItem="url-rules" ariaLabel="URL Rules Navigation" />

      <main className="relative ml-64 flex min-h-screen flex-col">
        <UrlRulesHeader />

        <div className="flex-1 space-y-8 p-8">
          <div className="grid grid-cols-12 items-start gap-8">
            <ClientLogicDirectory rows={clientRows} />

            <aside className="col-span-12 space-y-6 lg:col-span-3">
              <NodeSandbox />
              <AutomationCard />
            </aside>
          </div>
        </div>

        <LogicDrawer />
        <UrlRulesFooter />
      </main>
    </div>
  );
}
