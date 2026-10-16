import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { allowedFileTypes } from "@/lib/db/schema";
type Ctx={params:Promise<{id:string}>};
export const DELETE=withRouteGuard({roles:["ADMIN"]},async(_request,context:Ctx)=>{const {id}=await context.params;const result=db.delete(allowedFileTypes).where(eq(allowedFileTypes.id,Number(id))).run();return result.changes?NextResponse.json({ok:true}):NextResponse.json({error:"File type not found."},{status:404});});
