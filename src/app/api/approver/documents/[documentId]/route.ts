import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewClaimsService } from "@/lib/crew/claims/service";

type Context = { params: Promise<{ documentId: string }> };
export const runtime = "nodejs";
export const GET = withRouteGuard<Context>(
  { permissions: ["CLAIM_REVIEW"] },
  async (_request, context) => {
    const { documentId } = await context.params;
    const document = crewClaimsService.getReviewDocument(documentId);
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
  },
);
