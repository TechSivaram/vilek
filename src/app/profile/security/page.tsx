import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { SecurityMfaPanel } from "@/components/profile/security-mfa-panel";
import { WorkspacePickerHeader } from "@/components/workspaces/workspace-picker-header";
import "@/app/dashboard/dashboard.css";

export const dynamic = "force-dynamic";

export default async function ProfileSecurityPage() {
  const authenticated = await requireAuthenticatedUser();

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-[#20384b]">
      <WorkspacePickerHeader
        firstName={authenticated.user.firstName}
        lastName={authenticated.user.lastName}
        email={authenticated.user.email}
      />

      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-sm text-[#718391]">
          <Link href="/dashboard" className="transition hover:text-[#087f80]">
            Workspaces
          </Link>
          <span aria-hidden="true">/</span>
          <span>Profile</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-[#20384b]">
            Security &amp; MFA
          </span>
        </nav>

        <header className="mb-7 flex flex-col gap-4 border-b border-[#dfe7eb] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#cde8e3] bg-[#e7f6f2] text-[#087f80]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <path d="M12 14v3" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f80]">Profile settings</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#20384b] sm:text-3xl">Security &amp; MFA</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607583]">
                Manage how you protect your ViLek account when signing in.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#dfe7eb] bg-white px-4 py-3 text-sm text-[#607583]">
            <span className="font-semibold text-[#20384b]">Identity provider</span>
            <span className="mx-2 text-[#a2b0b8]">·</span>
            TSCloak
          </div>
        </header>

        <div className="mx-auto max-w-5xl">
          <SecurityMfaPanel />
          <p className="mt-3 px-1 text-xs leading-5 text-[#7b8d98]">
            Changes take effect for your ViLek sign-in account. Keep your authenticator setup key private.
          </p>
        </div>
      </div>
    </main>
  );
}
