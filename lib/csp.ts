export function supabaseOrigin() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "https://*.supabase.co";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://*.supabase.co";
  }
}

export function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://upload.wikimedia.org https://thumb.wikimedia.org",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin()}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-to csp-endpoint",
  ].join("; ");
}

export function reportingEndpoints() {
  return 'csp-endpoint="/api/csp-report"';
}

export function applyCsp(response: { headers: Headers }, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Reporting-Endpoints", reportingEndpoints());
  return response;
}
