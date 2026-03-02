type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
};

const getPages = (page: number, totalPages: number) => {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(page);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);
  return Array.from(pages).sort((a, b) => a - b);
};

export default function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pages = getPages(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <span>
        Page {page} of {totalPages} • {total} results
      </span>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
        >
          Prev
        </button>

        {pages.map((p) => (
          <button
            key={p}
            className={`rounded-md border px-3 py-1 text-xs font-semibold ${
              p === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-700'
            }`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
