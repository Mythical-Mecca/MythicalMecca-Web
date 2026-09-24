"use server";

import { revalidatePath } from "next/cache";
import {
  endPlayerSession,
  playerSession,
  registerPlayer,
  signInPlayer,
} from "@/lib/event-player";
import { acknowledgeSignup, dismissSignupReminder } from "@/lib/signup";
import { revalidateHuntsForEvent } from "@/lib/revalidate-hunt";

export type PlayerFormState = {
  error?: string;
  field?: "handle" | "pin";
  /** Echoed back so a rejected attempt doesn't blank the name they typed. */
  handle?: string;
};

/**
 * Join or return, from one form.
 *
 * Two buttons rather than two pages: at a counter with a queue behind you, the
 * question "have you been here before?" is one you answer by pressing the
 * button you meant, not by navigating. The mode arrives as the submitter's
 * value, so nothing has to be remembered between renders.
 */
export async function playerSignIn(
  _prev: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  const handle = String(formData.get("handle") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const path = String(formData.get("path") ?? "");
  const mode = String(formData.get("mode") ?? "join");

  if (!eventId) return { error: "Something went wrong. Reload and try again.", handle };

  const result =
    mode === "return"
      ? await signInPlayer({ eventId, handle, pin })
      : await registerPlayer({ eventId, handle, pin });

  if (!result.ok) {
    return { error: result.error, field: result.field, handle };
  }

  // The page this was submitted from renders completely differently once
  // there's a player, so it has to be rebuilt rather than patched.
  if (path) revalidatePath(path);
  if (mode !== "return") await revalidateHuntsForEvent(eventId);
  return {};
}

export async function playerSignOut(formData: FormData) {
  await endPlayerSession();
  const path = String(formData.get("path") ?? "");
  if (path) revalidatePath(path);
}

/**
 * "I've done this" — the player says they filled in the external sign-up
 * form. Recorded against whoever holds the cookie; there is no other player
 * it could apply to, so the form carries nothing but the page to rebuild.
 */
export async function playerAcknowledgeSignup(formData: FormData) {
  const session = await playerSession();
  if (session) await acknowledgeSignup(session.playerId);
  const path = String(formData.get("path") ?? "");
  if (path) revalidatePath(path);
}

/** "I've already done this" — dismisses the end-of-quest reminder. */
export async function playerDismissSignupReminder(formData: FormData) {
  const session = await playerSession();
  if (session) await dismissSignupReminder(session.playerId);
  const path = String(formData.get("path") ?? "");
  if (path) revalidatePath(path);
}
