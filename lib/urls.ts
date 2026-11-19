export function cleanJwUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return "";
    if (host !== "jw.org" && host !== "www.jw.org") return "";
    return url.toString();
  } catch {
    return "";
  }
}
