import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { users, roles, userRoles, airlines, airports } from "@/lib/db/schema";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string }> };
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const clean = (value: unknown) => typeof value === "string" ? value.trim() : value;

export const GET = withRouteGuard({ roles: ["ADMIN"] }, async (request: Request, context: Ctx) => {
  const { resource } = await context.params;
  if (resource === "user-roles") {
    const assignments = db.select({ id: userRoles.id, userId: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, roleId: roles.id, roleCode: roles.code, roleName: roles.name, createdAt: userRoles.createdAt })
      .from(userRoles).innerJoin(users, eq(userRoles.userId, users.id)).innerJoin(roles, eq(userRoles.roleId, roles.id)).all();
    const people = db.select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.isActive, true)).all();
    const availableRoles = db.select({ id: roles.id, code: roles.code, name: roles.name }).from(roles).where(eq(roles.isActive, true)).all();
    return NextResponse.json({ rows: assignments, options: { users: people, roles: availableRoles } });
  }
  const config = resourceConfigs[resource];
  if (!config) return NextResponse.json({ error: "Unknown admin resource" }, { status: 404 });
  const table = config.table as never;
  const rows = (db.select().from(table).all() as unknown as Record<string, unknown>[]);
  const url = new URL(request.url); const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const filtered = query ? rows.filter((row) => config.search.some((key) => String(row[key] ?? "").toLowerCase().includes(query))) : rows;
  if (resource === "crew-members") {
    const userRows = db.select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.isActive, true)).all();
    return NextResponse.json({ rows: filtered, options: { users: userRows } });
  }
  if (resource === "flights") {
    const airlineRows = db.select({ id: airlines.id, name: airlines.name, iataCode: airlines.iataCode }).from(airlines).where(eq(airlines.isActive, true)).all();
    const airportRows = db.select({ id: airports.id, name: airports.name, iataCode: airports.iataCode }).from(airports).where(eq(airports.isActive, true)).all();
    return NextResponse.json({ rows: filtered, options: { airlines: airlineRows, airports: airportRows } });
  }
  return NextResponse.json({ rows: filtered });
});

export const POST = withRouteGuard({ roles: ["ADMIN"] }, async (request: Request, context: Ctx) => {
  const { resource } = await context.params;
  if (resource === "user-roles") {
    const body = asRecord(await request.json()); const userId = clean(body.userId); const roleId = Number(body.roleId);
    if (typeof userId !== "string" || !userId || !Number.isInteger(roleId)) return NextResponse.json({ error: "Choose a user and role." }, { status: 400 });
    try { db.insert(userRoles).values({ userId, roleId }).run(); return NextResponse.json({ ok: true }, { status: 201 }); }
    catch { return NextResponse.json({ error: "Assignment could not be created. Check that the user and role exist and the assignment is not duplicated." }, { status: 409 }); }
  }
  const config = resourceConfigs[resource];
  if (!config || !config.canCreate || config.listOnly) return NextResponse.json({ error: "Create is not available for this resource." }, { status: 405 });
  const body = asRecord(await request.json()); const values: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (field.readOnly) continue;
    let value = clean(body[field.name]);
    if (field.kind === "boolean") value = value === true || value === 1 || value === "true";
    if (field.kind === "number" && value !== "" && value !== null && value !== undefined) value = Number(value);
    if ((value === "" || value === undefined) && !field.required) continue;
    if (field.required && (value === "" || value === null || value === undefined)) return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
    if (field.kind === "number" && value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) return NextResponse.json({ error: `${field.label} must be a number.` }, { status: 400 });
    values[field.name] = value;
  }
  try { db.insert(config.table as never).values(values as never).run(); return NextResponse.json({ ok: true }, { status: 201 }); }
  catch (error) { const message = error instanceof Error && /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message) ? "The record violates a uniqueness, validation, or relationship constraint. Check the values and linked records." : "The record could not be saved."; return NextResponse.json({ error: message }, { status: 409 }); }
});
