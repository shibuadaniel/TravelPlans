import { NextResponse, type NextRequest } from "next/server";
import { applyCsp, contentSecurityPolicy } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/middleware";

function isPublic(pathname: string) {
  return (
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/api/csp-report" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/guest") ||
    pathname.startsWith("/api/documents")
  );
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname } = request.nextUrl;
  const { response, userId } = await updateSession(request, requestHeaders);
  applyCsp(response, csp);
  if (pathname.startsWith("/guest") || pathname.startsWith("/s/") || pathname === "/s") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (pathname.startsWith("/auth") && userId) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return applyCsp(redirect, csp);
  }

  if (isPublic(pathname)) return response;

  if (!userId) {
    const url = new URL("/auth/sign-in", request.url);
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return applyCsp(redirect, csp);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
