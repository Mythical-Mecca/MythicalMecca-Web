"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addObjective,
  updateObjective,
  type ObjectiveFormState,
} from "@/app/(admin)/actions";
import { Icon } from "@/components/icon";
import {
  Field,
  TextField,
  TextareaField,
  inputCls,
  invalidCls,
} from "@/components/form";
import { PickerField } from "@/components/picker-field";
import type { AdminObjective } from "@/lib/admin-quests";
import type { ClaimMode, RevealMode, StepType } from "@/lib/hunts";

const TYPES = [
  // `qr_scan` is the venue-navigation workhorse; the rest are answered in-app.
  {
    value: "qr_scan",
    label: "Check in at the destination",
    hint: "They walk to the stand and scan the tag there.",
    icon: "mdi:qrcode-scan",
  },
  {
    value: "riddle",
    label: "Riddle",
    hint: "Typed answer, solved in the app.",
    icon: "game-icons:secret-book",
  },
  {
    value: "unlock_code",
    label: "Password",
    hint: "A code from a sign, typed in.",
    icon: "mdi:key-variant",
  },
  {
    value: "trivia_gate",
    label: "Trivia",
    hint: "Multiple choice, one right answer.",
    icon: "mdi:format-list-bulleted",
  },
  {
    value: "cipher",
    label: "Cipher",
    hint: "Typed answer to something encoded.",
    icon: "mdi:alphabetical-variant",
  },
  {
    value: "crossword",
    label: "Crossword",
    hint: "Typed answer.",
    icon: "mdi:grid",
  },
  {
    value: "photo_proof",
    label: "Photo proof",
    hint: "They upload a photo. Auto-approved.",
    icon: "mdi:camera-outline",
  },
  {
    value: "geo_checkpoint",
    label: "Geo checkpoint",
    hint: "Reach a set of coordinates.",
    icon: "mdi:map-marker-radius-outline",
  },
];

// The tradeoffs live on the options themselves — you shouldn't have to pick a
// mode to find out what it costs you.
const CLAIM_MODES = [
  {
    value: "live_code",
    label: "Live code",
    hint: "Strongest, and the default. The stand keeps its station page open and the code changes every minute, so a shared screenshot is worthless almost immediately.",
    icon: "mdi:shield-check-outline",
  },
  {
    value: "open_tag",
    label: "Open tag",
    hint: "The tag alone completes it, so a shared link works for anyone inside the venue. Fine for low-stakes stops, and the fallback if a vendor's device dies.",
    icon: "mdi:shield-alert-outline",
  },
  {
    value: "sealed_tag",
    label: "Sealed NFC tag",
    hint: "For NTAG 424 DNA tags, which sign every tap on-chip. Not built yet — objectives set to this can't be claimed, so don't use it during an event.",
    icon: "mdi:nfc-variant",
  },
];

const REVEAL_MODES = [
  {
    value: "direct",
    label: "Direct",
    hint: "Name the destination up front. Straight wayfinding — good for a first quest, or a big venue.",
    icon: "mdi:map-marker-outline",
  },
  {
    value: "clue",
    label: "Clue",
    hint: "Hide the stand's name and location until they check in. The prompt has to be enough to find it.",
    icon: "game-icons:secret-book",
  },
];

const answerLabel: Record<string, string> = {
  riddle: "Correct answer",
  cipher: "Decoded answer",
  crossword: "Correct answer",
  unlock_code: "Password",
};

