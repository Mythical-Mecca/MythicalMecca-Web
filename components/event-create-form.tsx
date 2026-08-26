"use client";

import { useActionState, useState } from "react";
import { Icon } from "./icon";
import { LocationField } from "./location-field";
import { EventSchedule } from "./event-schedule";
import {
  TextField,
  TextareaField,
  CheckboxField,
  FormSection,
} from "./form";
import { PickerField } from "./picker-field";
import { ImageUploader } from "./image-uploader";
import { createEvent } from "@/app/(admin)/actions";

export type PartnerOption = { id: string; name: string };

/**
 * The "schedule an event" form, shown in a drawer from the events table.
 *
 * Creation stays a full form rather than a new table row: an event needs a
 * title, a window and a location before it means anything, and half of those
 * have their own pickers. Everything after creation is a cell edit.
 */
export function EventCreateForm({ partners }: { partners: PartnerOption[] }) {
  const [state, formAction, pending] = useActionState(createEvent, {});
  const [titleOk, setTitleOk] = useState(false);
  const [sched, setSched] = useState({ startsAt: "", endsAt: "" });
  const [origin, setOrigin] = useState("hosted");

  const valid = titleOk && sched.startsAt !== "" && sched.endsAt !== "";

  return (
    <form action={formAction} className="space-y-5">
      <TextField
        name="title"
        label="Title"
        icon="mdi:format-title"
        required
        placeholder="Event name"
        onChange={(e) => setTitleOk(e.currentTarget.value.trim().length >= 2)}
      />
      <TextField
        name="summary"
        label="Summary"
        hint="optional"
        icon="mdi:text-short"
        description="A one-line teaser shown in listings."
        placeholder="One-liner"
      />
      <PickerField
        name="origin"
        label="Origin"
        icon="mdi:source-branch"
        description="Who runs this event?"
        value={origin}
        onValueChange={setOrigin}
        options={[
          { value: "hosted", label: "Official", hint: "Hosted by us.", icon: "game-icons:castle" },
          { value: "partner", label: "Partner", hint: "Hosted by one of our partners.", icon: "game-icons:anvil" },
          { value: "external", label: "External", hint: "Someone else's event that we're sharing.", icon: "mdi:web" },
        ]}
      />
      {origin === "partner" && (
        <PickerField
          name="partnerId"
          label="Partner"
          icon="game-icons:anvil"
          placeholder="Pick the hosting partner"
          options={partners.map((p) => ({ value: p.id, label: p.name, icon: "game-icons:anvil" }))}
        />
      )}
      {origin === "external" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="sourceName"
            label="Source"
            icon="mdi:web"
            placeholder="Who runs it? e.g. Cape Town Geek Fest"
          />
          <TextField
            name="externalUrl"
            label="Event link"
            icon="mdi:open-in-new"
            type="url"
            placeholder="https://…"
          />
        </div>
      )}
      <LocationField />
      <FormSection title="When" icon="mdi:calendar-clock">
        <EventSchedule onChange={setSched} />
      </FormSection>
      <TextareaField
        name="bodyMd"
        label="Details"
        hint="optional"
        icon="mdi:text-long"
        rows={4}
        placeholder="What's happening…"
      />

      <FormSection title="Gallery" icon="mdi:image-multiple-outline">
        <ImageUploader
          name="eventImages"
          entityType="event_gallery"
          maxFiles={12}
          accent="#5cc08c"
          label="Event photos"
          description="Optional · shown on the public event page"
        />
      </FormSection>

      <CheckboxField
        name="postToDiscord"
        defaultChecked
        icon="mdi:discord"
        label="Post to Discord"
        description="Announce this event in the Discord server when scheduled."
      />

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

      <button
        type="submit"
        disabled={!valid || pending}
        className="mm-btn mm-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <Icon icon="mdi:calendar-plus" width={16} />{" "}
        {pending ? "Scheduling…" : "Schedule event"}
      </button>
    </form>
  );
}
