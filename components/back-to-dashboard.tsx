import Link from "next/link";
import { Icon } from "@/components/icon";

/** Animated pill that returns a signed-in visitor from a public page to their dashboard. */
export function BackToDashboard() {
  return (
    <Link href="/dashboard" className="mm-back" aria-label="Back to dashboard">
      <Icon icon="mdi:arrow-left" width={16} className="mm-back-arrow" />
      <Icon
        icon="game-icons:castle"
        width={15}
        className="text-[var(--mm-gold)]"
      />
      <span>Back to dashboard</span>
    </Link>
  );
}
