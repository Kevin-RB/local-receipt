import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/sign-in", "/sign-up"]);

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    if (getSessionCookie(request)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Optimistic check only — real validation happens server-side in layouts/routes.
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
