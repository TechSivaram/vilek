import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import {
  claimExpenses,
  claimCurrencyResolutions,
  claims,
  currencies,
  crewBankAccountAuditEvents,
  crewBankAccounts,
  crewMembers,
  expenses,
  flightCrew,
} from "@/lib/db/schema";
import { decryptBankValue } from "@/lib/crew/bank-accounts/crypto";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ claimId: string }> };

export const GET = withRouteGuard(
  { permissions: ["FINANCE_PROCESS"] },
  async (_request, context: Context, auth) => {
    const { claimId } = await context.params;
    const claim = db
      .select({
        id: claims.id,
        status: claims.status,
        crewMemberId: crewMembers.id,
      })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .where(eq(claims.id, claimId))
      .get();

    if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    if (claim.status !== "APPROVED")
      return NextResponse.json(
        { error: "Beneficiary details are available only for approved claims." },
        { status: 409 },
      );

    const claimCurrencies = db
      .select({ code: currencies.code })
      .from(claimExpenses)
      .innerJoin(expenses, eq(claimExpenses.expenseId, expenses.id))
      .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
      .where(eq(claimExpenses.claimId, claimId))
      .all();
    const currencyCodes = [...new Set(claimCurrencies.map((item) => item.code))];
    let payoutCurrencyCode = currencyCodes[0];
    if (currencyCodes.length > 1) {
      const resolution = db
        .select({ payoutCurrencyCode: claimCurrencyResolutions.payoutCurrencyCode })
        .from(claimCurrencyResolutions)
        .where(
          and(
            eq(claimCurrencyResolutions.claimId, claimId),
            eq(claimCurrencyResolutions.status, "APPROVED"),
          ),
        )
        .get();
      if (!resolution)
        return NextResponse.json(
          { error: "Approve the claim currency resolution before revealing beneficiary details." },
          { status: 409 },
        );
      payoutCurrencyCode = resolution.payoutCurrencyCode;
    }

    const account = db
      .select()
      .from(crewBankAccounts)
      .where(
        and(
          eq(crewBankAccounts.crewMemberId, claim.crewMemberId),
          eq(crewBankAccounts.isActive, true),
          eq(crewBankAccounts.isPrimary, true),
          eq(crewBankAccounts.verificationStatus, "VERIFIED"),
          eq(crewBankAccounts.currencyCode, payoutCurrencyCode),
        ),
      )
      .get();

    if (!account)
      return NextResponse.json(
        { error: "No verified primary bank account is available in the resolved payout currency." },
        { status: 404 },
      );

    let accountNumber: string;
    let routingCode: string | null = null;
    try {
      accountNumber = decryptBankValue(account.accountNumberEncrypted);
      routingCode = account.routingCodeEncrypted
        ? decryptBankValue(account.routingCodeEncrypted)
        : null;
    } catch {
      return NextResponse.json(
        { error: "Unable to decrypt beneficiary details. Check the bank-data encryption key." },
        { status: 500 },
      );
    }

    db.insert(crewBankAccountAuditEvents)
      .values({
        id: randomUUID(),
        bankAccountId: account.id,
        actorUserId: auth.user.id,
        action: "BANK_ACCOUNT_DETAILS_REVEALED_TO_FINANCE",
        detailsJson: JSON.stringify({
          claimId,
          purpose: "MANUAL_REIMBURSEMENT",
          payoutCurrencyCode,
        }),
      })
      .run();

    return NextResponse.json({
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      countryCode: account.countryCode,
      currencyCode: account.currencyCode,
      accountNumber,
      routingCode,
      verificationStatus: account.verificationStatus,
    });
  },
);
