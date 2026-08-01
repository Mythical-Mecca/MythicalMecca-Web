import { Badge } from "@/components/badge";
import type { EventOrigin } from "@/lib/content";

const STYLES: Record<
  EventOrigin,
  { label: string; icon: string; color: string }
> = {
  hosted: { label: "Official", icon: "game-icons:castle", color: "#E18D01" },
  partner: { label: "Partner", icon: "game-icons:anvil", color: "#9aa3bd" },
  external: { label: "External", icon: "mdi:open-in-new", color: "#9aa3bd" },
  community: {
    label: "Community",
    icon: "mdi:account-group-outline",
    color: "#5cc08c",
  },
};

/** Inline origin badge — a quiet tint that identifies without shouting. */
export function EventOriginBadge({ origin }: { origin: EventOrigin }) {
  const s = STYLES[origin];
  return (
    <Badge color={s.color} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
