import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell min-h-dvh text-[var(--foreground)]">
      <aside className="cockpit-rail">
        <Link
          className="brand-lockup flex items-center gap-3"
          href="/"
          aria-label="Reports Generator home"
        >
          <span aria-hidden="true" className="brand-sigil">
            R
          </span>
          <span>
            <span className="brand-title">Reports Generator</span>
            <span className="brand-subtitle">Agency reporting cockpit</span>
          </span>
        </Link>

        <DashboardNav />

        <div className="rail-status">
          <span className="rail-status-dot" />
          <div>
            <p className="rail-status-label">System mode</p>
            <p className="rail-status-value">Report command</p>
          </div>
        </div>
      </aside>

      <header className="site-header sticky top-0 z-30 border-b border-[var(--border)]">
        <div className="flex w-full flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <Link
            className="brand-lockup flex items-center gap-3"
            href="/"
            aria-label="Reports Generator home"
          >
            <span aria-hidden="true" className="brand-sigil">
              R
            </span>
            <span>
              <span className="brand-title">Reports Generator</span>
              <span className="brand-subtitle">Agency reporting cockpit</span>
            </span>
          </Link>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <DashboardNav compact />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="cockpit-workspace">
        <div className="command-bar">
          <div>
            <p className="command-eyebrow">Premium analytics suite</p>
            <p className="command-title">Performance reporting control room</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="command-chip">Live database</span>
            <ThemeToggle />
          </div>
        </div>
        <main className="page-frame w-full px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
