import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewExpensesService } from "@/lib/crew/expenses/service";

type Context = { params: Promise<{ expenseId: string }> };
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const runtime = "nodejs";
export const POST = withRouteGuard<Context>({ roles: ["CREW"] }, async (request, context, auth) => {
  const { expenseId } = await context.params;
  const owned = crewExpensesService.getOwnedExpense(auth.user.id, expenseId);
  if (!owned) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  if (owned.claimId && !["DRAFT", "REVISION_REQUIRED"].includes(owned.claimStatus ?? ""))
    return NextResponse.json(
      {
        error:
          "Receipts can only be uploaded while a claim is in draft or reopened for correction.",
      },
      { status: 409 },
    );
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "Select a receipt file." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Receipt must be 10 MB or smaller." }, { status: 400 });
  if (!ALLOWED.has(file.type))
    return NextResponse.json(
      { error: "Only PDF, JPEG and PNG receipts are supported." },
      { status: 400 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  const validSignature =
    file.type === "application/pdf"
      ? bytes.subarray(0, 5).toString("ascii") === "%PDF-"
      : file.type === "image/jpeg"
        ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!validSignature)
    return NextResponse.json(
      { error: "The file content does not match its declared type." },
      { status: 400 },
    );
  const extension =
    file.type === "application/pdf" ? ".pdf" : file.type === "image/jpeg" ? ".jpg" : ".png";
  const id = randomUUID();
  const root = path.resolve(
    process.env.VILEK_DOCUMENT_STORAGE_PATH ||
      path.join(process.cwd(), "data", "expense-documents"),
  );
  const storageKey = `${id}${extension}`;
  await mkdir(root, { recursive: true });
  const fullPath = path.join(root, storageKey);
  await writeFile(fullPath, bytes, { flag: "wx" });
  try {
    crewExpensesService.addDocument(expenseId, {
      id,
      storageKey,
      fileName: file.name.replace(/[\\/\0-\x1f]/g, "_").slice(0, 180) || `receipt${extension}`,
      contentType: file.type,
      fileSizeBytes: file.size,
    });
  } catch {
    await unlink(fullPath).catch(() => undefined);
    return NextResponse.json({ error: "Receipt metadata could not be saved." }, { status: 500 });
  }
  return NextResponse.json(
    { document: { id, fileName: file.name, contentType: file.type, fileSizeBytes: file.size } },
    { status: 201 },
  );
});
