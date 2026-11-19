export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 20_000) return new Response(null, { status: 413 });
  await request.arrayBuffer().catch(() => undefined);
  return new Response(null, { status: 204 });
}
