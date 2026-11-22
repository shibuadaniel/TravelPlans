import { NextResponse } from "next/server";
import { getCurrentUser, guestCanRead } from "@/lib/current";
import { getRole, getStayFile } from "@/lib/data";
import { openDocumentForReader } from "@/lib/document-access";

export async function GET(request: Request, context: { params: Promise<{ stayId: string }> }) {
  const { stayId } = await context.params;
  const file = await getStayFile(stayId);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const user = await getCurrentUser();
  const member = Boolean(user && (await getRole(user.id, file.trip_id)));
  if (!member && !(await guestCanRead(file.trip_id))) {
    const status = user ? 403 : 401;
    return new NextResponse(status === 401 ? "Unauthorized" : "Forbidden", { status });
  }
  return openDocumentForReader(request, file, "stay", stayId, member);
}
