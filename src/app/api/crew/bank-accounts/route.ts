import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import {
  crewBankAccountAuditEvents,
  crewBankAccounts,
  crewMembers,
  currencies,
} from "@/lib/db/schema";
import { encryptBankValue, maskBankValue } from "@/lib/crew/bank-accounts/crypto";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
function crewIdFor(userId: string) {
  return db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(eq(crewMembers.userId, userId))
    .get()?.id;
}
function audit(bankAccountId: string, actorUserId: string, action: string, details?: unknown) {
  db.insert(crewBankAccountAuditEvents)
    .values({
      id: randomUUID(),
      bankAccountId,
      actorUserId,
      action,
      detailsJson: details === undefined ? null : JSON.stringify(details),
    })
    .run();
}
async function attemptProviderVerification(input: {
  accountHolderName: string;
  bankName: string;
  countryCode: string;
  currencyCode: string;
  accountNumber: string;
  routingCode?: string;
}) {
  const endpoint = process.env.VILEK_BANK_VERIFICATION_URL;
  if (!endpoint) return { status: "PENDING" as const, reference: null as string | null };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.VILEK_BANK_VERIFICATION_TOKEN
          ? { authorization: `Bearer ${process.env.VILEK_BANK_VERIFICATION_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const result = (await response.json().catch(() => ({}))) as {
      status?: string;
      reference?: string;
    };
    const status = (result.status ?? "").toUpperCase();
    if (response.ok && ["VERIFIED", "SUCCESS", "ACTIVE"].includes(status))
      return { status: "VERIFIED" as const, reference: result.reference ?? null };
    if (response.ok && ["REJECTED", "FAILED"].includes(status))
      return { status: "REJECTED" as const, reference: result.reference ?? null };
    return { status: "NEEDS_REVIEW" as const, reference: result.reference ?? null };
  } catch {
    return { status: "NEEDS_REVIEW" as const, reference: null };
  }
}

export const GET = withRouteGuard(
  { roles: ["CREW", "FINANCE", "ADMIN"] },
  async (_request, _context, auth) => {
    const isFinance = auth.roleCodes.some((role) => ["FINANCE", "ADMIN"].includes(role));
    const crewId = isFinance ? null : crewIdFor(auth.user.id);
    if (!isFinance && !crewId) return error("Crew profile was not found.", 404);
    const baseQuery = db
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
      .from(crewBankAccounts);
    const rows = (
      isFinance
        ? baseQuery
        : baseQuery.where(
            and(eq(crewBankAccounts.crewMemberId, crewId!), eq(crewBankAccounts.isActive, true)),
          )
    )
      .orderBy(desc(crewBankAccounts.createdAt))
      .all();
    return NextResponse.json({ accounts: rows });
  },
);

export const POST = withRouteGuard({ roles: ["CREW"] }, async (request, _context, auth) => {
  const crewId = crewIdFor(auth.user.id);
  if (!crewId) return error("Crew profile was not found.", 404);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body.");
  }
  const accountHolderName =
    typeof body.accountHolderName === "string" ? body.accountHolderName.trim() : "";
  const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
  const countryCode =
    typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase() : "";
  const currencyCode =
    typeof body.currencyCode === "string" ? body.currencyCode.trim().toUpperCase() : "";
  const accountNumber =
    typeof body.accountNumber === "string" ? body.accountNumber.replace(/\\s/g, "") : "";
  const routingCode = typeof body.routingCode === "string" ? body.routingCode.trim() : "";
  if (
    !accountHolderName ||
    !bankName ||
    !/^[A-Z]{2}$/.test(countryCode) ||
    !/^[A-Z]{3}$/.test(currencyCode) ||
    accountNumber.length < 4 ||
    accountNumber.length > 34
  )
    return error(
      "Provide valid account holder, bank, country, currency and account number details.",
    );
  if (routingCode.length > 40) return error("Routing code is too long.");
  if (
    !db
      .select({ id: currencies.id })
      .from(currencies)
      .where(and(eq(currencies.code, currencyCode), eq(currencies.isActive, true)))
      .get()
  )
    return error("Select an active supported currency.");
  const verification = await attemptProviderVerification({
    accountHolderName,
    bankName,
    countryCode,
    currencyCode,
    accountNumber,
    routingCode: routingCode || undefined,
  });
  let encryptedAccount: string, encryptedRouting: string | null;
  try {
    encryptedAccount = encryptBankValue(accountNumber);
    encryptedRouting = routingCode ? encryptBankValue(routingCode) : null;
  } catch (e) {
    return error(e instanceof Error ? e.message : "Bank data encryption is unavailable.", 503);
  }
  const id = randomUUID();
  db.insert(crewBankAccounts)
    .values({
      id,
      crewMemberId: crewId,
      accountHolderName,
      bankName,
      countryCode,
      currencyCode,
      accountNumberEncrypted: encryptedAccount,
      accountNumberLast4: accountNumber.slice(-4),
      routingCodeEncrypted: encryptedRouting,
      routingCodeMasked: routingCode ? maskBankValue(routingCode) : null,
      verificationStatus: verification.status,
      verificationMethod: process.env.VILEK_BANK_VERIFICATION_URL ? "PROVIDER" : "MANUAL_REVIEW",
      verificationReference: verification.reference,
      isPrimary: false,
      isActive: true,
    })
    .run();
  audit(id, auth.user.id, "BANK_ACCOUNT_REGISTERED", {
    bankName,
    countryCode,
    currencyCode,
    last4: accountNumber.slice(-4),
    verificationStatus: verification.status,
  });
  return NextResponse.json({ id, verificationStatus: verification.status }, { status: 201 });
});

export const PATCH = withRouteGuard(
  { roles: ["CREW", "FINANCE", "ADMIN"] },
  async (request, _context, auth) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body.");
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return error("Bank account id is required.");
    const account = db.select().from(crewBankAccounts).where(eq(crewBankAccounts.id, id)).get();
    if (!account || !account.isActive) return error("Bank account not found.", 404);
    const finance = auth.roleCodes.some((role) => ["FINANCE", "ADMIN"].includes(role));
    if (body.action === "VERIFY" || body.action === "REJECT") {
      if (!finance) return error("Only Finance can manually verify bank accounts.", 403);
      const status = body.action === "VERIFY" ? "VERIFIED" : "REJECTED";
      db.update(crewBankAccounts)
        .set({
          verificationStatus: status,
          verificationMethod: "MANUAL",
          verifiedAt: status === "VERIFIED" ? new Date().toISOString() : null,
          verifiedByUserId: auth.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(crewBankAccounts.id, id))
        .run();
      audit(id, auth.user.id, `BANK_ACCOUNT_${status}`, { method: "MANUAL" });
      return NextResponse.json({ success: true, verificationStatus: status });
    }
    if (!finance) {
      const crewId = crewIdFor(auth.user.id);
      if (account.crewMemberId !== crewId) return error("Forbidden.", 403);
    }
    if (body.action === "SET_PRIMARY") {
      if (account.verificationStatus !== "VERIFIED")
        return error("Only verified bank accounts can be primary.");
      db.transaction((tx) => {
        tx.update(crewBankAccounts)
          .set({ isPrimary: false, updatedAt: new Date().toISOString() })
          .where(eq(crewBankAccounts.crewMemberId, account.crewMemberId))
          .run();
        tx.update(crewBankAccounts)
          .set({ isPrimary: true, updatedAt: new Date().toISOString() })
          .where(eq(crewBankAccounts.id, id))
          .run();
      });
      audit(id, auth.user.id, "BANK_ACCOUNT_SET_PRIMARY");
      return NextResponse.json({ success: true });
    }
    if (body.action === "DEACTIVATE") {
      if (account.isPrimary)
        return error("Choose another verified primary account before deactivating this account.");
      db.update(crewBankAccounts)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(crewBankAccounts.id, id))
        .run();
      audit(id, auth.user.id, "BANK_ACCOUNT_DEACTIVATED");
      return NextResponse.json({ success: true });
    }
    return error("Unsupported bank account action.");
  },
);
