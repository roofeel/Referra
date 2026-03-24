export function UrlRulesHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-8">
      <div className="flex items-center gap-8">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Precision Intelligence</h1>
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
          className="flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
        >
          <span className="material-symbols-outlined text-sm">add_box</span>
          Register Client
        </button>
        <div className="mx-2 h-8 w-px bg-slate-100" />
        <div className="flex cursor-pointer items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900">Adrian Vane</div>
            <div className="text-[10px] text-slate-500">System Architect</div>
          </div>
          <img
            alt="User profile"
            className="h-9 w-9 rounded-full border border-slate-200 object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBv7-kkdVla5rLsgdy4hwRW_hLkx69ujNON91yiA4zc1r-4yc83pF8vjYmi4p0YIYab03QjWag_khOG0W83jB6XT654KDLvwY0ERcszVZ7hfpgcW4P-UWXhfgQA7V9kRG3AmSVnIGHhRqJe7wFnUcSNJwNK6pfJENiuj_yl-X9W8McjblQapHeYyHoyJH6P9ouEmC8WL4DUv7IMGpeCde38vz3MAIKnzs018YzdOhOYxBKGHRM3yzXm3jFfrg7yhqpdBBFbEUi8eAU6"
          />
        </div>
      </div>
    </header>
  );
}
