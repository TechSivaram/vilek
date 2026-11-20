import { NextResponse } from "next/server";
import { readFile, unlink } from "node:fs/promises";
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

export const DELETE = withRouteGuard<Context>(
  { roles: ["CREW"] },
  async (_request, context, auth) => {
    const { documentId } = await context.params;
    const document = crewExpensesService.getDocument(auth.user.id, documentId);
    if (!document) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    if (document.claimId && !["DRAFT", "REVISION_REQUIRED"].includes(document.claimStatus ?? "")) {
      return NextResponse.json(
        {
          error:
            "Receipts can only be removed while a claim is in draft or reopened for correction.",
        },
        { status: 409 },
      );
    }
    const root = path.resolve(
      process.env.VILEK_DOCUMENT_STORAGE_PATH ||
        path.join(process.cwd(), "data", "expense-documents"),
    );
    if (path.basename(document.storageKey) !== document.storageKey)
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    crewExpensesService.deleteDocument(documentId);
    await unlink(path.join(root, document.storageKey)).catch(() => undefined);
    return NextResponse.json({ success: true });
  },
);
