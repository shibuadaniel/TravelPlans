import "server-only";

import { NextResponse } from "next/server";
import { documentOpenState, type DocumentKind } from "@/lib/data";
import { readStoredFile } from "@/lib/uploads";

export function approvalRequired(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === "1";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const encoded: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return encoded[character] ?? character;
  });
}

function fileResponse(name: string, mime: string, bytes: Buffer) {
  const filename = name.replace(/["\r\n]/g, "");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const pageStyle =
  "<style>html{color-scheme:light dark}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#f4f7f8;color:#102a33;font-family:Inter,'Segoe UI',sans-serif}main{width:min(100% - 32px,360px);background:#fff;border:1px solid #d5dee2;border-radius:16px;padding:24px}h1{font-size:1.25rem;margin:0 0 8px}#msg{margin:0;line-height:1.5}@media (prefers-color-scheme:dark){body{background:#0f171b;color:#e7eef1}main{background:#18262d;border-color:#2c3e46}}</style>";

function page(title: string, body: string) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>${pageStyle}</head><body><main><h1>${escapeHtml(title)}</h1><p id="msg">${body}</p></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } },
  );
}

function waitingPage(name: string, requestId: string, pageUrl: URL, nonce: string) {
  const watch = new URL(pageUrl);
  watch.searchParams.set("request", requestId);
  watch.searchParams.set("watch", "1");
  const open = new URL(pageUrl);
  open.searchParams.set("request", requestId);
  open.searchParams.delete("watch");
  const script = `<script nonce="${escapeHtml(nonce)}">async function tick(){const res=await fetch(${JSON.stringify(watch.pathname + watch.search)});const body=await res.json();if(body.status==="approved"){location.replace(${JSON.stringify(open.pathname + open.search)});return;}if(body.status==="denied"){document.getElementById("msg").textContent="The owner did not approve this document.";return;}setTimeout(tick,2000);}tick();</script>`;
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Waiting for approval</title>${pageStyle}</head><body><main><h1>Waiting for approval</h1><p id="msg">The trip owner needs to approve ${escapeHtml(name)} before it opens.</p></main>${script}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } },
  );
}

export async function openDocumentForReader(
  request: Request,
  file: {
    trip_id: string;
    document_name: string;
    document_mime: string;
    document_key: string;
    requires_approval: boolean | number | string | null;
  },
  kind: DocumentKind,
  documentId: string,
  member: boolean,
) {
  if (!member && approvalRequired(file.requires_approval)) {
    const url = new URL(request.url);
    const requestId = url.searchParams.get("request");
    const watch = url.searchParams.get("watch") === "1";
    const nonce = request.headers.get("x-nonce") ?? "";
    if (!requestId) {
      return page(
        "Approval needed",
        "This file stays closed until the owner approves it. Go back to the trip and choose Request access.",
      );
    }
    const state = await documentOpenState(requestId, kind, documentId);
    if (watch) return NextResponse.json({ status: state ?? "denied" });
    if (state === "approved") {
      const bytes = await readStoredFile(file.document_key);
      if (!bytes) return new NextResponse("Not found", { status: 404 });
      return fileResponse(file.document_name, file.document_mime, bytes);
    }
    if (state === "denied") return page("Not approved", "The owner did not approve this document.");
    if (state === "pending") return waitingPage(file.document_name, requestId, url, nonce);
    return page(
      "Approval needed",
      "This file stays closed until the owner approves it. Go back to the trip and choose Request access.",
    );
  }
  const bytes = await readStoredFile(file.document_key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  return fileResponse(file.document_name, file.document_mime, bytes);
}
