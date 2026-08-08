import { Badge } from "@/components/badge";
import type { PartnerStatus } from "@/lib/partner-access";

/**
 * One vocabulary for the partner review lifecycle. The DB values are terse
 * (`pending`, `rejected`); these are what a stall owner actually reads.
 */
export const PARTNER_STATUS: Record<
  PartnerStatus,
  { label: string; color: string; icon: string; hint: string }
> = {
  draft: {
    label: "Draft",
    color: "var(--mm-text-dim)",
    icon: "mdi:pencil-outline",
    hint: "Only you can see this. Submit it when you're ready.",
  },
  pending: {
    label: "In review",
    color: "var(--mm-gold)",
    icon: "mdi:clock-outline",
    hint: "Sent to the guild. We'll let you know once it's looked at.",
  },
  approved: {
    label: "Live",
    color: "var(--mm-live)",
    icon: "mdi:check-circle-outline",
    hint: "Visible to everyone. Edits you make go live straight away.",
  },
  rejected: {
    label: "Changes requested",
    color: "var(--mm-danger)",
    icon: "mdi:alert-circle-outline",
    hint: "Have a look at the note below, then submit again.",
  },
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const s = PARTNER_STATUS[status];
  return (
    <Badge color={s.color} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
