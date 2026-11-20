import { NextResponse } from "next/server";
import { z } from "zod";
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
          { error: "This expense is linked to a claim and can no longer be edited." },
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
