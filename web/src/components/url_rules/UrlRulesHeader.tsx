type UrlRulesHeaderProps = {
  onCreateRule: () => void;
};

export function UrlRulesHeader({ onCreateRule }: UrlRulesHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-8">
      <div className="flex items-center gap-8">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
          <input
            type="text"
            placeholder="Search clients or functions..."
            className="w-64 rounded border-none bg-slate-100 py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-700"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onCreateRule}
          className="flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            add_box
          </span>
          Create Rule
        </button>
      </div>
    </header>
  );
}
