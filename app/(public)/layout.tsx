import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-bg)_82%,transparent)] backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg tracking-widest"
          >
            MYTHIC<span className="mm-gradient-text"> MECHA</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-[var(--mm-text-dim)] md:flex">
            <Link href="/news" className="hover:text-[var(--mm-text)]">Tidings</Link>
            <Link href="/events" className="hover:text-[var(--mm-text)]">Gatherings</Link>
            <Link href="/armory" className="hover:text-[var(--mm-text)]">Armory</Link>
            <Link href="/collab" className="hover:text-[var(--mm-text)]">Send a raven</Link>
          </div>
          <Link href="/login" className="mm-btn mm-btn-primary text-sm">
            Enter the hall
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--mm-border)] px-6 py-8 text-center text-xs text-[var(--mm-text-dim)]">
        Mythic Mecha — a hearth for the geek collective.
      </footer>
    </div>
  );
}
