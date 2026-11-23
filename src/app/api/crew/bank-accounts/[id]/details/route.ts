import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { crewBankAccountAuditEvents, crewBankAccounts, crewMembers } from "@/lib/db/schema";
import { decryptBankValue } from "@/lib/crew/bank-accounts/crypto";

type Context = { params: Promise<{ id: string }> };
const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export const GET = withRouteGuard({ roles: ["CREW"] }, async (_request, context: Context, auth) => {
  const { id } = await context.params;
  const crewId = db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(eq(crewMembers.userId, auth.user.id))
    .get()?.id;
  if (!crewId) return fail("Crew profile was not found.", 404);
  const account = db
    .select()
    .from(crewBankAccounts)
    .where(
      and(
        eq(crewBankAccounts.id, id),
        eq(crewBankAccounts.crewMemberId, crewId),
        eq(crewBankAccounts.isActive, true),
      ),
    )
    .get();
  if (!account) return fail("Bank account not found.", 404);
  try {
    const details = {
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      countryCode: account.countryCode,
      currencyCode: account.currencyCode,
      accountNumber: decryptBankValue(account.accountNumberEncrypted),
      routingCode: account.routingCodeEncrypted
        ? decryptBankValue(account.routingCodeEncrypted)
        : null,
    };
    db.insert(crewBankAccountAuditEvents)
      .values({
        id: randomUUID(),
        bankAccountId: id,
        actorUserId: auth.user.id,
        action: "BANK_ACCOUNT_DETAILS_REVEALED_TO_CREW",
        detailsJson: JSON.stringify({ last4: account.accountNumberLast4 }),
      })
      .run();
    return NextResponse.json(
      { details },
      { headers: { "Cache-Control": "no-store, private", Pragma: "no-cache" } },
    );
  } catch (cause) {
    console.error("[BANK-ACCOUNT] Crew details reveal failed:", cause);
    return fail(
      "Unable to reveal bank account details. Check bank-data encryption configuration.",
      503,
    );
  }
});
