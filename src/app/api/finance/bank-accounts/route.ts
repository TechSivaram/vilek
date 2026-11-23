import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { crewBankAccounts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const GET = withRouteGuard({ permissions: ["FINANCE_PROCESS"] }, async () => {
  const accounts = db
    .select({
      id: crewBankAccounts.id,
      crewMemberId: crewBankAccounts.crewMemberId,
      accountHolderName: crewBankAccounts.accountHolderName,
      bankName: crewBankAccounts.bankName,
      countryCode: crewBankAccounts.countryCode,
      currencyCode: crewBankAccounts.currencyCode,
      accountNumberLast4: crewBankAccounts.accountNumberLast4,
      routingCodeMasked: crewBankAccounts.routingCodeMasked,
      verificationStatus: crewBankAccounts.verificationStatus,
      verificationMethod: crewBankAccounts.verificationMethod,
      isPrimary: crewBankAccounts.isPrimary,
      isActive: crewBankAccounts.isActive,
      verifiedAt: crewBankAccounts.verifiedAt,
      createdAt: crewBankAccounts.createdAt,
    })
    .from(crewBankAccounts)
    .where(eq(crewBankAccounts.isActive, true))
    .orderBy(desc(crewBankAccounts.createdAt))
    .all();
  return NextResponse.json({ accounts });
});
