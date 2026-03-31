type DashboardFiltersProps = {
  clientName: string;
  startDate: string;
  endDate: string;
  cohortMode: 'non-cohort' | 'cohort';
  windowHours: '12' | '24' | '48' | '72';
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCohortModeChange: (value: 'non-cohort' | 'cohort') => void;
  onWindowHoursChange: (value: '12' | '24' | '48' | '72') => void;
  onApply: () => void;
  onReset: () => void;
};

export function DashboardFilters({
  clientName,
  startDate,
  endDate,
  cohortMode,
  windowHours,
  onStartDateChange,
  onEndDateChange,
  onCohortModeChange,
  onWindowHoursChange,
  onApply,
  onReset,
}: DashboardFiltersProps) {
  return (
    <section className="mb-8 rounded-xl border border-slate-200/15 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-6">
        <div className="w-auto min-w-[220px] flex-none">
          <label className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">Client</label>
          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800">
            {clientName || 'Unknown Client'}
          </div>
        </div>
        <div className="w-auto min-w-[340px] flex-none">
          <label className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">Date Range</label>
          <div className="flex h-10 items-center gap-2 rounded-lg bg-slate-100 px-3">
            <input
              type="date"
              aria-label="Start Date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="h-8 w-[132px] rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-300"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              aria-label="End Date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="h-8 w-[132px] rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-300"
            />
          </div>
        </div>
        <div className="w-40">
          <label className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">Cohort</label>
          <select
            aria-label="Cohort Mode"
            value={cohortMode}
            onChange={(event) => onCohortModeChange(event.target.value as 'non-cohort' | 'cohort')}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-300"
          >
            <option value="non-cohort">non-cohort</option>
            <option value="cohort">cohort</option>
          </select>
        </div>
        <div className="w-32">
          <label className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">Window</label>
          <select
            value={windowHours}
            onChange={(event) => onWindowHoursChange(event.target.value as '12' | '24' | '48' | '72')}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-300"
          >
            <option value="12">12h</option>
            <option value="24">24h</option>
            <option value="48">48h</option>
            <option value="72">72h</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600"
          >
            Apply
          </button>
        </div>
      </div>
    </section>
  );
}
