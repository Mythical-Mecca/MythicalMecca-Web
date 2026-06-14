import { DIVISION_LABEL, type Division } from "@/lib/content";

const DIVISION_TINT: Record<Division, string> = {
  tabletop: "rgba(245, 196, 81, 0.16)",
  arcade: "rgba(47, 75, 224, 0.18)",
  otaku: "rgba(124, 58, 237, 0.18)",
  maker: "rgba(52, 211, 153, 0.16)",
};

export function DivisionBadge({ division }: { division: Division | null }) {
  if (!division) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-widest text-[var(--mm-text)]"
      style={{ background: DIVISION_TINT[division] }}
    >
      {DIVISION_LABEL[division]}
    </span>
  );
}

/** Minimal paragraph renderer — full markdown lands later. */
export function SimpleProse({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-[var(--mm-text-dim)] leading-relaxed">
      {text.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
