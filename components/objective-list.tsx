"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { ObjectiveForm } from "@/components/objective-form";
import {
  deleteObjective,
  moveObjective,
  rotateStationKey,
} from "@/app/(admin)/actions";
import type { AdminObjective } from "@/lib/admin-quests";

const CLAIM_LABEL: Record<string, { label: string; color: string; icon: string }> =
  {
    live_code: {
      label: "Live code",
      color: "var(--mm-live)",
      icon: "mdi:shield-check-outline",
    },
    open_tag: {
      label: "Open tag",
      color: "var(--mm-gold)",
      icon: "mdi:shield-alert-outline",
    },
    sealed_tag: {
      label: "Sealed tag",
      color: "var(--mm-violet)",
      icon: "mdi:nfc-variant",
    },
  };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="mm-btn mm-btn-ghost shrink-0 text-xs"
    >
      <Icon icon={copied ? "mdi:check" : "mdi:content-copy"} width={14} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Relative time is read after mount, never during render: the server and the
 * admin's browser don't share a clock, and rendering "now" on both sides is a
 * hydration mismatch waiting to happen.
 */
function StationHealth({ lastSeenAt }: { lastSeenAt: Date | null }) {
  const [label, setLabel] = useState<{ text: string; tone: string } | null>(
    null
  );

  useEffect(() => {
    if (!lastSeenAt) return;
    const compute = () => {
      const mins = Math.round(
        (Date.now() - new Date(lastSeenAt).getTime()) / 60000
      );
      if (mins < 3)
        setLabel({ text: "Station online now", tone: "var(--mm-live)" });
      else if (mins < 60)
        setLabel({
          text: `Station last seen ${mins} min ago`,
          tone: "var(--mm-gold)",
        });
      else
        setLabel({
          text: `Station last seen ${Math.round(mins / 60)}h ago`,
          tone: "var(--mm-text-dim)",
        });
    };
    compute();
    const t = setInterval(compute, 30_000);
    return () => clearInterval(t);
  }, [lastSeenAt]);

  if (!lastSeenAt) {
    return (
      <span className="text-[var(--mm-text-dim)]">
        Station page never opened
      </span>
    );
  }
  if (!label) return <span className="text-[var(--mm-text-dim)]">Checking…</span>;
  return <span style={{ color: label.tone }}>{label.text}</span>;
}

export function ObjectiveList({
  questSlug,
  objectives,
  partners,
  eventHasCoords,
}: {
  questSlug: string;
  objectives: AdminObjective[];
  partners: { id: string; name: string }[];
  eventHasCoords: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  if (objectives.length === 0) {
    return (
      <p className="text-sm text-[var(--mm-text-dim)]">
        No objectives yet. Add one for each stand you want people to walk to.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {objectives.map((o, i) => {
        const claim = CLAIM_LABEL[o.claimMode];
        const isVisit = o.type === "qr_scan";
        return (
          <div key={o.id} className="mm-glass p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span className="mt-0.5 font-[family-name:var(--font-display)] text-lg text-[var(--mm-text-dim)]">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.title}</span>
                  {o.partnerName && (
                    <Badge color="var(--mm-gold)" icon="game-icons:anvil">
                      {o.partnerName}
                    </Badge>
                  )}
                  {o.revealMode === "clue" && (
                    <Badge color="var(--mm-violet)" icon="game-icons:secret-book">
                      Clue
                    </Badge>
                  )}
                  {isVisit && claim && (
                    <Badge color={claim.color} icon={claim.icon}>
                      {claim.label}
                    </Badge>
                  )}
                  <Badge icon="mdi:star-outline">{o.points} pts</Badge>
                  <Badge icon="mdi:account-check-outline">
                    {o.completions} done
                  </Badge>
                </div>
                {o.locationHint && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                    <Icon icon="mdi:map-marker-outline" width={13} />
                    {o.locationHint}
                  </p>
                )}
                {isVisit && o.claimMode === "live_code" && (
                  <p className="mt-1 text-xs">
                    <StationHealth lastSeenAt={o.stationLastSeenAt} />
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <form action={moveObjective}>
                  <input type="hidden" name="questSlug" value={questSlug} />
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button
                    disabled={i === 0}
                    className="mm-btn mm-btn-ghost px-2 text-xs disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <Icon icon="mdi:chevron-up" width={16} />
                  </button>
                </form>
                <form action={moveObjective}>
                  <input type="hidden" name="questSlug" value={questSlug} />
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button
                    disabled={i === objectives.length - 1}
                    className="mm-btn mm-btn-ghost px-2 text-xs disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <Icon icon="mdi:chevron-down" width={16} />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setEditing(editing === o.id ? null : o.id)}
                  className="mm-btn mm-btn-ghost text-xs"
                >
                  <Icon
                    icon={editing === o.id ? "mdi:close" : "mdi:pencil-outline"}
                    width={14}
                  />
                  {editing === o.id ? "Close" : "Edit"}
                </button>
              </div>
            </div>

            {isVisit && (
              <div className="mt-3 space-y-2 border-t border-[var(--mm-border)] pt-3">
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--mm-surface)] px-3 py-2 text-xs text-[var(--mm-text-dim)]">
                    {o.tagUrl}
                  </code>
                  <CopyButton value={o.tagUrl} />
                </div>
                <p className="text-xs text-[var(--mm-text-dim)]">
                  Print this as a QR code or write it to an NFC tag. It only
                  names the objective — switching claim mode later never
                  invalidates it.
                </p>
                {o.claimMode === "live_code" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/partner-hub/station/${o.id}`}
                      className="mm-btn mm-btn-ghost text-xs"
                    >
                      <Icon icon="mdi:monitor-dashboard" width={14} />
                      Open station page
                    </Link>
                    <form action={rotateStationKey}>
                      <input type="hidden" name="questSlug" value={questSlug} />
                      <input type="hidden" name="id" value={o.id} />
                      <button className="mm-btn mm-btn-ghost text-xs">
                        <Icon icon="mdi:key-change" width={14} />
                        New station key
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {editing === o.id && (
              <div className="mt-4 border-t border-[var(--mm-border)] pt-4">
                <ObjectiveForm
                  questSlug={questSlug}
                  partners={partners}
                  objective={o}
                  eventHasCoords={eventHasCoords}
                  onDone={() => setEditing(null)}
                />
                <form action={deleteObjective} className="mt-4">
                  <input type="hidden" name="questSlug" value={questSlug} />
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-xs text-[var(--mm-danger)] hover:underline">
                    Delete this objective
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
