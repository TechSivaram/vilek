"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getWorkspacesForRoles } from "@/lib/workspaces";

export function WorkspaceSwitcher({
  roleCodes,
  currentRole,
}: {
  roleCodes: string[];
  currentRole: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const pathname = usePathname();
  const workspaces = getWorkspacesForRoles(roleCodes);
  const current = workspaces.find((workspace) => workspace.code === currentRole);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(390, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const estimatedHeight = Math.min(500, window.innerHeight - 24);
      const top = rect.bottom + 8 + estimatedHeight > window.innerHeight
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : rect.bottom + 8;
      setMenuPosition({ top, left, width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
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

  if (!current || workspaces.length < 1) return null;

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        className="workspace-switcher__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="workspace-switcher__trigger-icon" data-theme={current.code.toLowerCase()} aria-hidden="true">{current.icon}</span>
        <span className="workspace-switcher__trigger-copy">
          <small>WORKSPACE</small>
          <strong>{current.name}</strong>
        </span>
        <span className="workspace-switcher__chevron" aria-hidden="true">⌄</span>
      </button>
      {open && menuPosition && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="workspace-switcher__menu workspace-switcher__menu--portal"
          role="menu"
          aria-label="Switch workspace"
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          <div className="workspace-switcher__menu-heading">SWITCH WORKSPACE</div>
          {workspaces.map((workspace) => {
            const active = workspace.code === currentRole;
            return (
              <Link
                key={workspace.code}
                href={workspace.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                className={`workspace-switcher__item ${active ? "is-current" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="workspace-switcher__item-icon" data-theme={workspace.code.toLowerCase()} aria-hidden="true">{workspace.icon}</span>
                <span className="workspace-switcher__item-copy">
                  <strong>{workspace.name}</strong>
                  <small>{active ? "Current workspace" : workspace.description}</small>
                </span>
                {active ? <span className="workspace-switcher__check" aria-hidden="true">✓</span> : null}
              </Link>
            );
          })}
          <div className="workspace-switcher__menu-footer">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <span aria-hidden="true">▦</span> View all workspaces
            </Link>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
