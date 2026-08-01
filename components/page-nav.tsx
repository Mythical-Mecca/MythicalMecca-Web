"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./icon";
import { Breadcrumbs } from "./breadcrumbs";

/**
 * Reusable per-page sub-nav: a Back button (browser history, falling back to the
 * parent route) on the left, the breadcrumb trail in the middle, and a Home
 * button that always returns to the dashboard on the right. Rendered once by
 * each area layout so every page gets consistent back/home affordances. Hidden
 * on the dashboard itself, where "back" and "home" are meaningless.
 */
export function PageNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === "/dashboard") return null;

  const segs = pathname.split("/").filter(Boolean);
  const parent =
    segs.length > 1 ? "/" + segs.slice(0, -1).join("/") : "/dashboard";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(parent);
    }
  };

  const chip =
    "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] px-3 py-1.5 text-sm text-[var(--mm-text-dim)] transition hover:border-[var(--mm-violet)] hover:text-[var(--mm-text)]";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={goBack}
        className={chip}
        aria-label="Go back"
      >
        <Icon icon="mdi:arrow-left" width={16} />
        <span className="max-sm:hidden">Back</span>
      </button>
      <Breadcrumbs />
    </div>
  );
}
