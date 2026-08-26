import Link from "next/link";
import { Icon } from "@/components/icon";
import type { ReturnTo } from "@/lib/return-to";

/**
 * The "up and out" link at the top of a detail screen. Its destination comes
 * from `parseReturn`, so it points at whatever opened this page rather than at
 * a fixed list — see lib/return-to.ts.
 */
export function BackLink({ to }: { to: ReturnTo }) {
  return (
    <Link
      href={to.href}
      className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
    >
      <Icon icon="mdi:chevron-left" width={16} /> {to.label}
    </Link>
  );
}
