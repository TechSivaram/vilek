import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { crewBankAccountEvidence, crewBankAccounts } from "@/lib/db/schema";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export const GET = withRouteGuard<Context>(
  { roles: ["FINANCE"] },
  async (request, context, auth) => {
    const { id } = await context.params;
    const account = db
      .select({ id: crewBankAccounts.id })
      .from(crewBankAccounts)
      .where(eq(crewBankAccounts.id, id))
      .get();
    if (!account) return NextResponse.json({ error: "Bank account not found." }, { status: 404 });

    const evidenceId = new URL(request.url).searchParams.get("evidenceId");
    if (!evidenceId) {
      const evidence = db
        .select({
          id: crewBankAccountEvidence.id,
          fileName: crewBankAccountEvidence.fileName,
          contentType: crewBankAccountEvidence.contentType,
          fileSizeBytes: crewBankAccountEvidence.fileSizeBytes,
          evidenceType: crewBankAccountEvidence.evidenceType,
          uploadedAt: crewBankAccountEvidence.uploadedAt,
        })
        .from(crewBankAccountEvidence)
        .where(eq(crewBankAccountEvidence.bankAccountId, id))
        .orderBy(desc(crewBankAccountEvidence.uploadedAt))
        .all();
      return NextResponse.json({ evidence });
    }

    const document = db
      .select()
      .from(crewBankAccountEvidence)
      .where(
        and(
          eq(crewBankAccountEvidence.id, evidenceId),
          eq(crewBankAccountEvidence.bankAccountId, id),
        ),
      )
      .get();
    if (!document)
      return NextResponse.json({ error: "Supporting evidence not found." }, { status: 404 });

    const documentRoot =
      process.env.VILEK_DOCUMENT_STORAGE_PATH || path.join(process.cwd(), "data");
    const root = path.resolve(documentRoot, "bank-account-evidence");
    const fullPath = path.resolve(root, document.storageKey);
    if (!fullPath.startsWith(root + path.sep)) {
      return NextResponse.json({ error: "Invalid document reference." }, { status: 400 });
    }
    try {
      const bytes = await readFile(fullPath);
      const download = new URL(request.url).searchParams.get("download") === "1";
      const safeFileName = document.fileName.replace(/[\\"\\\\\\r\\n]/g, "_");
      const encodedFileName = encodeURIComponent(document.fileName).replace(
        /['()]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      const contentType = ["application/pdf", "image/jpeg", "image/png"].includes(
        document.contentType,
      )
        ? document.contentType
        : "application/octet-stream";
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return NextResponse.json({ error: "Supporting evidence is unavailable." }, { status: 404 });
    }
  },
);
