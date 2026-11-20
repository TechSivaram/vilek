import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewExpensesService } from "@/lib/crew/expenses/service";
type Context = { params: Promise<{ documentId: string }> };
export const runtime = "nodejs";
export const GET = withRouteGuard<Context>({ roles: ["CREW"] }, async (_request, context, auth) => {
  const { documentId } = await context.params;
  const document = crewExpensesService.getDocument(auth.user.id, documentId);
  if (!document) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const root = path.resolve(
    process.env.VILEK_DOCUMENT_STORAGE_PATH ||
      path.join(process.cwd(), "data", "expense-documents"),
  );
  if (path.basename(document.storageKey) !== document.storageKey)
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  try {
    const bytes = await readFile(path.join(root, document.storageKey));
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": document.contentType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Receipt file is unavailable." }, { status: 404 });
  }
});
