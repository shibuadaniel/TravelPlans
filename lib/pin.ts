import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT = { N: 16384, r: 8, p: 1 } as const;

export function normalizePin(value: string) {
  const pin = value.trim();
  if (!/^\d{4,8}$/.test(pin)) return null;
  return pin;
}

export function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPin(pin: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(pin, Buffer.from(salt, "base64url"), 32, SCRYPT);
  const expected = Buffer.from(hash, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
