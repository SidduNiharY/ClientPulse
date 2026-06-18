"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Overview", code: "OV" },
  { href: "/clients", label: "Clients", code: "CL" },
  { href: "/imports", label: "Imports", code: "IM" },
  { href: "/reports/new", label: "Reports", code: "RP" },
  { href: "/approvals", label: "Approvals", code: "AP" }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className={`nav-shell ${compact ? "is-compact" : ""}`}
    >
      {navigation.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`nav-pill ${isActive ? "is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true" className="nav-code">
              {item.code}
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
