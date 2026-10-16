import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { allowedFileTypes, systemSettings } from "@/lib/db/schema";
export const dynamic = "force-dynamic";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () => {
 const settings = db.select({ id: systemSettings.id }).from(systemSettings).where(eq(systemSettings.id,1)).get();
 if (!settings) return NextResponse.json({ settingId: null, rows: [], notice: "Configure system settings before adding allowed file types." });
 return NextResponse.json({ settingId: settings.id, rows: db.select().from(allowedFileTypes).where(eq(allowedFileTypes.systemSettingId,settings.id)).all() });
});
export const POST = withRouteGuard({ roles: ["ADMIN"] }, async (request) => {
 const body = await request.json().catch(()=>null) as { fileType?: unknown } | null; const fileType = typeof body?.fileType === "string" ? body.fileType.trim().toLowerCase().replace(/^\.?/,".") : "";
 if (!/^\.[a-z0-9]{1,10}$/.test(fileType)) return NextResponse.json({ error: "Enter an extension such as .pdf or .jpg." },{status:400});
 const setting = db.select({id:systemSettings.id}).from(systemSettings).where(eq(systemSettings.id,1)).get(); if(!setting) return NextResponse.json({error:"Save system settings before configuring allowed file types."},{status:409});
 try { db.insert(allowedFileTypes).values({systemSettingId:setting.id,fileType}).run(); return NextResponse.json({ok:true},{status:201}); } catch { return NextResponse.json({error:"This file type is already allowed or could not be saved."},{status:409}); }
});
