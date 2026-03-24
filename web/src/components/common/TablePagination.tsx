type TablePaginationProps = {
  summary: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

function buildPageNumbers(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, 5];
  }

  if (page >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [page - 2, page - 1, page, page + 1, page + 2];
}

export function TablePagination({ summary, page, totalPages, onPageChange }: TablePaginationProps) {
  const hasPagination = typeof page === 'number' && typeof totalPages === 'number' && totalPages > 0 && Boolean(onPageChange);

  if (!hasPagination) {
    return (
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-xs font-medium text-slate-500">
        <span>{summary}</span>
      </div>
    );
  }

  const pages = buildPageNumbers(page, totalPages);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-xs font-medium text-slate-500">
      <span>{summary}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onPageChange?.(page - 1)}
          className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        {pages.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange?.(num)}
            className={
              num === page
                ? 'rounded border border-blue-700 bg-blue-700 px-3 py-1 text-white'
                : 'rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50'
            }
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange?.(page + 1)}
          className="rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
