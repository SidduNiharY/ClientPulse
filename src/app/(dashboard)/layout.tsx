import Link from "next/link";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/clients", label: "Clients" },
  { href: "/connections", label: "Connections" },
  { href: "/imports", label: "Imports" },
  { href: "/reports/new", label: "Reports" },
  { href: "/approvals", label: "Approvals" }
];

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <Link className="text-lg font-semibold tracking-normal" href="/">
            Reports Generator
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[#eef4f1] hover:text-[var(--foreground)]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
