import { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { getReportTypeLabel, type ReportType } from '../reports/attributionConfig';

type DashboardFiltersProps = {
  clientName: string;
  reportType: ReportType;
  showCohortWindowFilters?: boolean;
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
  reportType,
  showCohortWindowFilters = true,
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
  const reportTypeLabel = getReportTypeLabel(reportType);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
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

  function handleDateRangeSelect(range: DateRange | undefined) {
    onStartDateChange(range?.from ? formatDateInput(range.from) : '');
    onEndDateChange(range?.to ? formatDateInput(range.to) : '');
  }

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
              className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition-colors hover:border-slate-300"
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
        {showCohortWindowFilters ? (
          <>
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
            <div className="w-56">
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
          </>
        ) : null}
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
