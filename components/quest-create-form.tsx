"use client";

import { useActionState } from "react";
import { createQuest, type QuestFormState } from "@/app/(admin)/actions";
import { TextField, TextareaField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";

export function QuestCreateForm({
  events,
}: {
  /** `when` disambiguates events that share a name across dates. */
  events: { id: string; title: string; when: string }[];
}) {
  const [state, formAction, pending] = useActionState<QuestFormState, FormData>(
    createQuest,
    {}
  );

  return (
    <FormCard title="New quest" icon="game-icons:treasure-map" accent="#9a6cff">
      <form action={formAction} className="space-y-4">
        <TextField
          label="Title"
          name="title"
          required
          placeholder="Opening Night Trail"
          icon="mdi:format-title"
        />
        <TextareaField
          label="Description"
          name="description"
          rows={3}
          placeholder="What the trail is, and what's in it for whoever finishes."
          icon="mdi:text"
        />
        <PickerField
          label="Attached event"
          name="eventId"
          icon="game-icons:campfire"
          placeholder="Not tied to an event"
          description="Attaching a quest surfaces it on that event's page, and uses the event's location for venue checks."
          options={events.map((e) => ({
            value: e.id,
            label: e.title,
            hint: e.when,
            icon: "game-icons:campfire",
          }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Opens"
            name="startsAt"
            type="datetime-local"
            icon="mdi:clock-start"
            hint="optional"
          />
          <TextField
            label="Closes"
            name="endsAt"
            type="datetime-local"
            icon="mdi:clock-end"
            hint="optional"
          />
        </div>
        {state.error && (
          <p className="text-sm text-[var(--mm-danger)]">{state.error}</p>
        )}
        <p className="text-xs text-[var(--mm-text-dim)]">
          New quests start switched off so you can build the trail before anyone
          can see it.
        </p>
        <button disabled={pending} className="mm-btn mm-btn-primary">
          {pending ? "Creating…" : "Create quest"}
        </button>
      </form>
    </FormCard>
  );
}
