import type { MetricTone } from './dashboardData';

export function MetricCard({
  title,
  value,
  note,
  icon,
  tone,
  progress,
}: {
  title: string;
  value: string;
  note: string;
  icon: string;
  tone: MetricTone;
  progress?: number;
}) {
  const noteClass =
    tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : 'text-slate-500';

  const iconClass =
    tone === 'positive'
      ? 'text-blue-600 bg-blue-50'
      : tone === 'negative'
        ? 'text-slate-400'
        : 'text-slate-400';

  return (
    <article className="rounded-xl border border-slate-200/60 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <span className={`material-symbols-outlined rounded p-1.5 text-lg ${iconClass}`}>{icon}</span>
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${noteClass}`}>
        {tone === 'positive' && <span className="material-symbols-outlined text-sm">trending_up</span>}
        {tone === 'negative' && <span className="material-symbols-outlined text-sm">trending_down</span>}
        {note}
      </div>
      {typeof progress === 'number' ? (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-700" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </article>
  );
}
