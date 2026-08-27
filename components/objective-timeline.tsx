"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Modal } from "@/components/modal";
import { ObjectiveForm } from "@/components/objective-form";
import { ConfirmButton } from "@/components/confirm-button";
import {
  deleteObjective,
  moveObjective,
  rotateStationKey,
} from "@/app/(admin)/actions";
import type { AdminObjective } from "@/lib/admin-quests";

const ACCENT = "#9a6cff";

const CLAIM_LABEL: Record<string, { label: string; color: string; icon: string }> =
  {
    live_code: {
      label: "Live code",
      color: "var(--mm-live)",
      icon: "mdi:shield-check-outline",
    },
    location_verified: {
      label: "Location verified",
      color: "var(--mm-gold)",
      icon: "mdi:map-marker-check-outline",
    },
    open: {
      label: "Open scan",
      color: "var(--mm-danger)",
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

/**
 * The seam between two objectives, and the point of the whole layout: a "+"
 * sitting on the rail that inserts at exactly this position.
 *
 * It is a real button at all times, not a hover reveal — a hover-only control
 * is invisible to touch and to the keyboard, and inserting into the middle of a
 * trail was previously impossible at any input (you added to the end, then
 * pressed "move up" as many times as it took). It rests at low contrast and
 * comes forward on hover or focus so a long trail doesn't read as a ladder of
 * plus signs.
 */
function InsertSeam({
  index,
  onInsert,
}: {
  index: number;
  onInsert: (index: number) => void;
}) {
  return (
    <div
      className="group relative flex h-7 items-center"
      style={{ ["--c"]: ACCENT } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onInsert(index)}
        aria-label={`Insert an objective at position ${index + 1}`}
        className="relative z-10 grid h-7 w-10 shrink-0 place-items-center rounded-full transition"
      >
        {/* Opaque fill, not a tint over transparency: the rail runs straight
            behind this and used to show through the middle of the plus, which
            read as part of the line rather than a control sitting on it.
            Mixing into --mm-bg (rather than lowering alpha) keeps it solid, and
            is also why the button no longer dims itself with `opacity` — that
            would have made this background see-through again. */}
        <span
          className="grid h-6 w-6 place-items-center rounded-full border border-dashed bg-[color-mix(in_srgb,var(--c)_18%,var(--mm-bg))] transition group-hover:border-solid group-hover:bg-[color-mix(in_srgb,var(--c)_34%,var(--mm-bg))]"
          style={{ borderColor: `color-mix(in srgb, ${ACCENT} 55%, transparent)` }}
        >
          <Icon icon="mdi:plus" width={14} style={{ color: ACCENT }} />
        </span>
      </button>
      {/* Hairline reaching across, so the seam reads as part of the rail
          rather than a floating button. */}
      <span
        aria-hidden
        className="ml-2 h-px flex-1 opacity-0 transition group-hover:opacity-100"
        style={{
          background: `linear-gradient(to right, color-mix(in srgb, ${ACCENT} 45%, transparent), transparent)`,
        }}
      />
    </div>
  );
}

export function ObjectiveTimeline({
  questSlug,
  objectives,
  partners,
  eventHasCoords,
  sequential,
}: {
  questSlug: string;
  objectives: AdminObjective[];
  partners: { id: string; name: string }[];
  eventHasCoords: boolean;
  /** Strictly-ordered quest: the rail *is* the rule, so no per-objective
   *  prerequisites and the seams say so. */
  sequential: boolean;
}) {
  const titleById = new Map(objectives.map((o) => [o.id, o.title]));
  /** `{kind:"edit"}` loads an objective; `{kind:"add"}` opens a blank form. */
  const [dialog, setDialog] = useState<
    | { kind: "edit"; objective: AdminObjective }
    | { kind: "add"; atIndex?: number }
    | null
  >(null);

  const close = () => setDialog(null);
  const editing = dialog?.kind === "edit" ? dialog.objective : undefined;

  return (
    <div>
      {objectives.length === 0 ? (
        <div className="mm-glass p-8 text-center">
          <Icon
            icon="mdi:flag-outline"
            width={32}
            className="mx-auto opacity-40"
            style={{ color: ACCENT }}
          />
          <p className="mt-3 font-[family-name:var(--font-display)] text-lg">
            The trail is empty
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--mm-text-dim)]">
            Add one objective for each stand you want people to walk to.{" "}
            {sequential
              ? "They must be cleared top to bottom, in this order."
              : "They can be tackled in any order unless one names a prerequisite."}
          </p>
          <button
            type="button"
            onClick={() => setDialog({ kind: "add" })}
            className="mm-btn mm-btn-primary mt-5"
          >
            <Icon icon="mdi:plus" width={17} /> Add the first objective
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* The rail. Sits behind the markers and stops short of the last
              node so the line doesn't dangle past the end of the trail. */}
          <span
            aria-hidden
            className="absolute bottom-6 left-5 top-6 w-px"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, ${ACCENT} 50%, transparent), color-mix(in srgb, ${ACCENT} 18%, transparent))`,
            }}
          />

          <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
            <Icon
              icon={sequential ? "mdi:format-list-numbered" : "mdi:shuffle-variant"}
              width={13}
              style={{ color: ACCENT }}
            />
            {sequential
              ? "Strictly in order — each objective opens once the one above it is cleared."
              : "Any order, except where an objective names a prerequisite."}
          </p>
          <ol className="relative space-y-0">
            {objectives.map((o, i) => {
              const claim = CLAIM_LABEL[o.claimMode];
              const isVisit = o.type === "qr_scan";
              return (
                <li key={o.id}>
                  {/* Seam above every objective — index i inserts before it. */}
                  <InsertSeam
                    index={i}
                    onInsert={(atIndex) => setDialog({ kind: "add", atIndex })}
                  />

                  <div className="flex gap-3">
                    {/* Node marker, centred on the rail. */}
                    <span
                      aria-hidden
                      className="relative z-10 mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border font-[family-name:var(--font-display)] text-sm tabular-nums"
                      style={{
                        background: `color-mix(in srgb, ${ACCENT} 16%, var(--mm-bg))`,
                        borderColor: `color-mix(in srgb, ${ACCENT} 45%, transparent)`,
                        color: `color-mix(in srgb, ${ACCENT} 75%, white)`,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="mm-glass min-w-0 flex-1 p-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{o.title}</span>
                            {o.partnerName && (
                              <Badge color="var(--mm-gold)" icon="game-icons:anvil">
                                {o.partnerName}
                              </Badge>
                            )}
                            {o.revealMode === "clue" && (
                              <Badge
                                color="var(--mm-violet)"
                                icon="game-icons:secret-book"
                              >
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
                          {!sequential && o.parentId && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                              <Icon icon="mdi:source-branch" width={13} />
                              Locked until{" "}
                              <span className="text-[var(--mm-text)]">
                                {titleById.get(o.parentId) ?? "another objective"}
                              </span>{" "}
                              is cleared
                            </p>
                          )}
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
                              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] disabled:opacity-25"
                              aria-label={`Move ${o.title} up`}
                            >
                              <Icon icon="mdi:chevron-up" width={18} />
                            </button>
                          </form>
                          <form action={moveObjective}>
                            <input type="hidden" name="questSlug" value={questSlug} />
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button
                              disabled={i === objectives.length - 1}
                              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)] disabled:opacity-25"
                              aria-label={`Move ${o.title} down`}
                            >
                              <Icon icon="mdi:chevron-down" width={18} />
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setDialog({ kind: "edit", objective: o })}
                            aria-haspopup="dialog"
                            className="mm-btn mm-btn-ghost text-xs"
                          >
                            <Icon icon="mdi:pencil-outline" width={14} /> Edit
                          </button>
                        </div>
                      </div>

                      {isVisit && (
                        <div className="mt-3 space-y-3 border-t border-[var(--mm-divider)] pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/quests/${questSlug}/tags#tag-${o.id}`}
                              className="mm-btn mm-btn-ghost text-xs"
                            >
                              <Icon icon="mdi:qrcode" width={15} />
                              View &amp; download QR
                            </Link>
                            {o.claimMode === "live_code" && (
                              <Link
                                href={`/partner-hub/station/${o.id}`}
                                className="mm-btn mm-btn-primary text-xs"
                              >
                                <Icon icon="mdi:monitor-dashboard" width={15} />
                                Open vendor station
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--mm-surface)] px-3 py-2 text-xs text-[var(--mm-text-dim)]">
                              {o.tagUrl}
                            </code>
                            <CopyButton value={o.tagUrl} />
                          </div>
                          <p className="text-xs text-[var(--mm-text-dim)]">
                            Print this as a QR code or write it to an NFC tag. It
                            only names the objective — switching claim mode later
                            never invalidates it.
                          </p>
                          {o.claimMode === "live_code" && (
                            <form action={rotateStationKey}>
                              <input
                                type="hidden"
                                name="questSlug"
                                value={questSlug}
                              />
                              <input type="hidden" name="id" value={o.id} />
                              <button className="mm-btn mm-btn-ghost text-xs">
                                <Icon icon="mdi:key-change" width={14} />
                                New station key
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Tail seam — appends, same as the button below, but keeps the
              rail's rhythm going to the end. */}
          <InsertSeam
            index={objectives.length}
            onInsert={() => setDialog({ kind: "add" })}
          />

          <div className="mt-2 flex pl-[52px]">
            <button
              type="button"
              onClick={() => setDialog({ kind: "add" })}
              aria-haspopup="dialog"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium transition hover:bg-[color-mix(in_srgb,var(--mm-elevated)_55%,transparent)]"
              style={{
                borderColor: `color-mix(in srgb, ${ACCENT} 45%, transparent)`,
                color: `color-mix(in srgb, ${ACCENT} 75%, white)`,
              }}
            >
              <Icon icon="mdi:plus" width={17} /> Add objective
            </button>
          </div>
        </div>
      )}

      <Modal
        open={dialog !== null}
        onClose={close}
        accent={ACCENT}
        size="lg"
        icon={editing ? "mdi:pencil-outline" : "mdi:flag-plus-outline"}
        title={editing ? "Edit objective" : "New objective"}
        description={
          editing
            ? editing.title
            : dialog?.kind === "add" && dialog.atIndex !== undefined
              ? `Inserted at position ${dialog.atIndex + 1} — everything after it shifts down.`
              : "Added to the end of the trail."
        }
      >
        {dialog && (
          <>
            <ObjectiveForm
              // Remount per target, so the form's internal type/claim/reveal
              // state starts from the right objective instead of whichever one
              // the dialog was last opened on.
              key={editing ? editing.id : `add-${dialog.kind === "add" ? dialog.atIndex ?? "end" : ""}`}
              questSlug={questSlug}
              partners={partners}
              objective={editing}
              atIndex={dialog.kind === "add" ? dialog.atIndex : undefined}
              eventHasCoords={eventHasCoords}
              sequential={sequential}
              siblings={objectives.map((o) => ({ id: o.id, title: o.title }))}
              onDone={close}
            />
            {editing && (
              <form action={deleteObjective} className="mt-4 border-t border-[var(--mm-divider)] pt-4">
                <input type="hidden" name="questSlug" value={questSlug} />
                <input type="hidden" name="id" value={editing.id} />
                <ConfirmButton
                  label="Delete objective"
                  confirmLabel="Delete it"
                  title="Delete this objective?"
                  icon="mdi:trash-can-outline"
                  body={
                    <>
                      <strong className="text-[var(--mm-text)]">
                        {editing.title}
                      </strong>{" "}
                      and its {editing.completions} recorded check-in
                      {editing.completions === 1 ? "" : "s"} go with it. Any
                      printed tag for this objective stops working.
                    </>
                  }
                />
              </form>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
