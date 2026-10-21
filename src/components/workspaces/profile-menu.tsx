"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function ProfileMenu({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        className="profile-menu__trigger"
        type="button"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="profile-menu__avatar">{initials}</span>
      </button>
      {open && (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__identity">
            <span className="profile-menu__avatar profile-menu__avatar--large">{initials}</span>
            <span className="profile-menu__copy">
              <strong>
                {firstName} {lastName}
              </strong>
              <small>{email}</small>
            </span>
          </div>
          <div className="profile-menu__status">Signed in to ViLek</div>
          <Link
            href="/profile/security"
            className="profile-menu__action"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">⌑</span>
            Security &amp; MFA
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="profile-menu__signout" role="menuitem">
              <span aria-hidden="true">↪</span> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
