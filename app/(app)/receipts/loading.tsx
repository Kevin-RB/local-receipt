import { Skeleton } from "@/components/ui/skeleton";

/** Rows of placeholder table, so the segment does not pop in all at once. */
const SKELETON_ROWS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Segment fallback for `/receipts`. The route is a single async render — the
 * session and every receipt — so without this a client-side navigation shows
 * nothing until the whole table is ready. This paints the shell immediately.
 */
const ReceiptsLoading = () => (
  <main className="container mx-auto flex flex-col gap-6 p-6">
    <Skeleton className="mx-auto h-44 w-full max-w-md" />
    <div className="mx-auto flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="overflow-hidden rounded-md border">
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
