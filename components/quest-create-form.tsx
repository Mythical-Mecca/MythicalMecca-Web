"use client";

import { useActionState } from "react";
import { createQuest, type QuestFormState } from "@/app/(admin)/actions";
import { CheckboxField, TextField, TextareaField } from "@/components/form";
import { DateTimeField } from "@/components/datetime-input";
import { PickerField } from "@/components/picker-field";

export interface QuestEventOption {
  id: string;
  title: string;
  /** Disambiguates events that share a name across dates. */
  when: string;
}

export function QuestCreateForm({
  events,
  onCancel,
}: {
  events: QuestEventOption[];
  /** Rendered as a Cancel button when the form sits in a dialog. */
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<QuestFormState, FormData>(
    createQuest,
    {}
  );
  const fieldError = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <TextField
        label="Title"
        name="title"
        required
        placeholder="Opening Night Trail"
        icon="mdi:format-title"
        error={fieldError.title}
      />
      <TextareaField
        label="Description"
        name="description"
        rows={3}
        placeholder="What the trail is, and what's in it for whoever finishes."
        icon="mdi:text"
        error={fieldError.description}
      />
      <PickerField
        label="Event"
        name="eventId"
        icon="game-icons:campfire"
        required
        placeholder="Choose an event"
        description="Every quest belongs to one event — its page lists the quest, and its coordinates are what venue checks measure against."
        error={fieldError.eventId}
        options={events.map((e) => ({
          value: e.id,
          label: e.title,
          hint: e.when,
          icon: "game-icons:campfire",
        }))}
      />
      <CheckboxField
        name="sequential"
        value="1"
        label="Complete objectives in order"
        icon="mdi:format-list-numbered"
        description="Leave off for a venue trail — objectives are destinations, and a fixed order turns a floor plan into a queue. You can change this later."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label="Opens"
          name="startsAt"
          icon="mdi:clock-start"
          hint="optional"
        />
        <DateTimeField
          label="Closes"
          name="endsAt"
          icon="mdi:clock-end"
          hint="optional"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-[var(--mm-danger)]">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--mm-divider)] pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mm-btn mm-btn-ghost"
          >
            Cancel
          </button>
        )}
        <button disabled={pending} className="mm-btn mm-btn-primary">
          {pending ? "Creating…" : "Create quest"}
        </button>
      </div>
    </form>
  );
}
