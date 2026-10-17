"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { collabSubmissions } from "@/lib/db/schema";
import { logActivity } from "@/lib/logging";
import {
  honeypotTripped,
  scoreSubmission,
  stampProblem,
  tooManyFromIp,
} from "@/lib/spam";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";

/**
 * Messages are written for the person filling the form, not for a log. Each
 * one says what to do about it — zod's defaults ("Invalid email") do not.
 */
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tell us who you are.")
    .max(120, "Keep it under 120 characters."),
  email: z
    .string()
    .trim()
    .email("That address doesn't look right. We reply to it, so it has to work."),
  org: z.string().trim().max(160, "Keep it under 160 characters.").optional(),
  message: z
    .string()
    .trim()
    .min(10, "A little more than that, so we know what you need.")
    .max(4000, "Keep it under 4000 characters."),
});

export type CollabState = {
  /** Set on a successful send. The form swaps itself for a receipt. */
  ok?: boolean;
  /** Something that isn't about one field, such as a failed write. */
  error?: string;
  /** Keyed by field name, rendered under that input. */
  fieldErrors?: Record<string, string>;
  /**
   * What was submitted, echoed back.
   *
   * The old version redirected on failure, which threw away everything typed:
   * one mistyped address and a long message was gone. React also clears an
   * uncontrolled form once its action settles, so the values have to come
   * back from here.
   */
  values?: Record<string, string>;
};

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");
}

export async function sendCollabMessage(
  _prev: CollabState,
  formData: FormData
): Promise<CollabState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    org: String(formData.get("org") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  /**
   * A tripped honeypot or an instant submission is answered with the same
   * receipt a real sender gets, and nothing is written.
   *
   * Telling a bot why it failed is how it learns to pass. A person cannot trip
   * either of these: the field is off-screen and unfocusable, and three
   * seconds is less time than it takes to type an address.
   */
  if (honeypotTripped(formData)) return { ok: true };

  const stamp = stampProblem(String(formData.get("stamp") ?? ""));
  if (stamp === "too-fast" || stamp === "missing") return { ok: true };
  if (stamp === "stale") {
    return {
      error: "This page has been open a while. Reload it and send again.",
      values,
    };
  }

  const ip = await clientIp();
  if (await tooManyFromIp(ip)) {
    return {
      error: "That's a few messages from here already. Try again in an hour.",
      values,
    };
  }

  const parsed = schema.safeParse({ ...values, org: values.org || undefined });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  // Last, because it is the only check that costs a round trip.
  const captcha = await verifyTurnstile(
    String(formData.get(TURNSTILE_FIELD) ?? ""),
    ip
  );
  if (captcha === "failed") {
    return {
      error: "We couldn't confirm you're human. Reload the page and try again.",
      values,
    };
  }

  const data = parsed.data;
  // Stored either way. See the note on the column: the rules that catch a bot
  // also catch a partner who linked their shop, so a hit is quarantined rather
  // than refused, and the sender is told nothing.
  const verdict = scoreSubmission(data);

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(collabSubmissions).values({
        name: data.name,
        email: data.email,
        org: data.org,
        message: data.message,
        ip,
        spam: verdict.spam,
        spamReason: verdict.reason,
      });
    } catch (err) {
      console.error("Collab submission DB insert error:", err);
    }
  }

  if (!verdict.spam) {
    await logActivity({
      action: "collab.submit",
      metadata: { email: data.email },
    });
  }
  return { ok: true };
}

