import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isAppOnlyInstall(): boolean {
  const flag = process.env.APP_ONLY_INSTALL;

  if (flag === "false") return false;
  if (flag === "true") return true;

  // Default behavior from this repository: app-only distribution.
  return true;
}

export function middleware(request: NextRequest) {
  if (!isAppOnlyInstall()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isWebRoute = pathname.startsWith("/web");
  const isLegacyMarketingRoute = pathname === "/welcome" || pathname === "/thank-you";

  if (!isWebRoute && !isLegacyMarketingRoute) {
    return NextResponse.next();
  }

  const target = new URL("/app", request.url);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/web/:path*", "/welcome", "/thank-you"],
};
