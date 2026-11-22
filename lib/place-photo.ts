import "server-only";

import { dbGet, dbRun } from "@/lib/db";
import { destinationKeyword } from "@/lib/format";
import type { PlacePhoto, TripListItem } from "@/lib/types";

const USER_AGENT = "WhereAreWe/1.0 (family trip briefing)";
const DAY_MS = 24 * 60 * 60 * 1000;

const ARCHITECTURE = [
  "architecture",
  "building",
  "cathedral",
  "church",
  "chapel",
  "basilica",
  "palace",
  "castle",
  "tower",
  "bridge",
  "museum",
  "monastery",
  "facade",
  "façade",
  "street",
  "alley",
  "square",
  "plaza",
  "monument",
  "skyline",
  "historic",
  "downtown",
  "house",
  "arch",
];

const AVOID = [
  "portrait",
  "selfie",
  "woman",
  "women",
  "man ",
  "people",
  "person",
  "graffiti",
  "flower",
  "leaf",
  "dog",
  "cat",
  "bird",
  "food",
  "pirate",
];

type PhotoRow = {
  image_url: string;
  credit: string;
  credit_url: string;
  fetched_at: string;
};

type Candidate = PlacePhoto & { score: number };

function placeKey(destination: string) {
  const trimmed = destination.trim().toLowerCase();
  if (!trimmed || destinationKeyword(destination) === "Untitled trip") return "";
  return trimmed;
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function allowedLicense(license: string) {
  const value = license.toLowerCase();
  if (!value) return false;
  if (value.includes("noncommercial") || value.includes("non-commercial") || value.includes("nc")) return false;
  if (value.includes("noderiv") || value.includes("no deriv")) return false;
  return value.includes("cc0") || value.includes("public domain") || value.includes("cc by") || value === "pdm";
}

function hasWord(text: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "iu").test(text);
}

function scoreTitle(title: string, place: string) {
  let score = 0;
  for (const word of ARCHITECTURE) {
    if (hasWord(title, word)) score += 3;
  }
  for (const word of AVOID) {
    if (hasWord(title, word)) score -= 5;
  }
  if (hasWord(title, place)) score += 2;
  return score;
}

type CommonsPage = {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    mime?: string;
    descriptionurl?: string;
    extmetadata?: {
      LicenseShortName?: { value?: string };
      Artist?: { value?: string };
    };
  }[];
};

