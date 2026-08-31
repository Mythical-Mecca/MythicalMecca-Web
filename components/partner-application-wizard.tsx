"use client";

import { useActionState, useState } from "react";
import { startApplication, submitDraftApplication } from "@/app/(app)/actions";
import { TextField, TextareaField, FormSection } from "./form";
import { PickerField } from "./picker-field";
import { ImageUploader } from "./image-uploader";
import { Icon } from "./icon";

const SOCIALS = [
  { key: "instagram", label: "Instagram", icon: "mdi:instagram", ph: "@handle or link" },
  { key: "youtube", label: "YouTube", icon: "mdi:youtube", ph: "channel link" },
  { key: "tiktok", label: "TikTok", icon: "ic:baseline-tiktok", ph: "@handle" },
  { key: "x", label: "X", icon: "mdi:alpha-x-box", ph: "@handle" },
  { key: "website", label: "Website", icon: "mdi:web", ph: "https://…" },
];

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className="flex items-center gap-2 rounded-xl border border-[var(--mm-danger)] bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] px-4 py-2.5 text-sm text-[var(--mm-danger)]"
    >
      <Icon icon="mdi:alert-circle-outline" width={16} />
      {msg}
    </p>
  );
}

/**
 * Where the page was opened from, carried through the submit.
 *
 * Both steps redirect back to /apply, and a redirect keeps nothing from the
 * URL that triggered it — so without these the back link reverts to its
 * fallback the moment someone saves step 1.
 */
export type ReturnFields = { from?: string; fromLabel?: string };

function ReturnInputs({ returnTo }: { returnTo?: ReturnFields }) {
  if (!returnTo?.from) return null;
  return (
    <>
      <input type="hidden" name="from" value={returnTo.from} />
      {returnTo.fromLabel && (
        <input type="hidden" name="fromLabel" value={returnTo.fromLabel} />
      )}
    </>
  );
}

/** Step 1 — details. Saves a draft application, then advances to step 2. */
export function ApplicationDetailsForm({
  categories = [],
  defaults,
  returnTo,
}: {
  categories?: { id: string; name: string }[];
  defaults?: {
    businessName?: string | null;
    description?: string;
    socials?: Record<string, string>;
  };
  returnTo?: ReturnFields;
}) {
  const [state, action, pending] = useActionState(startApplication, {});
  const s = defaults?.socials ?? {};

  return (
    <form action={action} className="space-y-7">
      <ReturnInputs returnTo={returnTo} />
      <TextField
        name="businessName"
        label="Store name"
        hint="optional"
        icon="game-icons:shop"
        defaultValue={defaults?.businessName ?? ""}
        description="What should we call your stall? Leave blank if unsure."
        placeholder="e.g. Neon Forge Minis"
      />
      {categories.length > 0 && (
        <PickerField
          name="categoryId"
          label="Partner type"
          icon="mdi:tag-outline"
          description="Which kind of stall best fits you?"
          placeholder="Select a partner type…"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}
      <TextareaField
        name="description"
        label="What do you make?"
        icon="mdi:text-box-outline"
        required
        rows={4}
        defaultValue={defaults?.description ?? ""}
        description="A short description of your products (required)."
        placeholder="Hand-painted miniatures, enamel pins, original prints…"
      />
      <FormSection title="Socials" icon="mdi:link-variant">
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map((soc) => (
            <TextField
              key={soc.key}
              name={`social_${soc.key}`}
              label={soc.label}
              icon={soc.icon}
              hint="optional"
              defaultValue={s[soc.key] ?? ""}
              placeholder={soc.ph}
            />
          ))}
        </div>
      </FormSection>

      {state.error && <ErrorBanner msg={state.error} />}

      <button
        type="submit"
        disabled={pending}
        className="mm-btn mm-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save & continue"}{" "}
        <Icon icon="mdi:arrow-right" width={16} />
      </button>
    </form>
  );
}

/** Step 2 — demo images. Uploads attach to the saved draft, then submit. */
export function ApplicationImagesForm({
  returnTo,
}: {
  returnTo?: ReturnFields;
}) {
  const [state, action, pending] = useActionState(submitDraftApplication, {});
  const [count, setCount] = useState(0);

  return (
    <form action={action} className="space-y-6">
      <ReturnInputs returnTo={returnTo} />
      <ImageUploader
        name="images"
        entityType="partner_gallery"
        maxFiles={8}
        accent="#9a6cff"
        label="Upload your demo images"
        description="At least one · up to 8 · 10 MB each"
        onCountChange={setCount}
      />

      {state.error && <ErrorBanner msg={state.error} />}

      <div>
        <button
          type="submit"
          disabled={count < 1 || pending}
          className="mm-btn mm-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon="mdi:send" width={16} />{" "}
          {pending ? "Submitting…" : "Submit application"}
        </button>
        {count < 1 && (
          <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
            Add at least one demo image to submit.
          </p>
        )}
      </div>
    </form>
  );
}