export function ObjectiveForm({
  questSlug,
  partners,
  objective,
  eventHasCoords = false,
  atIndex,
  onDone,
}: {
  questSlug: string;
  partners: { id: string; name: string }[];
  objective?: AdminObjective;
  /** Open-tag geofencing measures from the event's coordinates. No event
   *  location means no check at all, which the admin needs telling. */
  eventHasCoords?: boolean;
  /** Position to insert at. Omitted appends to the end of the trail. */
  atIndex?: number;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ObjectiveFormState,
    FormData
  >(objective ? updateObjective : addObjective, {});
  const fieldError = state.fieldErrors ?? {};
  // React clears an uncontrolled form once its action settles, so a rejected
  // save would otherwise wipe what was typed. `state.values` is what the server
  // received; fall back to the record being edited, then to empty.
  const v = state.values ?? {};
  const keep = (name: string, fallback: string | number | undefined) =>
    v[name] ?? (fallback === undefined ? undefined : String(fallback));

  // The dialog is the caller's to close, and only a save should close it — a
  // rejected submit has to leave the form standing with what was typed.
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);

  const [type, setType] = useState<StepType>(objective?.type ?? "qr_scan");
  const [claimMode, setClaimMode] = useState<ClaimMode>(
    objective?.claimMode ?? "live_code"
  );
  const [revealMode, setRevealMode] = useState<RevealMode>(
    objective?.revealMode ?? "direct"
  );
  const config = objective?.config ?? {};

  const needsAnswer = type in answerLabel;
  const isTrivia = type === "trivia_gate";
  const isVisit = type === "qr_scan";

  /**
   * Which inputs are on screen for this objective type — and therefore which
   * field errors have somewhere to land.
   *
   * A rejected save whose only complaint was about a field this form doesn't
   * render read as nothing happening at all: the button said "Saving…", came
   * back, and no message appeared anywhere. Anything not in this set is shown
   * in the banner instead, so a refusal is always visible.
   */
  const rendered = new Set([
    "type",
    "title",
    "partnerId",
    "locationHint",
    "revealMode",
    "prompt",
    "points",
    ...(needsAnswer ? ["answer"] : []),
    ...(isTrivia ? ["choices"] : []),
    ...(isVisit ? ["claimMode"] : []),
    ...(isVisit && claimMode === "open_tag" && eventHasCoords
      ? ["claimRadiusM"]
      : []),
  ]);
  const homeless = Object.entries(fieldError).filter(([k]) => !rendered.has(k));

  return (
    <form action={formAction} className="space-y-4">
      {/* Anything that isn't about one field — a failed write, a quest deleted
          out from under you. Field-level problems render on their inputs. */}
      {(state.error || homeless.length > 0) && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[var(--mm-danger)] bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] p-3 text-sm text-[var(--mm-danger)]"
        >
          <Icon
            icon="mdi:alert-circle-outline"
            width={16}
            className="mt-0.5 shrink-0"
          />
          <span>
            {state.error}
            {homeless.map(([k, msg]) => (
              <span key={k} className="block">
                {msg}
              </span>
            ))}
          </span>
        </p>
      )}
      <input type="hidden" name="questSlug" value={questSlug} />
      {objective && <input type="hidden" name="id" value={objective.id} />}
      {!objective && atIndex !== undefined && (
        <input type="hidden" name="atIndex" value={atIndex} />
      )}

      <PickerField
        label="How is it completed?"
        name="type"
        icon="mdi:flag-checkered"
        value={type}
        onValueChange={(v) => setType(v as StepType)}
        options={TYPES}
        error={fieldError.type}
      />

      <TextField
        label="Objective title"
        name="title"
        required
        defaultValue={keep("title", objective?.title)}
        placeholder="The armourer's stand"
        icon="mdi:format-title"
        error={fieldError.title}
      />

      <PickerField
        label="Destination"
        name="partnerId"
        icon="game-icons:anvil"
        defaultValue={objective?.partnerId ?? ""}
        placeholder="No partner — a landmark or free-form stop"
        description="Picking a partner links the objective straight to their profile."
        error={fieldError.partnerId}
        options={partners.map((p) => ({
          value: p.id,
          label: p.name,
          icon: "game-icons:anvil",
        }))}
      />

      <TextField
        label="Where to find it"
        name="locationHint"
        defaultValue={keep("locationHint", objective?.locationHint ?? "")}
        placeholder="Hall B, stand 14"
        icon="mdi:map-marker-outline"
        hint="optional"
        error={fieldError.locationHint}
      />

      <PickerField
        label="How much do they get told?"
        name="revealMode"
        icon="game-icons:secret-book"
        value={revealMode}
        onValueChange={(v) => setRevealMode(v as RevealMode)}
        options={REVEAL_MODES}
        error={fieldError.revealMode}
      />

      <TextareaField
        label={revealMode === "clue" ? "The clue" : "Notes for the adventurer"}
        name="prompt"
        rows={3}
        defaultValue={keep("prompt", objective?.prompt)}
        placeholder={
          revealMode === "clue"
            ? "Seek the one who works iron where the hall bends west."
            : "Ask them about the forging demo."
        }
        icon="mdi:text"
        error={fieldError.prompt}
      />

      {needsAnswer && (
        <TextField
          label={answerLabel[type]}
          name="answer"
          required
          defaultValue={keep("answer", String(config.answer ?? config.code ?? ""))}
          icon="mdi:key-variant"
          description="Checked case-insensitively, ignoring extra spaces."
          error={fieldError.answer}
        />
      )}

      {isTrivia && (
        <Field
          label="Choices"
          icon="mdi:format-list-bulleted"
          description="Fill the first box with the correct answer, then the decoys."
          error={fieldError.choices}
          errorId="choices-error"
        >
          <div className="space-y-2">
            <input type="hidden" name="correct" value="0" />
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                name="choices"
                defaultValue={
                  v[`choices.${i}`] ??
                  ((config.choices as string[] | undefined) ?? [])[i] ??
                  ""
                }
                placeholder={i === 0 ? "Correct answer" : `Decoy ${i}`}
                className={`${inputCls} ${fieldError.choices ? invalidCls : ""}`}
              />
            ))}
          </div>
        </Field>
      )}

      {isVisit && (
        <>
          <PickerField
            label="How do we know they're really there?"
            name="claimMode"
            icon="mdi:shield-check-outline"
            value={claimMode}
            onValueChange={(v) => setClaimMode(v as ClaimMode)}
            options={CLAIM_MODES}
            error={fieldError.claimMode}
          />
          {claimMode === "open_tag" &&
            (eventHasCoords ? (
              <TextField
                label="Venue radius"
                name="claimRadiusM"
                type="number"
                min={10}
                max={50000}
                defaultValue={keep("claimRadiusM", objective?.claimRadiusM ?? 150)}
                icon="mdi:map-marker-radius-outline"
                hint="metres"
                description="Measured from the attached event's coordinates."
                error={fieldError.claimRadiusM}
              />
            ) : (
              <div className="rounded-xl border border-[var(--mm-gold)] bg-[color-mix(in_srgb,var(--mm-gold)_10%,transparent)] p-3 text-sm">
                <strong className="text-[var(--mm-gold)]">
                  No venue check will happen.
                </strong>{" "}
                Open tag measures distance from the attached event&apos;s
                coordinates, and this quest&apos;s event has none — so this
                objective could be claimed from anywhere in the world by anyone
                who gets the link. Add coordinates to the event, or use a live
                code instead.
              </div>
            ))}
        </>
      )}

      <TextField
        label="Points"
        name="points"
        type="number"
        min={0}
        max={1000}
        defaultValue={keep("points", objective?.points ?? 10)}
        icon="mdi:star-outline"
        error={fieldError.points}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--mm-divider)] pt-4">
        {onDone && (
          <button type="button" onClick={onDone} className="mm-btn mm-btn-ghost">
            Cancel
          </button>
        )}
        <button disabled={pending} className="mm-btn mm-btn-primary">
          {pending
            ? "Saving…"
            : objective
              ? "Save objective"
              : atIndex === undefined
                ? "Add objective"
                : `Insert as #${String(atIndex + 1).padStart(2, "0")}`}
        </button>
      </div>
    </form>
  );
}
