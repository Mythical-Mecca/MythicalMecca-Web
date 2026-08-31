import Link from "next/link";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { DevLoginTrigger } from "@/components/dev-login-trigger";

/** The public site is a single page — these are in-page anchors, not routes. */
/** In the order the sections appear down the page. */
export const HOME_SECTIONS = [
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#events", label: "Events" },
  // The quests section only renders while something is running, so this anchor
  // lands on the partners band the rest of the year. Kept because the months
  // it does resolve are the months it matters.
  { href: "/#quests", label: "Quests" },
  { href: "/#partners", label: "Partners" },
];

/**
 * The signed-out header. Lives here rather than inline in the public layout
 * because publicly readable detail pages — a shared quest or event — sit in a
 * different route group and need the same header when nobody is signed in.
 */
export function PublicTopNav() {
  return (
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
          <nav
            aria-label="Page sections"
            className="mr-2 hidden items-center gap-1 md:flex"
          >
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
  );
}
