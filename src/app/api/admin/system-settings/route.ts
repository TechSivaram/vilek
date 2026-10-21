import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { system_settingsService } from "@/lib/admin/features/system_settings/service";
import { updateSystemSettingsSchema } from "@/lib/admin/features/system_settings/schema";
export const dynamic = "force-dynamic";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () =>
  NextResponse.json({
    settings: system_settingsService.get(),
    currencyOptions: system_settingsService.currencyOptions(),
  }),
);
export const PUT = withRouteGuard({ roles: ["ADMIN"] }, async (request) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSystemSettingsSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Choose a currency and set maximum upload size between 1 KB and 100 MB.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  const { defaultCurrencyId: currencyId, maxUploadSizeBytes: size } = parsed.data;
  if (!system_settingsService.currencyExists(currencyId))
    return NextResponse.json({ error: "Selected currency does not exist." }, { status: 400 });
  try {
    system_settingsService.save(currencyId, size);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Settings could not be saved." }, { status: 409 });
  }
});
