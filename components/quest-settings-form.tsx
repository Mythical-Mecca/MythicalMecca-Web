"use client";

import { useActionState } from "react";
import { updateQuest, type QuestSettingsState } from "@/app/(admin)/actions";
import { TextField, TextareaField } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { DateTimeField } from "@/components/datetime-input";
import { Icon } from "@/components/icon";

export interface QuestSettingsEvent {
  id: string;
  title: string;
  /**
   * Preformatted on the server, not a Date formatted here.
   *
   * `toLocaleDateString(undefined, …)` resolves against whoever is running it,
   * so rendering it inside this client component produced "01 Aug 2026" during
   * SSR (the server's locale) and "Aug 1, 2026" after hydration — a mismatch
   * React reported on every load of this page. Formatting once, server-side,
   * makes it one string that both passes agree on.
   */
  when: string;
}

/**
 * The quest's own settings, split out of the page so the server can answer the
 * submit instead of redirecting.
 *
 * It used to `redirect(...?error=1)` on a rejected save, which reloaded the
 * page, discarded the edit and left one page-level line reading "Could not save
 * — check the fields" with no clue which field. Messages now land on the input
 * that caused them, and the values you typed are still there.
 */
export function QuestSettingsForm({
  slug,
  title,
  description,
  eventId,
  startsAtLocal,
  endsAtLocal,
  events,
}: {
  slug: string;
  title: string;
  description: string;
  eventId: string;
  startsAtLocal: string;
  endsAtLocal: string;
  events: QuestSettingsEvent[];
}) {
  const [state, formAction, pending] = useActionState<
    QuestSettingsState,
    FormData
  >(updateQuest, {});
  const fieldError = state.fieldErrors ?? {};
  // See ObjectiveFormState.values — React resets the form after the action.
  const v = state.values ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

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
      {state.ok && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[var(--mm-live)] bg-[color-mix(in_srgb,var(--mm-live)_12%,transparent)] p-3 text-sm text-[var(--mm-live)]"
        >
          <Icon icon="mdi:check-circle-outline" width={16} />
          Settings saved.
        </p>
      )}

      <TextField
        label="Title"
        name="title"
        required
        defaultValue={v.title ?? title}
        icon="mdi:format-title"
        error={fieldError.title}
      />
      <TextareaField
        label="Description"
        name="description"
        rows={3}
        defaultValue={v.description ?? description}
        icon="mdi:text"
        error={fieldError.description}
      />
      <PickerField
        label="Attached event"
        name="eventId"
        icon="game-icons:campfire"
        placeholder="Not tied to an event"
        defaultValue={eventId}
        description="The event's coordinates are what venue checks measure against."
        error={fieldError.eventId}
        options={events.map((e) => ({
          value: e.id,
          label: e.title,
          hint: e.when || undefined,
          icon: "game-icons:campfire",
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label="Opens"
          name="startsAt"
          defaultValue={v.startsAt ?? startsAtLocal}
          icon="mdi:clock-start"
          hint="optional"
          error={fieldError.startsAt}
        />
        <DateTimeField
          label="Closes"
          name="endsAt"
          defaultValue={v.endsAt ?? endsAtLocal}
          icon="mdi:clock-end"
          hint="optional"
          error={fieldError.endsAt}
        />
      </div>
      <p className="text-xs text-[var(--mm-text-dim)]">
        Outside these times the quest is closed even while it&apos;s live. Leave
        both empty to rely on the live switch alone.
      </p>
      <button disabled={pending} className="mm-btn mm-btn-primary">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
