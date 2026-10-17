"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { DevLoginTrigger } from "@/components/dev-login-trigger";
import { publicSignOut } from "@/app/(public)/actions";
import {
  DESKTOP_SECTIONS,
  DESKTOP_PARTNER_TABS,
  BURGER_SECTIONS,
  HOME_SECTIONS,
} from "@/lib/navigation";

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

  // Dynamic link targets for partner tabs
  const getPartnerTabHref = (tab: (typeof DESKTOP_PARTNER_TABS)[number]) => {
    if (isPartnersPage && tab.partnerHref) {
      return tab.partnerHref.replace("/partners", "");
    }
    return tab.partnerHref ?? tab.href;
  };

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
          {/* Main sections on Base PC */}
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-0.5 md:flex"
          >
            {DESKTOP_SECTIONS.map((s) => {
              const isCalendar = s.label === "Calendar";
              return (
                <a
                  key={s.label}
                  href={s.href}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors ${
                    isCalendar
                      ? "text-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--mm-gold)_20%,transparent)] hover:text-[var(--mm-text)]"
                      : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                  }`}
                >
                  {s.icon && <Icon icon={s.icon} width={13} />}
                  <span>{s.label}</span>
                </a>
              );
            })}
          </nav>

          {/* DEDICATED PARTNER CATEGORY TABS SEGMENT (Base PC only) */}
          <div
            aria-label="Partner category tabs"
            className="hidden md:flex items-center rounded-xl border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_70%,transparent)] p-1 gap-0.5 shadow-sm"
          >
            {DESKTOP_PARTNER_TABS.map((tab) => {
              const targetHref = getPartnerTabHref(tab);
              const isActive =
                (tab.label === "Partners" && isPartnersPage && !activeHash) ||
                (tab.label === "Vendors" && activeHash === "#vendors") ||
                (tab.label === "Artists" && activeHash === "#artists") ||
                (tab.label === "Collaborators" && activeHash === "#collaborators");

              return (
                <a
                  key={tab.label}
                  href={targetHref}
                  className={`inline-flex min-h-7 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[var(--mm-gold)] text-[var(--mm-bg)] font-semibold shadow-sm"
                      : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                  }`}
                >
                  {tab.icon && <Icon icon={tab.icon} width={13} />}
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

      {/* Burger Menu Drawer (Mobile) - Contains ONLY the Partner tab, omitting Vendors/Artists/Collaborators */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--mm-divider)] bg-[var(--mm-surface)] px-5 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1.5">
            {BURGER_SECTIONS.map((s) => {
              const isCalendar = s.label === "Calendar";
              const isPartner = s.label === "Partners";
              const isQuests = s.label === "Quests";

              return (
                <a
                  key={s.label}
                  href={s.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isCalendar
                      ? "text-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)]"
                      : isPartner
                        ? "text-[var(--mm-text)] bg-[var(--mm-elevated)] border border-[var(--mm-border)]"
                        : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {s.icon ? (
                      <Icon icon={s.icon} width={17} />
                    ) : isQuests ? (
                      <Icon icon="game-icons:treasure-map" width={17} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--mm-blue)]" />
                    )}
                    <span>{s.label}</span>
                  </span>
                  <Icon icon="mdi:chevron-right" width={16} className="text-[var(--mm-text-dim)]" />
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
