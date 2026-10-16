import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { currencies, systemSettings } from "@/lib/db/schema";
export const dynamic = "force-dynamic";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  const settings = db.select().from(systemSettings).where(eq(systemSettings.id, 1)).get() ?? null;
  const currencyOptions = db.select({ id: currencies.id, code: currencies.code, name: currencies.name }).from(currencies).where(eq(currencies.isActive, true)).all();
  return NextResponse.json({ settings, currencyOptions });
});
export const PUT = withRouteGuard({ roles: ["ADMIN"] }, async (request) => {
  const body = await request.json().catch(() => null) as { defaultCurrencyId?: unknown; maxUploadSizeBytes?: unknown } | null;
  const currencyId = Number(body?.defaultCurrencyId); const size = Number(body?.maxUploadSizeBytes);
  if (!Number.isInteger(currencyId) || currencyId < 1 || !Number.isInteger(size) || size < 1024 || size > 104857600) return NextResponse.json({ error: "Choose a currency and set maximum upload size between 1 KB and 100 MB." }, { status: 400 });
  const currency = db.select({ id: currencies.id }).from(currencies).where(eq(currencies.id, currencyId)).get(); if (!currency) return NextResponse.json({ error: "Selected currency does not exist." }, { status: 400 });
  const now = new Date().toISOString();
  try { db.insert(systemSettings).values({ id: 1, defaultCurrencyId: currencyId, maxUploadSizeBytes: size, updatedAt: now }).onConflictDoUpdate({ target: systemSettings.id, set: { defaultCurrencyId: currencyId, maxUploadSizeBytes: size, updatedAt: now } }).run(); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Settings could not be saved." }, { status: 409 }); }
});
