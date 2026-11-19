import "server-only";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { dbGet, dbRun } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function clientAddress() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "unknown";
}

let ready: Promise<void> | null = null;

function ensureTable() {
  ready ??= (async () => {
    await dbRun(
      `CREATE TABLE IF NOT EXISTS auth_attempts (
        id text primary key,
        attempt_key text not null,
        created_at text not null
      )`,
    );
    await dbRun("CREATE INDEX IF NOT EXISTS idx_auth_attempts_key ON auth_attempts (attempt_key, created_at)");
    await dbRun("ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY");
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function countRecent(key: string, cutoff: string) {
  const row = await dbGet<{ count: number }>(
    "SELECT COUNT(*) AS count FROM auth_attempts WHERE attempt_key = ? AND created_at >= ?",
    key,
    cutoff,
  );
  return Number(row?.count ?? 0);
}

export async function assertAuthAttemptAllowed(email: string) {
  await ensureTable();
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  await dbRun("DELETE FROM auth_attempts WHERE created_at < ?", cutoff);
  const ipKey = hashKey(`ip:${await clientAddress()}`);
  const emailKey = hashKey(`email:${email.trim().toLowerCase()}`);
  const [byIp, byEmail] = await Promise.all([countRecent(ipKey, cutoff), countRecent(emailKey, cutoff)]);
  if (byIp >= MAX_ATTEMPTS || byEmail >= MAX_ATTEMPTS) {
    return { ok: false as const, error: "Too many attempts. Try again in a few minutes." };
  }
  const stamp = new Date().toISOString();
  await dbRun("INSERT INTO auth_attempts (id, attempt_key, created_at) VALUES (?, ?, ?)", crypto.randomUUID(), ipKey, stamp);
  await dbRun("INSERT INTO auth_attempts (id, attempt_key, created_at) VALUES (?, ?, ?)", crypto.randomUUID(), emailKey, stamp);
  return { ok: true as const };
}

const PIN_WINDOW_MS = 15 * 60 * 1000;
const PIN_MAX_ATTEMPTS = 5;

async function sharePinKeys(shareId: string) {
  await ensureTable();
  const cutoff = new Date(Date.now() - PIN_WINDOW_MS).toISOString();
  await dbRun("DELETE FROM auth_attempts WHERE created_at < ?", cutoff);
  const ipKey = hashKey(`pin-ip:${await clientAddress()}`);
  const shareKey = hashKey(`pin-share:${shareId}`);
  const [byIp, byShare] = await Promise.all([countRecent(ipKey, cutoff), countRecent(shareKey, cutoff)]);
  return { byIp, byShare, ipKey, shareKey };
}

export async function assertSharePinAllowed(shareId: string) {
  const counts = await sharePinKeys(shareId);
  if (counts.byIp >= PIN_MAX_ATTEMPTS || counts.byShare >= PIN_MAX_ATTEMPTS) {
    return { ok: false as const, error: "Too many attempts. Try again in a few minutes." };
  }
  return { ok: true as const };
}

export async function recordSharePinFailure(shareId: string) {
  const counts = await sharePinKeys(shareId);
  const stamp = new Date().toISOString();
  await dbRun("INSERT INTO auth_attempts (id, attempt_key, created_at) VALUES (?, ?, ?)", crypto.randomUUID(), counts.ipKey, stamp);
  await dbRun(
    "INSERT INTO auth_attempts (id, attempt_key, created_at) VALUES (?, ?, ?)",
    crypto.randomUUID(),
    counts.shareKey,
    stamp,
  );
}
