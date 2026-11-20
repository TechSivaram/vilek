import { NextResponse } from "next/server";
import { z } from "zod";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewExpensesService } from "@/lib/crew/expenses/service";

type Context = { params: Promise<{ expenseId: string }> };
const schema = z.object({
  amount: z.string().regex(/^\d{1,12}(\.\d{1,4})?$/),
  currencyId: z.coerce.number().int().positive(),
  expenseDate: z.string().min(10).max(30),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().min(2).max(500),
  location: z.string().trim().max(200).optional(),
});
export const PATCH = withRouteGuard<Context>(
  { roles: ["CREW"] },
  async (request, context, auth) => {
    const { expenseId } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Enter valid expense details." }, { status: 400 });
    try {
      crewExpensesService.update(auth.user.id, expenseId, parsed.data);
      return NextResponse.json({ success: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "EXPENSE_NOT_FOUND")
        return NextResponse.json({ error: "Expense not found." }, { status: 404 });
      if (code === "EXPENSE_CLAIMED")
        return NextResponse.json(
          {
            error:
              "This expense can only be edited while its claim is in draft or reopened for correction.",
          },
          { status: 409 },
        );
      return NextResponse.json({ error: "The expense could not be updated." }, { status: 500 });
    }
  },
);
export const DELETE = withRouteGuard<Context>(
  { roles: ["CREW"] },
  async (_request, context, auth) => {
    const { expenseId } = await context.params;
    try {
      const documents = crewExpensesService.getExpenseDocuments(auth.user.id, expenseId);
      const root = path.resolve(
        /*turbopackIgnore: true*/
        process.env.VILEK_DOCUMENT_STORAGE_PATH ||
          path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "expense-documents"),
      );
      // Remove files before deleting the expense/metadata. ENOENT is safe to ignore,
      // making a partially completed cleanup safely retryable.
      for (const document of documents) {
        if (path.basename(document.storageKey) !== document.storageKey)
          throw new Error("INVALID_DOCUMENT_STORAGE_KEY");
        try {
          await unlink(path.join(/*turbopackIgnore: true*/ root, document.storageKey));
        } catch (fileError) {
          if ((fileError as NodeJS.ErrnoException).code !== "ENOENT") {
            return NextResponse.json(
              { error: "An expense receipt could not be removed. Please retry." },
              { status: 500 },
            );
          }
        }
      }
      crewExpensesService.delete(auth.user.id, expenseId);
      return NextResponse.json({ success: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "EXPENSE_NOT_FOUND")
        return NextResponse.json({ error: "Expense not found." }, { status: 404 });
      if (code === "EXPENSE_CLAIMED")
        return NextResponse.json(
          { error: "This expense is linked to a claim and cannot be deleted." },
          { status: 409 },
        );
      return NextResponse.json({ error: "The expense could not be deleted." }, { status: 500 });
    }
  },
);
