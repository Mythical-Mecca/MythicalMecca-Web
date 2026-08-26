import Link from "next/link";
import { Icon } from "@/components/icon";
import { auth } from "@/lib/auth";
import { countMyPartnerships } from "@/lib/partner-access";
import { AppTopNav } from "@/components/app-top-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Brand } from "@/components/brand";
import { DevLoginTrigger } from "@/components/dev-login-trigger";

// The public site is a single page — these are in-page anchors, not routes.
const HOME_SECTIONS = [
  { href: "/#about", label: "About" },
  { href: "/#events", label: "Events" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#partners", label: "Partners" },
];

const Footer = () => (
  <footer className="flex flex-col items-center gap-3 border-t border-[var(--mm-border)] px-6 py-8 text-center text-xs text-[var(--mm-text-dim)]">
    <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {HOME_SECTIONS.map((s) => (
        <a
          key={s.href}
          href={s.href}
          className="inline-flex min-h-6 items-center hover:text-[var(--mm-text)]"
        >
          {s.label}
        </a>
      ))}
      <Link href="/collab" className="inline-flex min-h-6 items-center hover:text-[var(--mm-text)]">
        Contact
      </Link>
    </nav>
    <a
      href="https://discord.gg/NKWMAtq2B"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-6 items-center gap-1.5 hover:text-[var(--mm-text)]"
    >
      <Icon icon="mdi:discord" width={16} /> Join our Discord
    </a>
    <span>Mythical Mecca — a hearth for the geek collective.</span>
  </footer>
);

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Logged-in visitors get the full app shell so public pages stay connected.
  // No <AppBackdrop> here — the public pages carry their own per-section
  // imagery, so a fixed full-page backdrop would double up behind them.
  if (session?.user) {
    const hasPartner = (await countMyPartnerships(session.user.id)) > 0;
    return (
      <div className="flex min-h-dvh flex-col">
        <a href="#main-content" className="mm-skip">
          Skip to content
        </a>
        <AppTopNav role={session.user.role} hasPartner={hasPartner} />
        <main id="main-content" tabIndex={-1} className="flex-1">
          <div className="mx-auto max-w-6xl px-6 empty:hidden [&:not(:empty)]:pt-6">
            <Breadcrumbs />
          </div>
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="mm-skip">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_90%,transparent)]">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
        >
          {process.env.NODE_ENV === "development" ? (
            // Dev easter egg: 5 quick clicks on the logo signs in as the
            // test account (localhost-only; enforced server-side in auth).
            <DevLoginTrigger>
              <Brand href="/" className="text-lg" />
            </DevLoginTrigger>
          ) : (
            <Brand href="/" className="text-lg" />
          )}
          <div className="flex items-center gap-1">
            <nav aria-label="Page sections" className="mr-2 hidden items-center gap-1 md:flex">
              {HOME_SECTIONS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <Link
              href="/login"
              className="mm-btn mm-btn-primary text-sm max-sm:px-3"
            >
              <Icon icon="mdi:account" width={16} />
              <span className="max-sm:hidden">Sign in</span>
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
