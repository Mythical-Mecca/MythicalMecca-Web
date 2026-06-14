export default function CommandOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        <span className="mm-gradient-text">Command</span> deck
      </h1>
      <p className="text-[var(--mm-text-dim)]">
        Platform control. Posts, events, vendor applications and Command telemetry
        (the black-box recorder) wire up in Phase 3.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Pilots", "Posts", "Active ops", "Errors (24h)"].map((k) => (
          <div key={k} className="mm-glass p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
              {k}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
