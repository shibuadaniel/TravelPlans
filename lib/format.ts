import type { CarRental, Congregation, Flight, Stay } from "@/lib/types";

export function destinationKeyword(destination: string) {
  const trimmed = destination.trim();
  if (!trimmed) return "Untitled trip";
  const part = trimmed.split(/[,/-]/)[0]?.trim();
  return part || "Untitled trip";
}

export function displayDestination(destination: string) {
  const trimmed = destination.trim();
  return trimmed || "Untitled trip";
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "—";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function travelReturnLabel(travel: string | null, ret: string | null) {
  return `${formatShortDate(travel)} → ${formatShortDate(ret)}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function arrowRange(left: string, right: string) {
  if (!left && !right) return "";
  return `${left || "—"} → ${right || "—"}`;
}

export function flightTitle(flight: Flight, index: number) {
  return flight.airline.trim() || `Flight ${index + 1}`;
}

export function carTitle(car: CarRental, index: number) {
  return car.company.trim() || `Rental ${index + 1}`;
}

export function stayTitle(stay: Stay, index: number) {
  return stay.name.trim() || `Stay ${index + 1}`;
}

export function congregationTitle(congregation: Congregation, index: number) {
  return congregation.name.trim() || `Congregation ${index + 1}`;
}

export function pastelGradient(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  const hueTwo = (hue + 28) % 360;
  return `linear-gradient(160deg, hsl(${hue} 62% 82%) 0%, hsl(${hueTwo} 55% 74%) 100%)`;
}

export function safeInternalPath(value: string | undefined, fallback: string, options?: { allowAuth?: boolean }) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (!options?.allowAuth && trimmed.startsWith("/auth")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("@") || trimmed.includes("\0")) return fallback;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }
  const path = decoded.split("#")[0]?.split("?")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (!options?.allowAuth && path.startsWith("/auth")) return fallback;
  if (path.includes("\\") || path.includes("//") || path.split("/").includes("..")) return fallback;
  if (!/^\/[A-Za-z0-9/_\-.]*$/.test(path)) return fallback;
  return path;
}
