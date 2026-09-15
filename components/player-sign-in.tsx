"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import {
  playerSignIn,
  type PlayerFormState,
} from "@/app/(open)/player-actions";

/**
 * How you get into a quest at a no-data event.
 *
 * A name you make up and four digits you'll remember for the afternoon. No
 * email, no account, nothing that outlives the event — which is the promise
 * the event made, so the panel says so out loud rather than making anyone
 * wonder what they're signing up for.
 */
export function PlayerSignIn({
  eventId,
  path,
  eventTitle,
  signupUrl = null,
  bare = false,
}: {
  eventId: string;
  /** The page to rebuild once there's a player — see playerSignIn. */
  path: string;
  eventTitle: string;
  /**
   * The event's own site, for someone who has not registered for the day.
   * Registration is the event's business, not this panel's — the name typed
   * here is only what the leaderboard calls you.
   */
  signupUrl?: string | null;
  /**
   * Drop the panel chrome. Set when this already sits inside a card, so the
   * quest teaser does not draw a card within a card.
   */
  bare?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    PlayerFormState,
    FormData
  >(playerSignIn, {});
  const [mode, setMode] = useState<"join" | "return">("join");
  const joining = mode === "join";

  const Shell = bare ? "div" : "section";

  return (
    <Shell className={bare ? "" : "mm-glass mm-panel mt-6 p-5 sm:p-6"}>
      <Icon
        icon="game-icons:hood"
        width={30}
        className="mx-auto text-[var(--mm-gold)]"
      />
      <h2 className="mt-2 text-center font-[family-name:var(--font-display)] text-xl tracking-wide">
        {joining ? "Pick a name and play" : "Welcome back"}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-[var(--mm-text-dim)]">
        {joining
          ? `${eventTitle} doesn't ask for an account. Choose what the leaderboard should call you and four digits to get back in with.`
          : "Enter the name and PIN you started with."}
      </p>

      <form action={formAction} className="mx-auto mt-5 max-w-sm space-y-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="path" value={path} />
        <input type="hidden" name="mode" value={mode} />

        <label className="block">
          <span className="text-base font-semibold">Username / alias</span>
          <input
            name="handle"
            defaultValue={state.handle}
            required
            maxLength={20}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Sheldor the Conqueror"
            aria-invalid={state.field === "handle" || undefined}
            className="mt-2 w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3.5 text-center text-base focus:border-[var(--mm-violet)]"
          />
        </label>

        <label className="block">
          <span className="text-base font-semibold">
            {joining ? "Choose a 4-digit PIN" : "Your PIN"}
          </span>
          <input
            name="pin"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            placeholder="0000"
            aria-label={joining ? "Choose a 4-digit PIN" : "Your 4-digit PIN"}
            aria-invalid={state.field === "pin" || undefined}
            className="mt-2 w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3.5 text-center font-[family-name:var(--font-display)] text-3xl tracking-[0.4em] focus:border-[var(--mm-violet)]"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-[var(--mm-danger)]">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mm-btn mm-btn-primary w-full justify-center py-4 text-base disabled:opacity-50"
        >
          {pending
            ? joining
              ? "Setting you up…"
              : "Signing you in…"
            : joining
              ? "Start the quest"
              : "Back to my quest"}
        </button>
        <button
          type="button"
          onClick={() => setMode(joining ? "return" : "join")}
          className="mm-btn w-full justify-center py-4 text-base bg-[color-mix(in_srgb,var(--mm-blue)_92%,transparent)] text-[#160f0a] hover:bg-[#6cb8ff] hover:shadow-[0_0_26px_rgba(74,168,255,0.45)]"
        >
          {joining ? "Sign back in" : "Pick a name instead"}
        </button>
      </form>

      {signupUrl && joining && (
        <p className="mt-4 text-center text-sm text-[var(--mm-text-dim)]">
          Not registered for {eventTitle} yet?{" "}
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--mm-gold)] underline underline-offset-4 hover:text-[var(--mm-gold-hi)]"
          >
            Sign up
            <Icon icon="mdi:open-in-new" width={13} />
          </a>
        </p>
      )}
    </Shell>
  );
}
