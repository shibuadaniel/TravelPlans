import "server-only";

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { dbGet, dbRun, transaction } from "@/lib/db";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function codeHash(email: string, code: string) {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${secret}:${email}:${code}`).digest("hex");
}

function hashesMatch(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const ready = globalThis as { travelEmailCodes?: Promise<void> };

function ensureEmailCodes() {
  ready.travelEmailCodes ??= (async () => {
    try {
      await dbRun("SELECT id FROM guest_email_codes LIMIT 0");
      return;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
      if (code !== "42P01") throw error;
    }
    await transaction(async () => {
      await dbRun("SET LOCAL lock_timeout = '3s'");
      await dbRun(
        `CREATE TABLE IF NOT EXISTS guest_email_codes (
          id text primary key,
          trip_id text not null,
          share_id text not null,
          email text not null,
          code_hash text not null,
          expires_at text not null,
          attempts integer not null default 0,
          created_at text not null
        )`,
      );
      await dbRun("ALTER TABLE guest_email_codes ENABLE ROW LEVEL SECURITY");
    });
  })().catch((error) => {
    ready.travelEmailCodes = undefined;
    throw error;
  });
  return ready.travelEmailCodes;
}

export function createEmailCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function saveEmailCode(tripId: string, shareId: string, email: string, code: string) {
  await ensureEmailCodes();
  const expires = new Date(Date.now() + TEN_MINUTES_MS).toISOString();
  const created = new Date().toISOString();
  await dbRun("DELETE FROM guest_email_codes WHERE trip_id = ? AND email = ?", tripId, email);
  await dbRun(
    `INSERT INTO guest_email_codes (id, trip_id, share_id, email, code_hash, expires_at, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    crypto.randomUUID(),
    tripId,
    shareId,
    email,
    codeHash(email, code),
    expires,
    created,
  );
}

export async function consumeEmailCode(tripId: string, email: string, code: string) {
  await ensureEmailCodes();
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return { ok: false as const, error: "Enter the 6-digit code from your email." };
  const row = await dbGet<{ id: string; code_hash: string; expires_at: string; attempts: number }>(
    `SELECT id, code_hash, expires_at, attempts FROM guest_email_codes
     WHERE trip_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1`,
    tripId,
    email,
  );
  if (!row || Date.parse(row.expires_at) < Date.now()) {
    return { ok: false as const, error: "That code expired. Send a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, error: "Too many tries. Send a new code." };
  }
  await dbRun("UPDATE guest_email_codes SET attempts = attempts + 1 WHERE id = ?", row.id);
  if (!hashesMatch(codeHash(email, normalized), row.code_hash)) {
    return { ok: false as const, error: "That code is not right." };
  }
  await dbRun("DELETE FROM guest_email_codes WHERE id = ?", row.id);
  return { ok: true as const };
}
