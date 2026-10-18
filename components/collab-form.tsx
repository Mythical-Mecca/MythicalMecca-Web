"use client";

import { useActionState, useState } from "react";
import Script from "next/script";
import { Icon } from "@/components/icon";
import { TextField, TextareaField } from "@/components/form";
import {
  sendCollabMessage,
  type CollabState,
} from "@/app/(public)/collab/actions";

/**
 * The contact form.
 *
 * A client component so a rejected send keeps what was typed and can say which
 * field it objected to. The previous version redirected to `?error=1`, which
 * threw the whole message away and then asked the sender to "check your
 * inputs" without saying which one.
 *
 * Fields come from the shared <TextField>/<TextareaField>, which wire a label
 * to its control and point `aria-describedby` at the error text. The old
 * hand-rolled inputs had labels sitting beside them with nothing joining the
 * two, so a screen reader read an unlabelled box.
 */
export function CollabForm({
  stamp,
  turnstileSiteKey,
  honeypotField,
}: {
  /** Signed render time, for the timing trap. See lib/spam.ts. */
  stamp: string;
  /** Empty when Turnstile is not configured, in which case no widget renders. */
  turnstileSiteKey: string;
  honeypotField: string;
}) {
  const [state, formAction, pending] = useActionState<CollabState, FormData>(
    sendCollabMessage,
    {}
  );
  /**
   * useActionState has no reset, so "send another" is tracked here.
   *
   * Cleared again on submit rather than in an effect: the next success has to
   * show its own receipt, and reading it back at submit time is the one moment
   * we know a new message is on its way.
   */
  const [writingAnother, setWritingAnother] = useState(false);
  const err = state.fieldErrors ?? {};
  const keep = (name: string) => state.values?.[name];

  if (state.ok && !writingAnother) {
    return (
      <div className="mm-glass mm-panel flex flex-col items-center px-6 py-14 text-center">
        <Icon
          icon="game-icons:raven"
          width={44}
          className="text-[var(--mm-live)]"
        />
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Message sent
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--mm-text-dim)]">
          We read everything that comes through here and reply to the address
          you gave us. Give us a few days over a busy event week.
        </p>
        {/* The receipt used to be the end of the road: nothing to press, and
            the only way to write again was a page reload. */}
        <button
          type="button"
          onClick={() => setWritingAnother(true)}
          className="mm-btn mm-btn-ghost mt-6"
        >
          <Icon icon="mdi:pencil-outline" width={16} /> Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        setWritingAnother(false);
        formAction(fd);
      }}
      className="space-y-5"
    >
      <input type="hidden" name="stamp" value={stamp} />

      {/* Honeypot. Off-screen rather than display:none, unfocusable and
          ignored by assistive tech, so nobody meets it but a script reading
          the markup. Named like something worth filling in. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={honeypotField}>Website</label>
        <input
          id={honeypotField}
          name={honeypotField}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[var(--mm-danger)] bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] p-3 text-sm text-[var(--mm-danger)]"
        >
          <Icon
            icon="mdi:alert-circle-outline"
            width={16}
            className="mt-0.5 shrink-0"
          />
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label="Your name"
          icon="game-icons:visored-helm"
          required
          autoComplete="name"
          defaultValue={keep("name")}
          error={err.name}
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          icon="mdi:email-outline"
          required
          autoComplete="email"
          defaultValue={keep("email")}
          error={err.email}
        />
      </div>

      <TextField
        name="org"
        label="Shop, studio or group"
        icon="game-icons:shop"
        hint="optional"
        autoComplete="organization"
        defaultValue={keep("org")}
        error={err.org}
      />

      <TextareaField
        name="message"
        label="Your message"
        icon="mdi:text"
        required
        rows={7}
        defaultValue={keep("message")}
        error={err.message}
      />

      {turnstileSiteKey && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
          />
          {/* Cloudflare injects the response into a field of its own inside
              this element, which the action reads. */}
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <button
          disabled={pending}
          className="mm-btn mm-btn-primary w-full justify-center py-3.5 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {pending ? (
            <>
              <Icon icon="mdi:loading" width={18} className="animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Icon icon="mdi:send-outline" width={18} />
              Send message
            </>
          )}
        </button>
        <a
          href="mailto:information@mythical-mecca.com"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)] hover:text-[var(--mm-gold)] transition"
        >
          <Icon icon="mdi:email-outline" width={15} />
          <span>Or email us: information@mythical-mecca.com</span>
        </a>
      </div>
    </form>
  );
}
