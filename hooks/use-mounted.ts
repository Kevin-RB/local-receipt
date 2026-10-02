import { useSyncExternalStore } from "react";

/**
 * Subscribes to nothing, because nothing can change: the snapshot is a
 * constant, so React has no reason to re-read it after the first render. The
 * inner function is the unsubscribe callback and is never called.
 */
const neverChanges = () => () => 0;

/**
 * `false` while rendering on the server and on the first client render, `true`
 * from the second client render onwards.
 *
 * For state that only exists in the browser — the resolved theme, the user's
 * clock — reading it during the first render produces markup React then has to
 * correct, because the server had no way to know it. Gating on this hook keeps
 * the server and the first client render in agreement and lets the real value
 * appear immediately after, with no hydration warning.
 */
export const useMounted = () =>
  useSyncExternalStore(
    neverChanges,
    () => true,
    () => false
  );
