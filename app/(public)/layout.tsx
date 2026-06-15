import Link from "next/link";
import { Icon } from "@/components/icon";
import { auth } from "@/lib/auth";
import { getLiveEvent } from "@/lib/content";
import { AppTopNav } from "@/components/app-top-nav";
import { AppBackdrop } from "@/components/app-backdrop";
import { Breadcrumbs } from "@/components/breadcrumbs";

const Footer = () => (
  <footer className="border-t border-[var(--mm-border)] px-6 py-8 text-center text-xs text-[var(--mm-text-dim)]">
    Mythical Mecha — a hearth for the geek collective.
  </footer>
);

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Logged-in visitors get the full app shell so public pages stay connected.
  if (session?.user) {
    const liveEvent = await getLiveEvent();
    return (
      <div className="flex min-h-full flex-col">
        <AppBackdrop />
        <AppTopNav
          role={session.user.role}
          liveEvent={
            liveEvent
              ? { slug: liveEvent.slug, title: liveEvent.title }
              : null
          }
        />
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-6 pt-6 empty:hidden">
            <Breadcrumbs />
          </div>
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg tracking-widest"
          >
            MYTHICAL<span className="mm-gradient-text"> MECHA</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-[var(--mm-text-dim)] md:flex">
            <Link href="/news" className="inline-flex items-center gap-1.5 hover:text-[var(--mm-text)]">
              <Icon icon="game-icons:scroll-unfurled" width={16} /> Tidings
            </Link>
            <Link href="/events" className="inline-flex items-center gap-1.5 hover:text-[var(--mm-text)]">
              <Icon icon="game-icons:campfire" width={16} /> Gatherings
            </Link>
            <Link href="/armory" className="inline-flex items-center gap-1.5 hover:text-[var(--mm-text)]">
              <Icon icon="game-icons:anvil" width={16} /> Armory
            </Link>
            <Link href="/collab" className="inline-flex items-center gap-1.5 hover:text-[var(--mm-text)]">
              <Icon icon="game-icons:raven" width={16} /> Send a raven
            </Link>
          </div>
          <Link href="/login" className="mm-btn mm-btn-primary text-sm">
            <Icon icon="mdi:login-variant" width={16} /> Sign in
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
