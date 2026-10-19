import Link from "next/link";
import { Icon } from "@/components/icon";
import { SiteNav } from "@/components/site-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HOME_SECTIONS } from "@/lib/navigation";
import { withReturn } from "@/lib/return-to";

const Footer = () => (
  <footer className="flex flex-col items-center gap-3 border-t border-[var(--mm-border)] px-6 py-8 text-center text-xs text-[var(--mm-text-dim)]">
    <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {HOME_SECTIONS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          className="inline-flex min-h-6 items-center hover:text-[var(--mm-text)]"
        >
          {s.label}
        </a>
      ))}
    </nav>
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
      <a
        href="https://discord.gg/X5YHrR33T"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-6 items-center gap-1.5 hover:text-[var(--mm-gold)]"
      >
        <Icon icon="mdi:discord" width={16} /> Discord
      </a>
      <a
        href="https://instagram.com/mythicalmecca"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-6 items-center gap-1.5 hover:text-[var(--mm-gold)]"
      >
        <Icon icon="mdi:instagram" width={16} /> Instagram
      </a>
      <a
        href="https://tiktok.com/@mythical.mecca"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-6 items-center gap-1.5 hover:text-[var(--mm-gold)]"
      >
        <Icon icon="logos:tiktok-icon" width={15} /> TikTok
      </a>
      <a
        href="mailto:information@mythical-mecca.com"
        className="inline-flex min-h-6 items-center gap-1.5 hover:text-[var(--mm-gold)]"
      >
        <Icon icon="mdi:email-outline" width={16} /> information@mythical-mecca.com
      </a>
    </div>
    <span>Mythical Mecca — a hearth for the geek community.</span>
  </footer>
);

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden max-w-full w-full">
      <a href="#main-content" className="mm-skip">
        Skip to content
      </a>
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden max-w-full w-full">
        <div className="mx-auto max-w-6xl px-6 empty:hidden [&:not(:empty)]:pt-6">
          <Breadcrumbs />
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}
