import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "trip-documents";

const ALLOWED = new Map([
  ["application/pdf", true],
  ["image/jpeg", true],
  ["image/png", true],
  ["image/webp", true],
  ["image/gif", true],
]);

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function resolveMime(file: File) {
  if (ALLOWED.has(file.type)) return file.type;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  return EXT_MIME[ext] ?? "";
}

export async function storeFile(file: File) {
  const mime = resolveMime(file);
  if (!mime) {
    throw new Error("Upload a PDF or an image (JPEG, PNG, WebP, or GIF).");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) throw new Error("That file is empty.");
  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error("Files must be 10 MB or smaller.");
  }
  const key = crypto.randomUUID();
  const { error } = await createServiceRoleClient().storage.from(BUCKET).upload(key, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error("Could not store that file.");
  const name = file.name.replace(/[/\\]/g, "").slice(0, 180) || "document";
  return { name, mime, size: bytes.length, key };
}

export async function readStoredFile(key: string) {
  if (!/^[0-9a-f-]{36}$/i.test(key)) return null;
  const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeStoredFile(key: string | null | undefined) {
  if (!key || !/^[0-9a-f-]{36}$/i.test(key)) return;
  await createServiceRoleClient().storage.from(BUCKET).remove([key]);
}
