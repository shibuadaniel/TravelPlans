import "server-only";

import { createHash } from "crypto";

export function webAuthnRelyingParty(request: Request) {
  const url = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host)
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))
    .split(",")[0]
    .trim();
  return {
    rpID: host.split(":")[0],
    rpName: "Where are we?",
    origin: `${proto}://${host}`,
  };
}

export function passkeyUserId(ownerId: string, email: string) {
  return new Uint8Array(createHash("sha256").update(`${ownerId}:${email}`).digest());
}

export function encodeKey(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function decodeKey(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
