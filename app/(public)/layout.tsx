import Link from "next/link";
import { Icon } from "@/components/icon";
import { SiteNav } from "@/components/site-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HOME_SECTIONS } from "@/components/public-top-nav";
import { withReturn } from "@/lib/return-to";

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
      <Link
        href={withReturn("/collab", { href: "/", label: "home" })}
        className="inline-flex min-h-6 items-center hover:text-[var(--mm-text)]"
      >
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
    <span>Mythical Mecca — a hearth for the geek community.</span>
  </footer>
);

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="mm-skip">
        Skip to content
      </a>
      <SiteNav />
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
