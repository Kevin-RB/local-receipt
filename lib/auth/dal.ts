import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

/**
 * The signed-in session for the current request, memoized for the render pass.
 *
 * Next.js recommends a Data Access Layer that verifies the session as close to
 * the data as possible, and memoizing it with React's `cache` so a single
 * request does not look the session up twice — a layout and its page both
 * needing it is the common case. The memo lasts one request and is never shared
 * across requests or users; it is a de-duplication, not a cache of the session.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);

/**
 * `getSession` or a redirect to sign-in.
 *
 * Prefer this in pages and layouts that render user data. Route handlers pass
 * their own `request.headers`, so they keep calling `auth.api.getSession`
 * directly.
 */
export const requireSession = cache(async () => {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
});
