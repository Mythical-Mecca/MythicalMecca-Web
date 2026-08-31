import { Icon } from "@/components/icon";
import { updateNotificationPrefs } from "@/app/(app)/actions";
import type { NotificationPrefs } from "@/lib/notifications";

/**
 * One channel, one switch.
 *
 * A checkbox rather than a styled toggle: it is a form control inside a form
 * that posts, it announces its own state to a screen reader, and it keeps
 * working if the JavaScript never arrives. The hidden companion field is what
 * makes "off" reach the server — an unchecked box submits nothing at all, so
 * without it a member could never turn a channel back off.
 */
function ChannelSwitch({
  name,
  label,
  description,
  icon,
  checked,
  disabled,
}: {
  name: string;
  label: string;
  description: string;
  icon: string;
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-[var(--mm-border)] p-4 ${
        disabled ? "opacity-60" : "cursor-pointer hover:border-[var(--mm-gold)]"
      }`}
    >
      {!disabled && <input type="hidden" name={name} value="off" />}
      <input
        type="checkbox"
        name={name}
        value="on"
        defaultChecked={checked}
        disabled={disabled}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--mm-gold)]"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon icon={icon} width={15} className="text-[var(--mm-gold)]" />
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--mm-text-dim)]">
          {description}
        </span>
      </span>
    </label>
  );
}

/**
 * How we reach you, on the profile.
 *
 * Its own form rather than a section of the profile form: the two save
 * different things, and folding notification switches into "Save changes"
 * meant every avatar upload silently rewrote them too.
 */
export function NotificationSettings({ prefs }: { prefs: NotificationPrefs }) {
  return (
    <section className="mm-glass p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
        Notifications
      </h2>
      <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
        How we tell you about new gatherings, quests and replies. You can also
        turn any of these off from the footer of a message we send.
      </p>

      <form action={updateNotificationPrefs} className="mt-5 space-y-3">
        <ChannelSwitch
          name="inApp"
          icon="mdi:bell-outline"
          label="In the app"
          description="Shown when you are signed in. Nothing leaves the site."
          checked={prefs.inApp}
        />
        <ChannelSwitch
          name="email"
          icon="mdi:email-outline"
          label="Email"
          description="Sent to the address on your account."
          checked={prefs.email}
        />
        <ChannelSwitch
          name="discord"
          icon="mdi:discord"
          label="Discord"
          description="Not available yet. We post to the Discord channels, but sending you a direct message needs a bot we have not built."
          checked={prefs.discord}
          disabled
        />

        <button type="submit" className="mm-btn mm-btn-primary mt-2">
          <Icon icon="mdi:content-save-outline" width={16} /> Save notifications
        </button>
      </form>
    </section>
  );
}
