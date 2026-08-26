"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { submitClaim, type ClaimState } from "@/app/(app)/q/[token]/actions";
import type { ClaimMode } from "@/lib/hunts";

type Failure = NonNullable<ClaimState["outcome"]>;

/**
 * Every message says what happened AND what to do next. Someone reading this
 * is standing at a counter with a queue behind them.
 */
const FAILURE_COPY: Record<Exclude<Failure, "ok">, string> = {
  duplicate: "You've already checked in here — no need to do it twice.",
  bad_code:
    "That code has expired. Type the 4 digits showing on the stand's screen right now.",
  out_of_range:
    "You don't look like you're at the venue yet. Check in once you're on site.",
  not_open: "This quest isn't running right now.",
  unknown_step: "This tag isn't one of ours, or the objective has been removed.",
  rate_limited:
    "Too many wrong codes. Wait a couple of minutes, then try the code showing now.",
  signed_out: "Your sign-in expired. Sign in again and this will still be here.",
};

export function QuestClaim({
  token,
  claimMode,
  prefillCode,
  questSlug,
  questTitle,
  questOpen,
  objectiveTitle,
  destinationName,
  locationHint,
  points,
  alreadyDone,
}: {
  token: string;
  claimMode: ClaimMode;
  prefillCode: string;
  questSlug: string;
  questTitle: string;
  questOpen: boolean;
  objectiveTitle: string;
  destinationName: string | null;
  locationHint: string | null;
  points: number;
  alreadyDone: boolean;
}) {
  const [state, formAction, pending] = useActionState<ClaimState, FormData>(
    submitClaim,
    {
      outcome: alreadyDone ? "duplicate" : !questOpen ? "not_open" : undefined,
    }
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const codeRef = useRef<HTMLInputElement | null>(null);

  // A stale prefilled code (common: the tag was scanned, then sign-in took
  // longer than a rotation) left the dead digits sitting in the box, unfocused.
  // Clearing and focusing turns a retype into a type.
  useEffect(() => {
    if (state.outcome === "bad_code" && codeRef.current) {
      codeRef.current.value = "";
      codeRef.current.focus();
    }
  }, [state.outcome]);

  function locate() {
    setLocating(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("This device can't share a position.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get your position. Allow location and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (state.outcome === "ok") {
    return (
      <div className="mm-glass p-8 text-center">
        <Icon
          icon="game-icons:checkered-flag"
          width={44}
          className="mx-auto text-[var(--mm-live)]"
        />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
          Checked in
        </h1>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          {destinationName ?? objectiveTitle} cleared · +{points} pts
        </p>
        <Link
          href={`/quests/${questSlug}`}
          className="mm-btn mm-btn-primary mt-6 w-full justify-center py-4"
        >
          Where to next →
        </Link>
      </div>
    );
  }

  const failure = state.outcome ? FAILURE_COPY[state.outcome] : null;
  // States there is no point offering a "check in" button for.
  const settled =
    state.outcome === "duplicate" ||
    state.outcome === "not_open" ||
    state.outcome === "signed_out";

  return (
    <div className="mm-glass p-6">
      <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
        {questTitle}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
        {destinationName ?? objectiveTitle}
      </h1>
      {locationHint && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--mm-text-dim)]">
          <Icon icon="mdi:map-marker-outline" width={15} />
          {locationHint}
        </p>
      )}

      {failure && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-4 text-sm ${
            settled ? "text-[var(--mm-text-dim)]" : "text-[var(--mm-danger)]"
          }`}
        >
          {failure}
        </p>
      )}

      {state.outcome === "signed_out" && (
        <Link
          href={`/login?from=/q/${token}`}
          className="mm-btn mm-btn-primary mt-4 w-full justify-center py-4"
        >
          Sign in
        </Link>
      )}

      {!settled && (
        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="token" value={token} />

          {claimMode === "live_code" && (
            <label className="block">
              <span className="text-sm font-medium">
                Enter the code on the stand&apos;s screen
              </span>
              {/* Someone who tapped the NFC tag has no idea the shortcut
                  exists — and scanning the vendor's screen fills this in for
                  them, turning four digits of typing into one tap. */}
              {!prefillCode && (
                <span className="mt-1 block text-xs text-[var(--mm-text-dim)]">
                  Or scan the code on their screen instead and this fills itself
                  in.
                </span>
              )}
              <input
                ref={codeRef}
                name="code"
                defaultValue={prefillCode}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus={!prefillCode}
                placeholder="0000"
                aria-label="4-digit check-in code"
                className="mt-2 w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-4 text-center font-[family-name:var(--font-display)] text-4xl tracking-[0.4em] focus:border-[var(--mm-violet)]"
              />
            </label>
          )}

          {claimMode === "open_tag" && (
            <>
              <input type="hidden" name="lat" value={coords?.lat ?? ""} />
              <input type="hidden" name="lng" value={coords?.lng ?? ""} />
              {!coords && (
                <button
                  type="button"
                  onClick={locate}
                  disabled={locating}
                  className="mm-btn mm-btn-ghost w-full justify-center py-4"
                >
                  {locating ? "Locating…" : "Confirm I'm at the venue"}
                </button>
              )}
              {geoError && (
                <p role="alert" className="text-sm text-[var(--mm-danger)]">
                  {geoError}
                </p>
              )}
            </>
          )}

          {claimMode === "sealed_tag" ? (
            <p className="text-sm text-[var(--mm-text-dim)]">
              This objective uses a sealed tag. Tap the tag itself with your
              phone to check in.
            </p>
          ) : (
            <button
              disabled={pending || (claimMode === "open_tag" && !coords)}
              className="mm-btn mm-btn-primary w-full justify-center py-4 text-base disabled:opacity-50"
            >
              {pending ? "Checking in…" : `Check in · +${points} pts`}
            </button>
          )}
        </form>
      )}

      <Link
        href={`/quests/${questSlug}`}
        className="mt-5 block text-center text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        Back to the quest
      </Link>
    </div>
  );
}
