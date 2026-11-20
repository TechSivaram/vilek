import { NextResponse } from "next/server";
import { z } from "zod";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewExpensesService } from "@/lib/crew/expenses/service";

export const dynamic = "force-dynamic";
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  search: z.string().trim().max(100).default(""),
  categoryId: z.string().default(""),
  currencyId: z.string().default(""),
  fromDate: z.string().default(""),
  toDate: z.string().default(""),
  status: z.enum(["", "CLAIMED", "UNCLAIMED"]).default(""),
  sortBy: z.enum(["date", "amount", "category"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
const expenseSchema = z.object({
  assignmentId: z.string().min(1).optional(),
  amount: z.string().regex(/^\d{1,12}(\.\d{1,4})?$/),
  currencyId: z.coerce.number().int().positive(),
  expenseDate: z.string().min(10).max(30),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().min(2).max(500),
  location: z.string().trim().max(200).optional(),
});

export const GET = withRouteGuard({ roles: ["CREW"] }, async (request, _context, auth) => {
  const params = new URL(request.url).searchParams;
  if (params.get("meta") === "1")
    return NextResponse.json(crewExpensesService.options(auth.user.id));
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid expense search parameters." }, { status: 400 });
  if (parsed.data.fromDate && parsed.data.toDate && parsed.data.fromDate > parsed.data.toDate)
    return NextResponse.json({ error: "From date must be on or before to date." }, { status: 400 });
  return NextResponse.json(crewExpensesService.list(auth.user.id, parsed.data));
});

export const POST = withRouteGuard({ roles: ["CREW"] }, async (request, _context, auth) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success || !parsed.data.assignmentId)
    return NextResponse.json(
      { error: "Enter valid expense details and select a flight assignment." },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      {
        expense: crewExpensesService.create(
          auth.user.id,
          parsed.data as z.infer<typeof expenseSchema> & { assignmentId: string },
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EXPENSE_CLAIM_LOCKED")
      return NextResponse.json(
        { error: "This flight claim is locked. Reopen a rejected claim before adding expenses." },
        { status: 409 },
      );
    if (error instanceof Error && error.message === "ASSIGNMENT_NOT_FOUND")
      return NextResponse.json(
        { error: "The selected flight assignment is not available to your account." },
        { status: 404 },
      );
    return NextResponse.json({ error: "The expense could not be created." }, { status: 500 });
  }
});
