import Link from "next/link";

export default function ConnectionsPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">
          Sheet-first workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Direct API setup is disabled
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          This application now imports performance data through Google Sheets,
          CSV, scripts, and BigQuery. Use the import desk to paste a Google
          Sheet link and load data without configuring platform API credentials.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="primary-action" href="/imports">
            Go to imports
          </Link>
          <Link className="secondary-action" href="/clients">
            Manage mappings
          </Link>
        </div>
      </div>
    </section>
  );
}
