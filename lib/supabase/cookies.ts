export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

type CookieToSet = { name: string; value: string; options?: { maxAge?: number } };

// @supabase/ssr overwrites maxAge with 400 days after applying cookieOptions.
export function withSessionLifetime<T extends CookieToSet>(cookies: T[]): T[] {
  return cookies.map((cookie) => {
    if (cookie.options?.maxAge === 0) return cookie;
    return { ...cookie, options: { ...cookie.options, ...sessionCookieOptions } };
  });
}
