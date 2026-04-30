import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { getReportTypeLabel, type ReportType } from '../reports/attributionConfig';

type DashboardFiltersProps = {
  clientName: string;
  reportType: ReportType;
  referrerTypeOptions?: string[];
  showCohortWindowFilters?: boolean;
  showReferrerTypeFilter?: boolean;
  startDate: string;
  endDate: string;
  cohortMode: 'non-cohort' | 'cohort';
  windowHours: '12' | '24' | '48' | '72';
  showFirstPageLoadFilters?: boolean;
  baseDurationEnabled?: boolean;
  impressionToFirstPageLoadHours?: '' | '12' | '24' | '48' | '72';
  impressionToFirstPageLoadEnabled?: boolean;
  firstPageLoadToRegistrationHours?: '' | '12' | '24' | '48' | '72';
  firstPageLoadToRegistrationEnabled?: boolean;
  durationFilterOperator?: 'and' | 'or';
  referrerType?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCohortModeChange: (value: 'non-cohort' | 'cohort') => void;
  onWindowHoursChange: (value: '12' | '24' | '48' | '72') => void;
  onBaseDurationEnabledChange?: (enabled: boolean) => void;
  onImpressionToFirstPageLoadHoursChange?: (value: '' | '12' | '24' | '48' | '72') => void;
  onImpressionToFirstPageLoadEnabledChange?: (enabled: boolean) => void;
  onFirstPageLoadToRegistrationHoursChange?: (value: '' | '12' | '24' | '48' | '72') => void;
  onFirstPageLoadToRegistrationEnabledChange?: (enabled: boolean) => void;
  onDurationFilterOperatorChange?: (value: 'and' | 'or') => void;
  onReferrerTypeChange?: (value: string) => void;
  onApply: () => void;
  onExport?: () => void;
  onReset: () => void;
};

