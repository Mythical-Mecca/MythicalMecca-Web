"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { DevLoginTrigger } from "@/components/dev-login-trigger";
import { publicSignOut } from "@/app/(public)/actions";
import { HOME_SECTIONS, type NavSection } from "@/lib/navigation";

export { HOME_SECTIONS };

export function PublicTopNav({
  signedIn = false,
  showApply = false,
}: {
  signedIn?: boolean;
  showApply?: boolean;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveHash(window.location.hash);
      const onHashChange = () => setActiveHash(window.location.hash);
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    }
  }, []);

  // Scroll detection: slide up out of view on scroll down, slide down on slight scroll up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Always visible near top of page
          if (currentScrollY <= 50) {
            setVisible(true);
          } else {
            const diff = currentScrollY - lastScrollY;

            // Scrolling down by more than 6px -> slide up out of view
            if (diff > 6 && !mobileMenuOpen) {
              setVisible(false);
            }
            // Sliding up slightly (even 4px) -> slide down back into view
            else if (diff < -4) {
              setVisible(true);
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen]);

  const isPartnersPage = pathname === "/partners" || pathname.startsWith("/partners/");

  // Dynamic link targets
  const calendarHref = isPartnersPage ? "/#calendar" : "#calendar";
  const partnersBaseHref = "/partners";
  const vendorsHref = isPartnersPage ? "#vendors" : "/partners#vendors";
  const artistsHref = isPartnersPage ? "#artists" : "/partners#artists";
  const collaboratorsHref = isPartnersPage ? "#collaborators" : "/partners#collaborators";

  const partnerTabs = [
    { label: "Partners", href: partnersBaseHref, icon: "game-icons:anvil" },
    { label: "Vendors", href: vendorsHref, icon: "game-icons:shop" },
    { label: "Artists", href: artistsHref, icon: "game-icons:paint-brush" },
    { label: "Collaborators", href: collaboratorsHref, icon: "mdi:handshake-outline" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_92%,transparent)] backdrop-blur-md transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3"
      >
        <div className="flex items-center gap-3">
          {process.env.NODE_ENV === "development" ? (
            <DevLoginTrigger>
              <Brand href="/" className="text-base sm:text-lg" />
            </DevLoginTrigger>
          ) : (
            <Brand href="/" className="text-base sm:text-lg" />
          )}
        </div>

        {/* Center / Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Main sections */}
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-0.5 md:flex"
          >
            <a
              href="/#about"
              className="inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-medium text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              About
            </a>
            <a
              href="/#gallery"
              className="inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-medium text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              Gallery
            </a>
            <a
              href={calendarHref}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--mm-gold)_20%,transparent)] hover:text-[var(--mm-text)]"
            >
              <Icon icon="mdi:calendar-month-outline" width={14} />
              <span>Calendar</span>
            </a>
            <a
              href="/#quests"
              className="inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-medium text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              Quests
            </a>
          </nav>

          {/* DEDICATED PARTNER CATEGORY TABS SEGMENT */}
          <div
            aria-label="Partner category tabs"
            className="hidden md:flex items-center rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_70%,transparent)] p-1 gap-0.5 shadow-sm"
          >
            {partnerTabs.map((tab) => {
              const isActive =
                (tab.label === "Partners" && isPartnersPage && !activeHash) ||
                (tab.label === "Vendors" && activeHash === "#vendors") ||
                (tab.label === "Artists" && activeHash === "#artists") ||
                (tab.label === "Collaborators" && activeHash === "#collaborators");

              return (
                <a
                  key={tab.label}
                  href={tab.href}
                  className={`inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[var(--mm-gold)] text-[var(--mm-bg)] font-semibold shadow-sm"
                      : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                  }`}
                >
                  <Icon icon={tab.icon} width={13} />
                  <span>{tab.label}</span>
                </a>
              );
            })}
          </div>

          {/* User Sign In / Out Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {signedIn ? (
              <>
                {showApply && (
                  <Link
                    href="/apply"
                    className="mm-btn mm-btn-ghost text-xs max-sm:px-2.5"
                  >
                    <Icon icon="game-icons:shop" width={14} />
                    <span className="max-sm:hidden">Apply</span>
                  </Link>
                )}
                <form action={publicSignOut}>
                  <button
                    type="submit"
                    className="mm-btn mm-btn-ghost text-xs max-sm:px-2.5"
                  >
                    <Icon icon="mdi:logout" width={14} />
                    <span className="max-sm:hidden">Sign out</span>
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="mm-btn mm-btn-primary text-xs max-sm:px-3"
              >
                <Icon icon="mdi:account" width={14} />
                <span className="max-sm:hidden">Sign in</span>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--mm-border)] text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] md:hidden transition"
            >
              <Icon
                icon={mobileMenuOpen ? "mdi:close" : "mdi:menu"}
                width={20}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer with Segmented Tabs */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--mm-divider)] bg-[var(--mm-surface)] px-4 py-4 md:hidden space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--mm-text-dim)] mb-2">
              Sections
            </p>
            <nav className="grid grid-cols-2 gap-1.5">
              <a
                href="/#about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              >
                About
              </a>
              <a
                href="/#gallery"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              >
                Gallery
              </a>
              <a
                href={calendarHref}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] font-medium"
              >
                <Icon icon="mdi:calendar-month-outline" width={14} />
                Calendar
              </a>
              <a
                href="/#quests"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
              >
                Quests
              </a>
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--mm-gold)] mb-2">
              Partner Tabs
            </p>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_50%,transparent)] p-1.5">
              {partnerTabs.map((tab) => (
                <a
                  key={tab.label}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--mm-text)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-gold)] transition"
                >
                  <Icon icon={tab.icon} width={15} className="text-[var(--mm-gold)]" />
                  {tab.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
