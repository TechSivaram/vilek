import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { userRoles, users, roles } from "@/lib/db/schema";
import { and, count, eq } from "drizzle-orm";
import { resourceConfigs } from "@/lib/admin/resources";

type Ctx = { params: Promise<{ resource: string; id: string }> };
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const PATCH = withRouteGuard(
  { roles: ["ADMIN"] },
  async (request: Request, context: Ctx) => {
    const { resource, id } = await context.params;
    if (resource === "user-roles")
      return NextResponse.json(
        {
          error:
            "Use DELETE to remove an assignment; assignment IDs cannot be edited.",
        },
        { status: 405 },
      );
    const config = resourceConfigs[resource];
    if (!config || !config.canEdit)
      return NextResponse.json(
        { error: "Update is not available for this resource." },
        { status: 405 },
      );
    const body = asRecord(await request.json());
    const values: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (field.readOnly || !(field.name in body)) continue;
      let value = body[field.name];
      if (field.kind === "boolean")
        value = value === true || value === 1 || value === "true";
      else if (field.kind === "number") {
        value = Number(value);
        if (!Number.isFinite(value))
          return NextResponse.json(
            { error: `${field.label} must be a number.` },
            { status: 400 },
          );
      } else if (typeof value === "string") value = value.trim();
      if (
        field.required &&
        (value === "" || value === null || value === undefined)
      )
        return NextResponse.json(
          { error: `${field.label} is required.` },
          { status: 400 },
        );
      values[field.name] = value;
    }
    if (!Object.keys(values).length)
      return NextResponse.json(
        { error: "No editable fields supplied." },
        { status: 400 },
      );
    if (["users", "crew-members"].includes(resource))
      values.updatedAt = new Date().toISOString();
    try {
      const result = db
        .update(config.table as never)
        .set(values as never)
        .where(eq((config.table as { id: never }).id, id as never))
        .run();
      if (!result.changes)
        return NextResponse.json(
          { error: "Record not found." },
          { status: 404 },
        );
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        {
          error:
            "The record could not be updated. Check uniqueness, validation, and linked records.",
        },
        { status: 409 },
      );
    }
  },
);
export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx, auth) => {
    const { resource, id } = await context.params;
    if (resource === "user-roles") {
      const assignment = db
        .select({
          userId: userRoles.userId,
          roleCode: roles.code,
          userActive: users.isActive,
        })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(eq(userRoles.id, Number(id)))
        .get();
      if (!assignment)
        return NextResponse.json(
          { error: "Assignment not found." },
          { status: 404 },
        );
      if (assignment.roleCode === "ADMIN" && assignment.userActive) {
        const admins =
          db
            .select({ value: count() })
            .from(users)
            .innerJoin(userRoles, eq(userRoles.userId, users.id))
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(
              and(
                eq(users.isActive, true),
                eq(roles.code, "ADMIN"),
                eq(roles.isActive, true),
              ),
            )
            .get()?.value ?? 0;
        if (admins <= 1)
          return NextResponse.json(
            {
              error:
                "The last active administrator role assignment cannot be removed.",
            },
            { status: 409 },
          );
      }
      const result = db
        .delete(userRoles)
        .where(eq(userRoles.id, Number(id)))
        .run();
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json(
            { error: "Assignment not found." },
            { status: 404 },
          );
    }
    const config = resourceConfigs[resource];
    if (!config || !config.canDeactivate)
      return NextResponse.json(
        { error: "Delete/deactivation is not available for this resource." },
        { status: 405 },
      );
    const isTextId = ["users", "crew-members", "flights"].includes(resource);
    const idValue = isTextId ? id : Number(id);
    if (resource === "users" && id === auth.user.id)
      return NextResponse.json(
        { error: "You cannot deactivate your own administrator account." },
        { status: 409 },
      );
    if (resource === "users") {
      const targetAdmin = db
        .select({ id: users.id })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(
          and(
            eq(users.id, id),
            eq(users.isActive, true),
            eq(roles.code, "ADMIN"),
            eq(roles.isActive, true),
          ),
        )
        .get();
      if (targetAdmin) {
        const admins =
          db
            .select({ value: count() })
            .from(users)
            .innerJoin(userRoles, eq(userRoles.userId, users.id))
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(
              and(
                eq(users.isActive, true),
                eq(roles.code, "ADMIN"),
                eq(roles.isActive, true),
              ),
            )
            .get()?.value ?? 0;
        if (admins <= 1)
          return NextResponse.json(
            { error: "The last active administrator cannot be deactivated." },
            { status: 409 },
          );
      }
    }
    if (resource === "roles" && Number(id) > 0) {
      const targetRole = db
        .select({ code: roles.code })
        .from(roles)
        .where(eq(roles.id, Number(id)))
        .get();
      if (targetRole?.code === "ADMIN") {
        const admins =
          db
            .select({ value: count() })
            .from(users)
            .innerJoin(userRoles, eq(userRoles.userId, users.id))
            .innerJoin(roles, eq(roles.id, userRoles.roleId))
            .where(
              and(
                eq(users.isActive, true),
                eq(roles.code, "ADMIN"),
                eq(roles.isActive, true),
              ),
            )
            .get()?.value ?? 0;
        if (admins <= 1)
          return NextResponse.json(
            {
              error:
                "The ADMIN role cannot be deactivated while it is the only active administrator role.",
            },
            { status: 409 },
          );
      }
    }
    try {
      const result = db
        .update(config.table as never)
        .set({ isActive: false } as never)
        .where(eq((config.table as { id: never }).id, idValue as never))
        .run();
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch {
      return NextResponse.json(
        { error: "The record could not be deactivated." },
        { status: 409 },
      );
    }
  },
);
