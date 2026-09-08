"use client";

import "temporal-polyfill/global";

/**
 * Installs the Temporal polyfill on browsers without a native implementation
 * (notably Safari / all iOS browsers). Rendered by the root layout so the
 * side effect runs before any page component that touches `Temporal` or
 * `Date.prototype.toTemporalInstant`. No-op wherever native support exists.
 */
export const TemporalPolyfill = () => null;
