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

  // Determine dynamic target href based on current route
  const getHref = (item: (typeof HOME_SECTIONS)[number]) => {
    if (pathname === "/partners" || pathname.startsWith("/partners/")) {
      return item.partnerHref ?? item.href;
    }
    return item.href;
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--mm-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--mm-surface)_90%,transparent)] backdrop-blur-md transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5"
      >
        <div className="flex items-center gap-3">
          {process.env.NODE_ENV === "development" ? (
            <DevLoginTrigger>
              <Brand href="/" className="text-lg" />
            </DevLoginTrigger>
          ) : (
            <Brand href="/" className="text-lg" />
          )}
        </div>

        {/* Desktop Tabs */}
        <div className="flex items-center gap-1">
          <nav
            aria-label="Page sections"
            className="mr-2 hidden items-center gap-1 lg:flex"
          >
            {HOME_SECTIONS.map((s) => {
              const isPartnerCategory =
                s.label === "Vendors" ||
                s.label === "Artists" ||
                s.label === "Collaborators";

              return (
                <a
                  key={s.label}
                  href={getHref(s)}
                  className={`inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                    isPartnerCategory
                      ? "text-[var(--mm-text-dim)] hover:bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] hover:text-[var(--mm-gold)]"
                      : "text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
                  }`}
                >
                  {s.label}
                </a>
              );
            })}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {signedIn ? (
              <>
                {showApply && (
                  <Link
                    href="/apply"
                    className="mm-btn mm-btn-ghost text-xs max-sm:px-2.5"
                  >
                    <Icon icon="game-icons:shop" width={15} />
                    <span className="max-sm:hidden">Apply</span>
                  </Link>
                )}
                <form action={publicSignOut}>
                  <button
                    type="submit"
                    className="mm-btn mm-btn-ghost text-xs max-sm:px-2.5"
                  >
                    <Icon icon="mdi:logout" width={15} />
                    <span className="max-sm:hidden">Sign out</span>
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="mm-btn mm-btn-primary text-xs max-sm:px-3"
              >
                <Icon icon="mdi:account" width={15} />
                <span className="max-sm:hidden">Sign in</span>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--mm-border)] text-[var(--mm-text-dim)] hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] lg:hidden transition"
            >
              <Icon
                icon={mobileMenuOpen ? "mdi:close" : "mdi:menu"}
                width={20}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--mm-divider)] bg-[var(--mm-surface)] px-6 py-4 lg:hidden">
          <nav aria-label="Mobile sections" className="grid grid-cols-2 gap-2">
            {HOME_SECTIONS.map((s) => {
              const isPartnerCategory =
                s.label === "Vendors" ||
                s.label === "Artists" ||
                s.label === "Collaborators";

              return (
                <a
                  key={s.label}
                  href={getHref(s)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isPartnerCategory
                      ? "text-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)]"
                      : "text-[var(--mm-text)] hover:bg-[var(--mm-elevated)]"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${
                      isPartnerCategory
                        ? "bg-[var(--mm-gold)]"
                        : "bg-[var(--mm-blue)]"
                    }`}
                  />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
