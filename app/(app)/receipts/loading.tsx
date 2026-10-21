import { Skeleton } from "@/components/ui/skeleton";

/** Rows of placeholder table, so the segment does not pop in all at once. */
const SKELETON_ROWS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Segment fallback for `/receipts`. The route is a single async render — the
 * session and every receipt — so without this a client-side navigation shows
 * nothing until the whole table is ready. This paints the shell immediately.
 *
 * The placeholder takes the same shape as the loaded view: cards on a phone,
 * rows of table from `md` up.
 */
const ReceiptsLoading = () => (
  <main className="container mx-auto flex flex-col gap-6 p-6">
    <Skeleton className="mx-auto h-44 w-full max-w-md" />
    <div className="mx-auto flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {SKELETON_ROWS.map((row) => (
          <div className="flex flex-col gap-2 rounded-lg border p-3" key={row}>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-md border md:block">
        {SKELETON_ROWS.map((row) => (
          <div
            className="flex items-center gap-4 border-b p-3 last:border-0"
            key={row}
          >
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  </main>
);

export default ReceiptsLoading;
