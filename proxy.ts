import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/sign-in", "/sign-up"]);

export const proxy = (request: NextRequest) => {
  // Optimistic check only — the real validation is server-side, in each page's
  // `requireSession()` (see `lib/auth/dal.ts`), which is where the session is
  // read close to the data. Public paths are never redirected here: a stale
  // cookie must not bounce users away from /sign-in, or the page's own check
  // would send them back forever.
  if (
    !PUBLIC_PATHS.has(request.nextUrl.pathname) &&
    !getSessionCookie(request)
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
