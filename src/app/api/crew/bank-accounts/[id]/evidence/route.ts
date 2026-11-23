import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import {
  crewBankAccountAuditEvents,
  crewBankAccountEvidence,
  crewBankAccounts,
  crewMembers,
  paymentAuditEvents,
} from "@/lib/db/schema";

export const runtime = "nodejs";
const MAX_BYTES = 10 * 1024 * 1024;
type Context = { params: Promise<{ id: string }> };
export const GET = withRouteGuard<Context>({ roles: ["CREW"] }, async (request, context, auth) => {
  const { id } = await context.params;
  const crew = db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(eq(crewMembers.userId, auth.user.id))
    .get();
  if (!crew) return NextResponse.json({ error: "Crew profile was not found." }, { status: 404 });
  const account = db
    .select({ id: crewBankAccounts.id })
    .from(crewBankAccounts)
    .where(and(eq(crewBankAccounts.id, id), eq(crewBankAccounts.crewMemberId, crew.id)))
    .get();
  if (!account) return NextResponse.json({ error: "Bank account not found." }, { status: 404 });

  const evidenceId = new URL(request.url).searchParams.get("evidenceId");
  if (!evidenceId) {
    const documents = db
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
    return NextResponse.json({ evidence: documents });
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
  const documentRoot = process.env.VILEK_DOCUMENT_STORAGE_PATH || path.join(process.cwd(), "data");
  const root = path.resolve(documentRoot, "bank-account-evidence");
  const fullPath = path.resolve(root, document.storageKey);
  if (!fullPath.startsWith(root + path.sep))
    return NextResponse.json({ error: "Invalid document reference." }, { status: 400 });
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
});

export const DELETE = withRouteGuard<Context>(
  { roles: ["CREW"] },
  async (request, context, auth) => {
    const { id } = await context.params;
    const crew = db
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(eq(crewMembers.userId, auth.user.id))
      .get();
    if (!crew) return NextResponse.json({ error: "Crew profile was not found." }, { status: 404 });

    const evidenceId = new URL(request.url).searchParams.get("evidenceId");
    if (!evidenceId)
      return NextResponse.json({ error: "Evidence document ID is required." }, { status: 400 });

    const account = db
      .select({ id: crewBankAccounts.id, verificationStatus: crewBankAccounts.verificationStatus })
      .from(crewBankAccounts)
      .where(
        and(
          eq(crewBankAccounts.id, id),
          eq(crewBankAccounts.crewMemberId, crew.id),
          eq(crewBankAccounts.isActive, true),
        ),
      )
      .get();
    if (!account) return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
    if (account.verificationStatus !== "PENDING") {
      return NextResponse.json(
        {
          error: "Evidence can only be deleted while the account is pending Finance verification.",
        },
        { status: 409 },
      );
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
    if (!fullPath.startsWith(root + path.sep))
      return NextResponse.json({ error: "Invalid document reference." }, { status: 400 });

    try {
      db.transaction((tx) => {
        const currentAccount = tx
          .select({ verificationStatus: crewBankAccounts.verificationStatus })
          .from(crewBankAccounts)
          .where(
            and(
              eq(crewBankAccounts.id, id),
              eq(crewBankAccounts.crewMemberId, crew.id),
              eq(crewBankAccounts.isActive, true),
            ),
          )
          .get();
        if (!currentAccount) throw new Error("BANK_ACCOUNT_NOT_FOUND");
        if (currentAccount.verificationStatus !== "PENDING") throw new Error("ACCOUNT_NOT_PENDING");

        const paymentUse = tx
          .select({ id: paymentAuditEvents.id })
          .from(paymentAuditEvents)
          .where(
            sql`json_valid(${paymentAuditEvents.detailsJson}) AND json_extract(${paymentAuditEvents.detailsJson}, '$.beneficiaryBankAccountId') = ${id}`,
          )
          .get();
        const financeReveal = tx
          .select({ id: crewBankAccountAuditEvents.id })
          .from(crewBankAccountAuditEvents)
          .where(
            and(
              eq(crewBankAccountAuditEvents.bankAccountId, id),
              eq(crewBankAccountAuditEvents.action, "BANK_ACCOUNT_DETAILS_REVEALED_TO_FINANCE"),
            ),
          )
          .get();
        if (paymentUse || financeReveal) throw new Error("ACCOUNT_ALREADY_USED");

        tx.delete(crewBankAccountEvidence)
          .where(
            and(
              eq(crewBankAccountEvidence.id, evidenceId),
              eq(crewBankAccountEvidence.bankAccountId, id),
            ),
          )
          .run();
        tx.insert(crewBankAccountAuditEvents)
          .values({
            id: randomUUID(),
            bankAccountId: id,
            actorUserId: auth.user.id,
            action: "BANK_ACCOUNT_EVIDENCE_DELETED",
            detailsJson: JSON.stringify({
              evidenceId,
              fileName: document.fileName,
              evidenceType: document.evidenceType,
            }),
          })
          .run();
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      if (reason === "BANK_ACCOUNT_NOT_FOUND")
        return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
      if (reason === "ACCOUNT_NOT_PENDING")
        return NextResponse.json(
          {
            error:
              "Evidence can only be deleted while the account is pending Finance verification.",
          },
          { status: 409 },
        );
      if (reason === "ACCOUNT_ALREADY_USED")
        return NextResponse.json(
          {
            error:
              "Evidence cannot be deleted because this beneficiary account has already been used for a reimbursement.",
          },
          { status: 409 },
        );
      console.error("[BANK-EVIDENCE] Document deletion failed:", error);
      return NextResponse.json({ error: "Unable to delete supporting evidence." }, { status: 500 });
    }

    await unlink(fullPath).catch((error) => {
      console.error("[BANK-EVIDENCE] Deleted document file cleanup failed:", error);
    });
    return NextResponse.json({ success: true });
  },
);

export const POST = withRouteGuard<Context>({ roles: ["CREW"] }, async (request, context, auth) => {
  const { id } = await context.params;
  const crew = db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(eq(crewMembers.userId, auth.user.id))
    .get();
  if (!crew) return NextResponse.json({ error: "Crew profile was not found." }, { status: 404 });
  const account = db
    .select({ id: crewBankAccounts.id, verificationStatus: crewBankAccounts.verificationStatus })
    .from(crewBankAccounts)
    .where(
      and(
        eq(crewBankAccounts.id, id),
        eq(crewBankAccounts.crewMemberId, crew.id),
        eq(crewBankAccounts.isActive, true),
      ),
    )
    .get();
  if (!account) return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
  if (account.verificationStatus === "VERIFIED")
    return NextResponse.json(
      { error: "Evidence cannot be changed after the account is verified." },
      { status: 409 },
    );
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  const evidenceType = String(form.get("evidenceType") ?? "");
  if (!(file instanceof File) || file.size < 1)
    return NextResponse.json({ error: "Select a supporting document." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Document must be 10 MB or smaller." }, { status: 400 });
  if (!["CANCELLED_CHEQUE", "BANK_PASSBOOK", "BANK_STATEMENT"].includes(evidenceType))
    return NextResponse.json({ error: "Select a valid evidence type." }, { status: 400 });
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
    return NextResponse.json(
      { error: "Only PDF, JPEG and PNG files are supported." },
      { status: 400 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  const valid =
    file.type === "application/pdf"
      ? bytes.subarray(0, 5).toString("ascii") === "%PDF-"
      : file.type === "image/jpeg"
        ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid)
    return NextResponse.json(
      { error: "File content does not match its declared type." },
      { status: 400 },
    );
  const ext =
    file.type === "application/pdf" ? ".pdf" : file.type === "image/jpeg" ? ".jpg" : ".png";
  const evidenceId = randomUUID();
  const storageKey = `${evidenceId}${ext}`;
  // Reuse the application's existing private document-storage root. Keep bank
  // evidence isolated in its own subdirectory and outside the public web root.
  const documentRoot = process.env.VILEK_DOCUMENT_STORAGE_PATH || path.join(process.cwd(), "data");
  const root = path.resolve(documentRoot, "bank-account-evidence");
  await mkdir(root, { recursive: true });
  const fullPath = path.join(root, storageKey);
  await writeFile(fullPath, bytes, { flag: "wx" });
  try {
    db.transaction((tx) => {
      tx.insert(crewBankAccountEvidence)
        .values({
          id: evidenceId,
          bankAccountId: id,
          storageKey,
          fileName: file.name.replace(/[\\/\0-\x1f]/g, "_").slice(0, 180) || `evidence${ext}`,
          contentType: file.type,
          fileSizeBytes: file.size,
          evidenceType,
          uploadedByUserId: auth.user.id,
        })
        .run();
      tx.insert(crewBankAccountAuditEvents)
        .values({
          id: randomUUID(),
          bankAccountId: id,
          actorUserId: auth.user.id,
          action: "BANK_ACCOUNT_EVIDENCE_UPLOADED",
          detailsJson: JSON.stringify({
            evidenceId,
            evidenceType,
            contentType: file.type,
            fileSizeBytes: file.size,
          }),
        })
        .run();
    });
  } catch (error) {
    // Keep the underlying SQLite error in the server log; the client receives
    // a generic message so database details are never exposed to the browser.
    console.error("[BANK-EVIDENCE] Document metadata transaction failed:", error);
    await unlink(fullPath).catch((cleanupError) => {
      console.error("[BANK-EVIDENCE] Uploaded file cleanup failed:", cleanupError);
    });
    return NextResponse.json({ error: "Document metadata could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ success: true, evidenceId }, { status: 201 });
});
