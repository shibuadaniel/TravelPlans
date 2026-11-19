"use server";

import { getCurrentUser } from "@/lib/current";
import { cleanJwUrl } from "@/lib/urls";
import type { CongregationSuggestion, Result } from "@/lib/types";

type NominatimHit = { lat?: string; lon?: string };
type OverpassElement = {
  id?: number;
  type?: string;
  tags?: Record<string, string>;
};

function addressFromTags(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return [street, tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ") || tags["addr:full"] || "";
}

export async function searchCongregations(query: string): Promise<Result<CongregationSuggestion[]>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ok: false, error: "Enter a city or region." };

  try {
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`,
      {
        headers: { "User-Agent": "WhereAreWe/1.0 (family trip briefing)", Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!geoResponse.ok) {
      return { ok: false, error: "Search is unavailable right now. Add the congregation manually." };
    }
    const geo = (await geoResponse.json()) as NominatimHit[];
    const lat = Number(geo[0]?.lat);
    const lon = Number(geo[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { ok: false, error: "Couldn't find that place. Try a larger city." };
    }

    const overpass = `
      [out:json][timeout:20];
      (
        node["amenity"="place_of_worship"]["denomination"~"jehovah",i](around:25000,${lat},${lon});
        way["amenity"="place_of_worship"]["denomination"~"jehovah",i](around:25000,${lat},${lon});
        node["name"~"Kingdom Hall",i](around:25000,${lat},${lon});
        way["name"~"Kingdom Hall",i](around:25000,${lat},${lon});
      );
      out center tags;
    `;
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: `data=${encodeURIComponent(overpass)}`,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return { ok: false, error: "Search is unavailable right now. Add the congregation manually." };
    }
    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const seen = new Set<string>();
    const suggestions: CongregationSuggestion[] = [];
    for (const element of payload.elements ?? []) {
      const tags = element.tags ?? {};
      const name = (tags.name || "Kingdom Hall").trim();
      const address = addressFromTags(tags);
      const key = `${name}|${address}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const website = tags.website || tags["contact:website"] || "";
      suggestions.push({
        id: `${element.type ?? "node"}-${element.id ?? suggestions.length}`,
        name,
        address,
        jwOrgUrl: cleanJwUrl(website),
      });
      if (suggestions.length >= 8) break;
    }
    suggestions.sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, data: suggestions };
  } catch {
    return { ok: false, error: "Search is unavailable right now. Add the congregation manually." };
  }
}
