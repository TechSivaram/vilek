import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { listQuerySchema } from "@/lib/admin/features/users/schema";
import { usersService } from "@/lib/admin/features/users/service";
import { getScimAccessToken, getScimBaseUrl } from "@/lib/identity-provider/scim";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async (request: Request) => {
  const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Invalid pagination or search parameters.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  const result = await usersService.list({
    search: parsed.data.q,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    sort: parsed.data.sort,
    direction: parsed.data.direction,
  });
  return NextResponse.json({
    rows: result.rows,
    options: {},
    pagination: {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / parsed.data.pageSize)),
    },
  });
});

const createUserSchema = z.object({
  email: z.string().trim().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export const POST = withRouteGuard({ roles: ["ADMIN"] }, async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Enter a valid email, first name, and last name.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  const values = {
    email: parsed.data.email.toLowerCase(),
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  };
  if (await usersService.findByEmail(values.email))
    return NextResponse.json(
      { error: "A ViLek user with this email already exists." },
      { status: 409 },
    );
  if (process.env.IDP_SCIM_ENABLED !== "true")
    return NextResponse.json(
      {
        error: "SCIM provisioning is disabled. Set IDP_SCIM_ENABLED=true.",
      },
      { status: 503 },
    );

  const issuer = requiredEnv("IDP_ISSUER").replace(/\/$/, "");
  const scimBaseUrl = getScimBaseUrl(issuer);
  let token: string;
  try {
    token = await getScimAccessToken(issuer);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not authenticate with identity provider.",
      },
      { status: 502 },
    );
  }

  const userName = values.email;
  const scimResponse = await fetch(`${scimBaseUrl}/Users`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/scim+json",
      accept: "application/scim+json, application/json",
    },
    body: JSON.stringify({
      userName,
      displayName: `${values.firstName} ${values.lastName}`,
      name: { givenName: values.firstName, familyName: values.lastName },
      emails: [{ value: values.email, type: "work", primary: true }],
      active: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const scimUser = (await scimResponse.json().catch(() => ({}))) as {
    id?: string;
    detail?: string;
    message?: string;
    userName?: string;
  };
  if (!scimResponse.ok || !scimUser.id) {
    const duplicate = scimResponse.status === 409;
    return NextResponse.json(
      {
        error: duplicate
          ? "This user already exists in identity provider. Sync users or reconcile the existing account before retrying."
          : `identity provider could not create the user (HTTP ${scimResponse.status}): ${scimUser.detail ?? scimUser.message ?? "SCIM response did not include a user ID."}`,
      },
      { status: duplicate ? 409 : 502 },
    );
  }

  let localUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    oidcSubject: string;
    isActive: boolean;
  };
  try {
    localUser = usersService.createProvisionedUser({
      ...values,
      scimId: scimUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `identity provider created the account, but ViLek could not save its local link. Do not retry creation; reconcile SCIM user ${scimUser.id}.`,
      },
      { status: 500 },
    );
  }

  // The API contract says the forgot-password response is intentionally generic.
  // Attempt it after successful SCIM provisioning; a mail-flow failure must not hide the created account.
  let passwordEmailSent = false;
  let passwordEmailMessage =
    "The account was created, but the identity provider did not confirm the password setup request. Use the password-reset action after checking identity provider permissions and email configuration.";
  try {
    // identity provider's forgot-password endpoint accepts the client ID and email payload;
    // do not send the SCIM client-credentials token to this public account workflow.
    const resetResponse = await fetch(requiredEnv("IDP_PASSWORD_SETUP_URL"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        clientId: requiredEnv("IDP_CLIENT_ID"),
        email: values.email,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const resetBody = (await resetResponse.json().catch(() => ({}))) as {
      message?: string;
    };
    passwordEmailSent = resetResponse.ok;
    if (resetResponse.ok)
      passwordEmailMessage =
        resetBody.message ??
        "If the account exists, identity provider has accepted the password setup request.";
    else
      passwordEmailMessage = `The account was created, but the password setup request failed (HTTP ${resetResponse.status}).`;
  } catch {
    /* Keep the created account and report the separate email-flow status. */
  }

  return NextResponse.json(
    {
      ok: true,
      user: localUser,
      passwordEmailSent,
      message: passwordEmailSent
        ? "User created in ViLek and identity provider. The identity provider accepted the password setup request."
        : "User created in ViLek and the identity provider, but the password setup email could not be confirmed.",
      passwordEmailMessage,
    },
    { status: 201 },
  );
});
