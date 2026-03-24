export function UrlRulesFooter() {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-slate-200 bg-white px-8 py-6 pr-[540px]">
      <div className="flex items-center gap-12">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Logic Executions (24h)</div>
          <div className="text-xl font-bold tracking-tight">
            1,208,412 <span className="ml-1 text-xs font-medium text-emerald-500">↑ 4%</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Function Reliability</div>
          <div className="text-xl font-bold tracking-tight">
            99.98% <span className="ml-1 text-xs font-medium text-slate-500">Stable</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Average Latency</div>
          <div className="text-xl font-bold tracking-tight">
            0.8ms <span className="material-symbols-outlined ml-1 text-sm text-emerald-500">bolt</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
        <span>
          Runtime Status: <span className="font-bold text-emerald-500">Scaling</span>
        </span>
        <span className="h-3 w-px bg-slate-200" />
        <span>v2.4.0-node-funcs</span>
      </div>
    </footer>
  );
}