export function DashboardFilters({
  clientName,
  reportType,
  referrerTypeOptions = [],
  showCohortWindowFilters = true,
  showReferrerTypeFilter = showCohortWindowFilters,
  startDate,
  endDate,
  cohortMode,
  windowHours,
  showFirstPageLoadFilters = false,
  baseDurationEnabled = true,
  impressionToFirstPageLoadHours = '',
  impressionToFirstPageLoadEnabled = false,
  firstPageLoadToRegistrationHours = '',
  firstPageLoadToRegistrationEnabled = false,
  durationFilterOperator = 'and',
  referrerType = '',
  onStartDateChange,
  onEndDateChange,
  onCohortModeChange,
  onWindowHoursChange,
  onBaseDurationEnabledChange,
  onImpressionToFirstPageLoadHoursChange,
  onImpressionToFirstPageLoadEnabledChange,
  onFirstPageLoadToRegistrationHoursChange,
  onFirstPageLoadToRegistrationEnabledChange,
  onDurationFilterOperatorChange,
  onReferrerTypeChange,
  onApply,
  onExport,
  onReset,
}: DashboardFiltersProps) {
  const reportTypeLabel = getReportTypeLabel(reportType);
  const referrerTypeId = useId();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);
  const [isDurationConfigOpen, setIsDurationConfigOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const durationConfigRef = useRef<HTMLDivElement | null>(null);
  const [visibleDurationFilters, setVisibleDurationFilters] = useState(() => ({
    base: true,
    impressionToFirstPageLoad: impressionToFirstPageLoadEnabled,
    firstPageLoadToRegistration: firstPageLoadToRegistrationEnabled,
  }));
  const dateRange = useMemo<DateRange | undefined>(() => {
    return {
      from: parseDateInput(startDate),
      to: parseDateInput(endDate),
    };
  }, [endDate, startDate]);
  const dateRangeLabel = useMemo(() => {
    const from = parseDateInput(startDate);
    const to = parseDateInput(endDate);
    if (from && to) return `${formatHumanDate(from)} - ${formatHumanDate(to)}`;
    if (from) return `${formatHumanDate(from)} - End`;
    if (to) return `Start - ${formatHumanDate(to)}`;
    return 'Select date range';
  }, [endDate, startDate]);
  const advancedFilterHints = useMemo(() => {
    const hints: string[] = [];
    hints.push(`Cohort: ${cohortMode}`);

    if (!showFirstPageLoadFilters) {
      if (showCohortWindowFilters) {
        hints.push(`Window <= ${windowHours}h`);
      }
      return hints;
    }

    const durationHints: string[] = [];
    if (visibleDurationFilters.base && baseDurationEnabled) {
      durationHints.push(`Impression->Registration <= ${windowHours}h`);
    }
    if (visibleDurationFilters.impressionToFirstPageLoad && impressionToFirstPageLoadEnabled) {
      durationHints.push(`Impression->First Page Load <= ${impressionToFirstPageLoadHours || '24'}h`);
    }
    if (visibleDurationFilters.firstPageLoadToRegistration && firstPageLoadToRegistrationEnabled) {
      durationHints.push(`First Page Load->Registration <= ${firstPageLoadToRegistrationHours || '24'}h`);
    }
    if (durationHints.length > 0) {
      hints.push(`Match: ${durationFilterOperator.toUpperCase()}`);
      hints.push(...durationHints);
    }
    return hints;
  }, [
    baseDurationEnabled,
    cohortMode,
    durationFilterOperator,
    firstPageLoadToRegistrationEnabled,
    firstPageLoadToRegistrationHours,
    impressionToFirstPageLoadEnabled,
    impressionToFirstPageLoadHours,
    showCohortWindowFilters,
    showFirstPageLoadFilters,
    visibleDurationFilters.base,
    visibleDurationFilters.firstPageLoadToRegistration,
    visibleDurationFilters.impressionToFirstPageLoad,
    windowHours,
  ]);
  const durationAdvancedHints = useMemo(() => {
    if (!showFirstPageLoadFilters) return [];
    const hints: string[] = [];
    if (visibleDurationFilters.base && baseDurationEnabled) {
      hints.push(`Impression->Registration <= ${windowHours}h`);
    }
    if (visibleDurationFilters.impressionToFirstPageLoad && impressionToFirstPageLoadEnabled) {
      hints.push(`Impression->First Page Load <= ${impressionToFirstPageLoadHours || '24'}h`);
    }
    if (visibleDurationFilters.firstPageLoadToRegistration && firstPageLoadToRegistrationEnabled) {
      hints.push(`First Page Load->Registration <= ${firstPageLoadToRegistrationHours || '24'}h`);
    }
    return hints;
  }, [
    baseDurationEnabled,
    firstPageLoadToRegistrationEnabled,
    firstPageLoadToRegistrationHours,
    impressionToFirstPageLoadEnabled,
    impressionToFirstPageLoadHours,
    showFirstPageLoadFilters,
    visibleDurationFilters.base,
    visibleDurationFilters.firstPageLoadToRegistration,
    visibleDurationFilters.impressionToFirstPageLoad,
    windowHours,
  ]);

  useEffect(() => {
    if (!isDatePickerOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!datePickerRef.current) return;
      if (event.target instanceof Node && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!isDurationConfigOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!durationConfigRef.current) return;
      if (event.target instanceof Node && !durationConfigRef.current.contains(event.target)) {
        setIsDurationConfigOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDurationConfigOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isDurationConfigOpen]);

  useEffect(() => {
    if (!isAdvancedDrawerOpen) return undefined;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdvancedDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isAdvancedDrawerOpen]);

  function handleDateRangeSelect(range: DateRange | undefined) {
    onStartDateChange(range?.from ? formatDateInput(range.from) : '');
    onEndDateChange(range?.to ? formatDateInput(range.to) : '');
  }

  return (
    <section className="mb-8 rounded-xl border border-slate-200/15 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-6">
        <div className="w-auto min-w-[220px] flex-none">
          <label className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">Client</label>
          <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800">
            {clientName || 'Unknown Client'}
          </div>
        </div>
        <div className="w-auto min-w-[220px] flex-none">
          <label className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">Date Range</label>
          <div className="relative" ref={datePickerRef}>
            <input
              type="text"
              aria-label="Start Date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="sr-only"
            />
            <input
              type="text"
              aria-label="End Date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
              className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 outline-none transition-colors hover:border-slate-300"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">calendar_today</span>
              <span className="flex-1 text-left">{dateRangeLabel}</span>
              <span className="material-symbols-outlined text-base text-slate-500">
                {isDatePickerOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {isDatePickerOpen ? (
              <div className="absolute left-0 top-12 z-30 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <DayPicker mode="range" numberOfMonths={2} selected={dateRange} onSelect={handleDateRangeSelect} />
              </div>
            ) : null}
          </div>
        </div>
        {showReferrerTypeFilter ? (
          <>
            <div className="w-52">
              <label htmlFor={referrerTypeId} className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500">
                Referrer Type
              </label>
              <select
                id={referrerTypeId}
                value={referrerType}
                onChange={(event) => onReferrerTypeChange?.(event.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-300"
              >
                <option value="">All</option>
                {referrerTypeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
                  {showCohortWindowFilters ? (
            <div className="w-full flex flex-wrap items-center justify-start gap-1.5 self-stretch">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Advanced filters:</span>
              {advancedFilterHints.length === 0 ? (
                <span className="text-xs text-slate-400">None</span>
              ) : (
                <>
                  {advancedFilterHints
                    .filter((hint) => !hint.startsWith('Match:') && !hint.includes('->'))
                    .map((hint) => (
                      <span key={hint} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {hint}
                      </span>
                    ))}
                  {durationAdvancedHints.map((hint, index) => (
                    <span key={hint} className="contents">
                      {index > 0 ? (
                        <span className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {durationFilterOperator.toUpperCase()}
                        </span>
                      ) : null}
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{hint}</span>
                    </span>
                  ))}
                </>
              )}
            </div>
          ) : null}
        <div className="ml-auto flex flex-col items-end gap-1.5">

          <div className="flex items-center gap-1.5 self-end">
            {showCohortWindowFilters ? (
              <button
                type="button"
                onClick={() => setIsAdvancedDrawerOpen(true)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Advances
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReset}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onApply}
              className="rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-600"
            >
              Apply
            </button>
            {onExport ? (
              <button
                type="button"
                onClick={onExport}
                className="rounded-md bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Export
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {isAdvancedDrawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/25"
            aria-label="Close advances"
            onClick={() => setIsAdvancedDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-[420px] max-w-[92vw] overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Advances</h3>
              <button
                type="button"
                onClick={() => setIsAdvancedDrawerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close advances drawer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
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

              {!showFirstPageLoadFilters ? (
                <div>
                  <label
                    className="mb-2 flex h-4 items-center text-[10px] font-bold uppercase text-slate-500"
                    title={reportTypeLabel}
                  >
                    {`Window · ${reportTypeLabel}`}
                  </label>
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
              ) : null}

              {showFirstPageLoadFilters ? (
                <div className="bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Duration Filters</p>
                    <div className="relative" ref={durationConfigRef}>
                      <button
                        type="button"
                        onClick={() => setIsDurationConfigOpen((prev) => !prev)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                        aria-label="Configure duration filters"
                      >
                        <span className="material-symbols-outlined text-base">settings</span>
                      </button>
                      {isDurationConfigOpen ? (
                        <div className="absolute right-0 top-9 z-40 w-[200px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Show Controls</p>
                          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={visibleDurationFilters.base}
                              onChange={(event) =>
                                setVisibleDurationFilters((prev) => ({ ...prev, base: event.target.checked }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Impression -&gt; Registration
                          </label>
                          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={visibleDurationFilters.impressionToFirstPageLoad}
                              onChange={(event) =>
                                setVisibleDurationFilters((prev) => ({
                                  ...prev,
                                  impressionToFirstPageLoad: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Impression -&gt; First Page Load
                          </label>
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                            <input
                              type="checkbox"
                              checked={visibleDurationFilters.firstPageLoadToRegistration}
                              onChange={(event) =>
                                setVisibleDurationFilters((prev) => ({
                                  ...prev,
                                  firstPageLoadToRegistration: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            First Page Load -&gt; Registration
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Match</label>
                    <select
                      value={durationFilterOperator}
                      onChange={(event) => onDurationFilterOperatorChange?.(event.target.value as 'and' | 'or')}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-300"
                    >
                      <option value="and">ALL</option>
                      <option value="or">ANY</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    {visibleDurationFilters.base ? (
                      <div className="rounded-md border border-slate-200 bg-white p-2">
                        <label className="mb-2 flex items-start gap-2 text-xs font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={baseDurationEnabled}
                            onChange={(event) => onBaseDurationEnabledChange?.(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Impression -&gt; Registration</span>
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500">&lt;=</span>
                          <select
                            value={windowHours}
                            disabled={!baseDurationEnabled}
                            onChange={(event) => onWindowHoursChange(event.target.value as '12' | '24' | '48' | '72')}
                            className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="12">12h</option>
                            <option value="24">24h</option>
                            <option value="48">48h</option>
                            <option value="72">72h</option>
                          </select>
                        </div>
                      </div>
                    ) : null}
                    {visibleDurationFilters.impressionToFirstPageLoad ? (
                      <div className="rounded-md border border-slate-200 bg-white p-2">
                        <label className="mb-2 flex items-start gap-2 text-xs font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={impressionToFirstPageLoadEnabled}
                            onChange={(event) => onImpressionToFirstPageLoadEnabledChange?.(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Impression -&gt; First Page Load</span>
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500">&lt;=</span>
                          <select
                            value={impressionToFirstPageLoadHours || '24'}
                            disabled={!impressionToFirstPageLoadEnabled}
                            onChange={(event) =>
                              onImpressionToFirstPageLoadHoursChange?.(event.target.value as '' | '12' | '24' | '48' | '72')
                            }
                            className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="12">12h</option>
                            <option value="24">24h</option>
                            <option value="48">48h</option>
                            <option value="72">72h</option>
                          </select>
                        </div>
                      </div>
                    ) : null}
                    {visibleDurationFilters.firstPageLoadToRegistration ? (
                      <div className="rounded-md border border-slate-200 bg-white p-2">
                        <label className="mb-2 flex items-start gap-2 text-xs font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={firstPageLoadToRegistrationEnabled}
                            onChange={(event) => onFirstPageLoadToRegistrationEnabledChange?.(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>First Page Load -&gt; Registration</span>
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500">&lt;=</span>
                          <select
                            value={firstPageLoadToRegistrationHours || '24'}
                            disabled={!firstPageLoadToRegistrationEnabled}
                            onChange={(event) =>
                              onFirstPageLoadToRegistrationHoursChange?.(event.target.value as '' | '12' | '24' | '48' | '72')
                            }
                            className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="12">12h</option>
                            <option value="24">24h</option>
                            <option value="48">48h</option>
                            <option value="72">72h</option>
                          </select>
                        </div>
                      </div>
                    ) : null}
                    {!visibleDurationFilters.base &&
                    !visibleDurationFilters.impressionToFirstPageLoad &&
                    !visibleDurationFilters.firstPageLoadToRegistration ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white/80 p-2 text-xs text-slate-500">
                        Use settings to select filters
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function parseDateInput(value: string) {
  if (!value) return undefined;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts;
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHumanDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
