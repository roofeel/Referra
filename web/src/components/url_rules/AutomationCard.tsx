export function AutomationCard() {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 p-6 text-white">
      <div className="relative z-10">
        <h3 className="mb-2 text-sm font-bold">Automate Migration</h3>
        <p className="mb-4 text-xs leading-relaxed text-slate-300">
          Upgrade legacy Python logic modules to Node.js 18 with AI-driven syntax translation.
        </p>
        <button
          type="button"
          className="w-full rounded border border-white/20 bg-white/10 py-2 text-xs font-bold backdrop-blur-sm transition-all hover:bg-white/20"
        >
          Start Logic Conversion
        </button>
      </div>
      <span className="material-symbols-outlined absolute -bottom-4 -right-4 rotate-12 text-8xl text-white/5 transition-transform duration-500 group-hover:rotate-0">
        bolt
      </span>
    </div>
  );
}
