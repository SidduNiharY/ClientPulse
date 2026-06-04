const statusItems = [
  { label: "Clients", value: "0" },
  { label: "Imports", value: "0" },
  { label: "Draft reports", value: "0" },
  { label: "Pending approvals", value: "0" }
];

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Agency Reporting
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-[var(--foreground)]">
          Internal report operations
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusItems.map((item) => (
          <div
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
            key={item.label}
          >
            <p className="text-sm font-medium text-[var(--muted)]">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-normal">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
