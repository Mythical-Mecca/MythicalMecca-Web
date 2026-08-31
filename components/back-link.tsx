import Link from "next/link";
import { headers } from "next/headers";
import { Icon } from "@/components/icon";
import { auth } from "@/lib/auth";
import type { ReturnTo } from "@/lib/return-to";

/**
 * Did this reader arrive from somewhere on the site?
 *
 * A same-origin referer covers both a link followed from another page and a
 * client-side navigation, whose RSC fetch carries the previous page as its
 * referer. Browsers send the full path for same-origin navigation under the
 * default referrer policy, and only the bare origin cross-site — either way
 * the host is all this needs.
 */
async function arrivedFromSite(): Promise<boolean> {
  const h = await headers();
  const referer = h.get("referer");
  if (!referer) return false;
  try {
    const host = h.get("host");
    return !!host && new URL(referer).host === host;
  } catch {
    return false;
  }
}

/**
 * The "up and out" link at the top of a detail screen. Its destination comes
 * from `parseReturn`, so it points at whatever opened this page rather than at
 * a fixed list — see lib/return-to.ts.
 *
 * Hidden from a cold arrival. Somebody who opened a shared link straight from
 * a group chat has no "back" on this site to return to, and offering one sends
 * them to a page they have never seen as though they had lost their place. A
 * member gets it wherever they are, because for them every fallback is a real
 * destination; everyone else gets it only once they are actually browsing.
 */
export async function BackLink({
  to,
  always = false,
}: {
  to: ReturnTo;
  /** Force the link on, for a screen that is a dead end without it. */
  always?: boolean;
}) {
  if (!always) {
    const [session, internal] = await Promise.all([auth(), arrivedFromSite()]);
    if (!session?.user && !internal) return null;
  }

  return (
    <Link
      href={to.href}
      className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
    >
      <Icon icon="mdi:chevron-left" width={16} /> {to.label}
    </Link>
  );
}
