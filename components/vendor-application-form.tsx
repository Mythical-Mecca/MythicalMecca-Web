"use client";

import { useActionState, useState } from "react";
import { submitVendorApplication } from "@/app/(app)/actions";
import { TextField, TextareaField, FormSection } from "./form";
import { ImageUploader } from "./image-uploader";
import { Icon } from "./icon";

const SOCIALS = [
  { key: "instagram", label: "Instagram", icon: "mdi:instagram", ph: "@handle or link" },
  { key: "youtube", label: "YouTube", icon: "mdi:youtube", ph: "channel link" },
  { key: "tiktok", label: "TikTok", icon: "ic:baseline-tiktok", ph: "@handle" },
  { key: "x", label: "X", icon: "mdi:alpha-x-box", ph: "@handle" },
  { key: "website", label: "Website", icon: "mdi:web", ph: "https://…" },
];

export function VendorApplicationForm() {
  const [state, action, pending] = useActionState(submitVendorApplication, {});
  const [imageCount, setImageCount] = useState(0);

  return (
    <form action={action} className="space-y-7">
      <TextField
        name="businessName"
        label="Store name"
        hint="optional"
        icon="game-icons:shop"
        description="What should we call your stall? Leave blank if you're not sure yet."
        placeholder="e.g. Neon Forge Minis"
      />

      <TextareaField
        name="description"
        label="What do you make?"
        icon="mdi:text-box-outline"
        required
        rows={4}
        description="A short description of your products (required)."
        placeholder="Hand-painted miniatures, enamel pins, original prints…"
      />

      <FormSection title="Demo images" icon="mdi:image-multiple-outline">
        <ImageUploader
          name="images"
          entityType="vendor_application"
          maxFiles={8}
          accent="#9a6cff"
          label="Show off your work"
          description="At least one image · up to 8 · 10 MB each"
          onCountChange={setImageCount}
        />
      </FormSection>

      <FormSection title="Socials" icon="mdi:link-variant">
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <TextField
              key={s.key}
              name={`social_${s.key}`}
              label={s.label}
              icon={s.icon}
              hint="optional"
              placeholder={s.ph}
            />
          ))}
        </div>
      </FormSection>

      {state.error && (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-[var(--mm-danger)] bg-[color-mix(in_srgb,var(--mm-danger)_12%,transparent)] px-4 py-2.5 text-sm text-[var(--mm-danger)]"
        >
          <Icon icon="mdi:alert-circle-outline" width={16} />
          {state.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={imageCount < 1 || pending}
          className="mm-btn mm-btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <Icon icon="mdi:send" width={16} />{" "}
          {pending ? "Submitting…" : "Send petition"}
        </button>
        {imageCount < 1 && (
          <p className="mt-2 text-xs text-[var(--mm-text-dim)]">
            Add at least one demo image to submit.
          </p>
        )}
      </div>
    </form>
  );
}