async function commonsCandidates(params: URLSearchParams, place: string) {
  params.set("action", "query");
  params.set("format", "json");
  params.set("prop", "imageinfo");
  params.set("iiprop", "url|mime|extmetadata");
  params.set("iiurlwidth", "960");
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(payload.query?.pages ?? {});
  const candidates: Candidate[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value ?? "";
    const url = info?.thumburl ?? "";
    if (!info || !url.startsWith("https://") || !info.mime?.startsWith("image/")) continue;
    if (info.mime.includes("svg")) continue;
    if (!allowedLicense(license)) continue;
    const title = (page.title ?? "").replace(/^File:/, "");
    const width = info.thumbwidth ?? 0;
    const height = info.thumbheight ?? 0;
    let score = scoreTitle(title, place);
    if (width >= height && width > 0) score += 2;
    const artist = plainText(info.extmetadata?.Artist?.value ?? "") || "Wikimedia Commons";
    const shortLicense = plainText(license);
    candidates.push({
      url,
      credit: `${artist} · ${shortLicense}`,
      creditUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title ?? "")}`,
      score,
    });
  }
  return candidates;
}

async function geocode(place: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(place)}`,
    {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const hits = (await response.json()) as { lat?: string; lon?: string }[];
  const lat = Number(hits[0]?.lat);
  const lon = Number(hits[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function searchPlacePhoto(place: string): Promise<PlacePhoto | null> {
  const candidates: Candidate[] = [];
  const point = await geocode(place).catch(() => null);
  if (point) {
    const nearby = new URLSearchParams({
      generator: "geosearch",
      ggsprimary: "all",
      ggsnamespace: "6",
      ggsradius: "8000",
      ggscoord: `${point.lat}|${point.lon}`,
      ggslimit: "20",
    });
    candidates.push(...(await commonsCandidates(nearby, place).catch(() => [])));
  }
  const strong = candidates.filter((item) => item.score >= 2);
  if (strong.length < 4) {
    const keyword = new URLSearchParams({
      generator: "search",
      gsrsearch: `${place} architecture`,
      gsrnamespace: "6",
      gsrlimit: "12",
    });
    candidates.push(...(await commonsCandidates(keyword, place).catch(() => [])));
  }
  const pool = candidates.filter((item) => item.score >= 2);
  const choices = pool.length > 0 ? pool : candidates.filter((item) => item.score >= 0);
  if (choices.length === 0) return null;
  const best = Math.max(...choices.map((item) => item.score));
  const top = choices.filter((item) => item.score >= best - 1);
  const picked = top[Math.floor(Math.random() * top.length)];
  if (!picked) return null;
  return { url: picked.url, credit: picked.credit, creditUrl: picked.creditUrl };
}

async function readCache(key: string) {
  return dbGet<PhotoRow>(
    "SELECT image_url, credit, credit_url, fetched_at FROM place_photos WHERE place_key = ?",
    key,
  );
}

async function writeCache(key: string, photo: PlacePhoto | null) {
  await dbRun(
    `INSERT INTO place_photos (place_key, image_url, credit, credit_url, fetched_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(place_key) DO UPDATE SET
       image_url = excluded.image_url,
       credit = excluded.credit,
       credit_url = excluded.credit_url,
       fetched_at = excluded.fetched_at`,
    key,
    photo?.url ?? "",
    photo?.credit ?? "",
    photo?.creditUrl ?? "",
    new Date().toISOString(),
  );
}

function fresh(row: PhotoRow) {
  const fetched = Date.parse(row.fetched_at);
  if (!Number.isFinite(fetched)) return false;
  if (row.image_url) return true;
  return Date.now() - fetched < DAY_MS;
}

async function photoForDestination(destination: string): Promise<PlacePhoto | null> {
  const key = placeKey(destination);
  if (!key) return null;
  const cached = await readCache(key);
  if (cached && fresh(cached)) {
    if (!cached.image_url) return null;
    return { url: cached.image_url, credit: cached.credit, creditUrl: cached.credit_url };
  }
  const photo = await searchPlacePhoto(destination.trim()).catch(() => null);
  await writeCache(key, photo);
  return photo;
}

const placePhotosReady = globalThis as { travelPlacePhotos?: Promise<void> };

function ensurePlacePhotos() {
  placePhotosReady.travelPlacePhotos ??= (async () => {
    try {
      await dbRun("SELECT place_key FROM place_photos LIMIT 0");
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
      if (code !== "42P01") throw error;
      await dbRun(`
        CREATE TABLE IF NOT EXISTS place_photos (
          place_key TEXT PRIMARY KEY,
          image_url TEXT NOT NULL DEFAULT '',
          credit TEXT NOT NULL DEFAULT '',
          credit_url TEXT NOT NULL DEFAULT '',
          fetched_at TEXT NOT NULL
        )
      `);
    }
  })().catch((error) => {
    placePhotosReady.travelPlacePhotos = undefined;
    throw error;
  });
  return placePhotosReady.travelPlacePhotos;
}

export async function withPlacePhotos(trips: TripListItem[]): Promise<TripListItem[]> {
  try {
    await ensurePlacePhotos();
    const keys = new Map<string, Promise<PlacePhoto | null>>();
    for (const trip of trips) {
      const key = placeKey(trip.destination);
      if (key && !keys.has(key)) keys.set(key, photoForDestination(trip.destination));
    }
    await Promise.all(keys.values());
    const resolved = new Map<string, PlacePhoto | null>();
    for (const [key, pending] of keys) {
      resolved.set(key, await pending);
    }
    return trips.map((trip) => ({
      ...trip,
      photo: resolved.get(placeKey(trip.destination)) ?? null,
    }));
  } catch {
    return trips;
  }
}
