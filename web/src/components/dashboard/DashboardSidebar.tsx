import type { NavItem } from './dashboardData';

type DashboardSidebarProps = {
  identityLabel: string;
  emailLabel: string;
  initials: string;
  avatar?: string | null;
  navItems: NavItem[];
  onLogout: () => void;
};

export function DashboardSidebar({
  identityLabel,
  emailLabel,
  initials,
  avatar,
  navItems,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-slate-800">
      <div className="p-6">
        <div className="flex items-center gap-2 text-xl font-black text-white">
          <span
            className="material-symbols-outlined text-2xl text-blue-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_tree
          </span>
          Referrer AI
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2" aria-label="Dashboard Navigation">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-xs font-medium transition ${
              item.active
                ? 'border-blue-600 bg-blue-700/20 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span
              className={`material-symbols-outlined text-lg ${item.active ? 'text-blue-400' : ''}`}
              style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-700/50 p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-900/50 p-3">
          {avatar ? (
            <img
              src={avatar}
              alt={identityLabel}
              className="flex h-8 w-8 items-center justify-center rounded object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
              {initials || 'PI'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{identityLabel}</p>
            <p className="truncate text-[10px] text-slate-500">{emailLabel}</p>
          </div>
        </div>
        <div className="space-y-1">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">auto_stories</span>
            Documentation
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">help</span>
            Help Center
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
