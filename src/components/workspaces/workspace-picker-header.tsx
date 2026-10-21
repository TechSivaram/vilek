import Link from "next/link";

type WorkspacePickerHeaderProps = {
  firstName: string | null;
  lastName: string | null;
  email: string;
};

/** Lightweight authenticated profile header used on the Security & MFA page. */
export function WorkspacePickerHeader({
  firstName,
  lastName,
  email,
}: WorkspacePickerHeaderProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email;
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-[#20384b]"
        >
          ViLek
        </Link>
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold text-[#20384b]">
            {displayName}
          </p>
          <p className="truncate text-xs text-[#718391]">{email}</p>
        </div>
      </div>
    </header>
  );
}
