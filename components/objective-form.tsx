"use client";

import { useState } from "react";
import { addObjective, updateObjective } from "@/app/(admin)/actions";
import { Field, TextField, TextareaField, inputCls } from "@/components/form";
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
  onDone,
}: {
  questSlug: string;
  partners: { id: string; name: string }[];
  objective?: AdminObjective;
  /** Open-tag geofencing measures from the event's coordinates. No event
   *  location means no check at all, which the admin needs telling. */
  eventHasCoords?: boolean;
  onDone?: () => void;
}) {
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

  return (
    <form
      action={objective ? updateObjective : addObjective}
      className="space-y-4"
    >
      <input type="hidden" name="questSlug" value={questSlug} />
      {objective && <input type="hidden" name="id" value={objective.id} />}

      <PickerField
        label="How is it completed?"
        name="type"
        icon="mdi:flag-checkered"
        value={type}
        onValueChange={(v) => setType(v as StepType)}
        options={TYPES}
      />

      <TextField
        label="Objective title"
        name="title"
        required
        defaultValue={objective?.title}
        placeholder="The armourer's stand"
        icon="mdi:format-title"
      />

      <PickerField
        label="Destination"
        name="partnerId"
        icon="game-icons:anvil"
        defaultValue={objective?.partnerId ?? ""}
        placeholder="No partner — a landmark or free-form stop"
        description="Picking a partner links the objective straight to their profile."
        options={partners.map((p) => ({
          value: p.id,
          label: p.name,
          icon: "game-icons:anvil",
        }))}
      />

      <TextField
        label="Where to find it"
        name="locationHint"
        defaultValue={objective?.locationHint ?? ""}
        placeholder="Hall B, stand 14"
        icon="mdi:map-marker-outline"
        hint="optional"
      />

      <PickerField
        label="How much do they get told?"
        name="revealMode"
        icon="game-icons:secret-book"
        value={revealMode}
        onValueChange={(v) => setRevealMode(v as RevealMode)}
        options={REVEAL_MODES}
      />

      <TextareaField
        label={revealMode === "clue" ? "The clue" : "Notes for the adventurer"}
        name="prompt"
        rows={3}
        defaultValue={objective?.prompt}
        placeholder={
          revealMode === "clue"
            ? "Seek the one who works iron where the hall bends west."
            : "Ask them about the forging demo."
        }
        icon="mdi:text"
      />

      {needsAnswer && (
        <TextField
          label={answerLabel[type]}
          name="answer"
          required
          defaultValue={String(config.answer ?? config.code ?? "")}
          icon="mdi:key-variant"
          description="Checked case-insensitively, ignoring extra spaces."
        />
      )}

      {isTrivia && (
        <Field
          label="Choices"
          icon="mdi:format-list-bulleted"
          description="Fill the first box with the correct answer, then the decoys."
        >
          <div className="space-y-2">
            <input type="hidden" name="correct" value="0" />
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                name="choices"
                defaultValue={
                  ((config.choices as string[] | undefined) ?? [])[i] ?? ""
                }
                placeholder={i === 0 ? "Correct answer" : `Decoy ${i}`}
                className={inputCls}
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
          />
          {claimMode === "open_tag" &&
            (eventHasCoords ? (
              <TextField
                label="Venue radius"
                name="claimRadiusM"
                type="number"
                min={10}
                max={50000}
                defaultValue={objective?.claimRadiusM ?? 150}
                icon="mdi:map-marker-radius-outline"
                hint="metres"
                description="Measured from the attached event's coordinates."
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
        defaultValue={objective?.points ?? 10}
        icon="mdi:star-outline"
      />

      <div className="flex items-center gap-3">
        <button className="mm-btn mm-btn-primary">
          {objective ? "Save objective" : "Add objective"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="mm-btn mm-btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
