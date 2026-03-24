import { Link } from 'react-router-dom';
import { useOptionalAuth } from '../../auth/AuthContext';

type SidebarItemKey = 'dashboard' | 'url-rules' | 'reports';

type SidebarItem = {
  key: SidebarItemKey;
  label: string;
  icon: string;
  to?: string;
};

const sidebarItems: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { key: 'reports', label: 'Reports', icon: 'analytics', to: '/reports' },
  { key: 'url-rules', label: 'Url Rules', icon: 'terminal', to: '/url-rules' },
];

type AppSidebarProps = {
  activeItem: SidebarItemKey;
  ariaLabel: string;
};

export function AppSidebar({ activeItem, ariaLabel }: AppSidebarProps) {
  const auth = useOptionalAuth();
  const displayName = auth?.user?.name || auth?.user?.email || 'Guest User';
  const displayEmail = auth?.user?.email || 'No email';

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-800 py-6">
      <div className="mb-6 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
            <span className="material-symbols-outlined text-xl text-white">account_tree</span>
          </div>
          <div>
            <div className="font-semibold leading-tight text-white">Referra</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Analysis Referrer</div>
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

      <div className="mt-4 border-t border-slate-700/70 px-4 pt-4">
        <div className="rounded-lg bg-slate-700/50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/80 text-xs font-bold uppercase text-white">
              {displayName.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-[11px] text-slate-300">{displayEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => auth?.logout()}
            disabled={!auth}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-500/60 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-600/60 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
