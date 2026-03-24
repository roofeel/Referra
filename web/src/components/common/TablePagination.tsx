type TablePaginationProps = {
  summary: string;
};

export function TablePagination({ summary }: TablePaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-xs font-medium text-slate-500">
      <span>{summary}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button type="button" className="rounded border border-blue-700 bg-blue-700 px-3 py-1 text-white">
          1
        </button>
        <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50">
          2
        </button>
        <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50">
          3
        </button>
        <span className="mx-1">...</span>
        <button type="button" className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50">
          Next
        </button>
      </div>
    </div>
  );
}
