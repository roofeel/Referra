import { Link } from 'react-router-dom';

type SidebarItemKey = 'dashboard' | 'url-rules' | 'data-sources' | 'attribution' | 'settings';

type SidebarItem = {
  key: SidebarItemKey;
  label: string;
  icon: string;
  to?: string;
};

const sidebarItems: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { key: 'url-rules', label: 'Url Rules', icon: 'terminal', to: '/url-rules' },
];

type AppSidebarProps = {
  activeItem: SidebarItemKey;
  ariaLabel: string;
};

export function AppSidebar({ activeItem, ariaLabel }: AppSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-800 py-6">
      <div className="mb-6 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
            <span className="material-symbols-outlined text-xl text-white">account_tree</span>
          </div>
          <div>
            <div className="font-semibold leading-tight text-white">Referrer AI</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Feedmob</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label={ariaLabel}>
        {sidebarItems.map((item) => {
          const isActive = item.key === activeItem;

          if (item.to) {
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`flex items-center gap-3 px-6 py-3 transition-all ${
                  isActive
                    ? 'border-r-2 border-blue-500 bg-blue-700/20 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${isActive ? 'text-blue-400' : ''}`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-sm leading-relaxed">{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              className={`flex w-full items-center gap-3 px-6 py-3 text-left transition-all ${
                isActive
                  ? 'border-r-2 border-blue-500 bg-blue-700/20 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span
                className={`material-symbols-outlined ${isActive ? 'text-blue-400' : ''}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-sm leading-relaxed">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
