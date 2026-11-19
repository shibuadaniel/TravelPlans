import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function isPublic(pathname: string) {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/guest") ||
    pathname.startsWith("/api/documents")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId } = await updateSession(request);

  if (pathname.startsWith("/auth") && userId) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (isPublic(pathname)) return response;

  if (!userId) {
    const url = new URL("/auth/sign-in", request.url);
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
