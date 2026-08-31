"use client";

import { useActionState, useState } from "react";
import { updateQuest, type QuestSettingsState } from "@/app/(admin)/actions";
import { CheckboxField, TextField, TextareaField } from "@/components/form";
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
  sequential,
  startsAtLocal,
  endsAtLocal,
  events,
  allowListEnabled,
  allowList,
  noDataMode,
  memberEmails,
}: {
  slug: string;
  title: string;
  description: string;
  eventId: string;
  sequential: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  events: QuestSettingsEvent[];
  allowListEnabled: boolean;
  allowList: string[];
  /** The event's, not the quest's — it decides what the list holds. */
  noDataMode: boolean;
  /** Existing members, to autocomplete against. Empty at a no-data event. */
  memberEmails: string[];
}) {
  const [state, formAction, pending] = useActionState<
    QuestSettingsState,
    FormData
  >(updateQuest, {});
  const fieldError = state.fieldErrors ?? {};
  // See ObjectiveFormState.values — React resets the form after the action.
  const v = state.values ?? {};

  // The textarea only exists while the switch is on, so its state lives here
  // rather than in a `hidden` attribute — a hidden-but-present field still
  // submits, and an admin who turned the list off would keep enforcing it.
  const [restricted, setRestricted] = useState(allowListEnabled);
  const [list, setList] = useState(v.allowList ?? allowList.join(", "));

  const entries = list
    .split(/[\n,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const already = new Set(entries);
  const unlisted = memberEmails.filter((e) => !already.has(e.toLowerCase()));

  const add = (email: string) =>
    setList((cur) => (cur.trim() ? `${cur.replace(/[\s,;]+$/, "")}, ${email}` : email));

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
        label="Event"
        name="eventId"
        icon="game-icons:campfire"
        required
        placeholder="Choose an event"
        defaultValue={eventId}
        description="Every quest belongs to one event. Its coordinates are what venue checks measure against."
        error={fieldError.eventId}
        options={events.map((e) => ({
          value: e.id,
          label: e.title,
          hint: e.when || undefined,
          icon: "game-icons:campfire",
        }))}
      />
      {/* How the trail may be walked. Off is the venue-navigation default —
          objectives are destinations, and making someone walk them in a fixed
          order turns a floor plan into a queue. */}
      <CheckboxField
        name="sequential"
        value="1"
        defaultChecked={sequential}
        label="Complete objectives in order"
        icon="mdi:format-list-numbered"
        description="On: each objective opens only once the one before it is cleared. Off: objectives are free, apart from any that name a prerequisite of their own."
      />

      {/* Who may play. Off is the default: a quest at a public event is for
          everyone at that event, and an allow list on by accident is a quest
          nobody can start. */}
      <CheckboxField
        name="allowListEnabled"
        value="1"
        defaultChecked={allowListEnabled}
        onChange={(e) => setRestricted(e.currentTarget.checked)}
        label="Use allow list"
        icon="mdi:account-lock-outline"
        description={
          noDataMode
            ? "On: only the usernames below can play this quest. Everyone else at the event is turned away at check-in."
            : "On: only the email addresses below can play this quest. Everyone else at the event is turned away at check-in."
        }
      />

      {restricted && (
        <div className="space-y-2 rounded-xl border border-[var(--mm-divider)] p-4">
          <TextareaField
            label={noDataMode ? "Usernames" : "Email addresses"}
            name="allowList"
            rows={4}
            value={list}
            onChange={(e) => setList(e.currentTarget.value)}
            icon={noDataMode ? "game-icons:hood" : "mdi:email-outline"}
            error={fieldError.allowList}
            description={
              noDataMode
                ? "Comma or line separated. These are the names players choose when they sign in at the event — matched without regard to capitals."
                : "Comma or line separated. Matched against the address someone signed in with, without regard to capitals."
            }
          />

          {!noDataMode && unlisted.length > 0 && (
            /* Picking beats transcribing, and an address typo in an allow
               list is invisible until someone is turned away at a stand. An
               address that is not a member yet is still valid — it starts
               working the moment they join. */
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                Add a member
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unlisted.slice(0, 24).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => add(e)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--mm-border)] px-2.5 py-1 text-xs text-[var(--mm-text-dim)] transition-colors hover:border-[var(--mm-gold)] hover:text-[var(--mm-text)]"
                  >
                    <Icon icon="mdi:plus" width={13} />
                    {e}
                  </button>
                ))}
              </div>
              {unlisted.length > 24 && (
                <p className="text-xs text-[var(--mm-text-dim)]">
                  {unlisted.length - 24} more — type their address instead.
                </p>
              )}
            </div>
          )}

          {entries.length === 0 ? (
            <p
              role="alert"
              className="flex items-start gap-2 text-sm text-[var(--mm-danger)]"
            >
              <Icon
                icon="mdi:alert-outline"
                width={16}
                className="mt-0.5 shrink-0"
              />
              An empty list admits nobody — save this and the quest is closed to
              everyone.
            </p>
          ) : (
            <p className="text-sm text-[var(--mm-text-dim)]">
              {entries.length} {entries.length === 1 ? "person" : "people"} may
              play.
            </p>
          )}
        </div>
      )}

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
