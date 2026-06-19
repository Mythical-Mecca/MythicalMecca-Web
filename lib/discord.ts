import "server-only";

/**
 * Posts announcements to Discord via incoming webhooks.
 *
 * Channels are resolved per-purpose so different content can route to
 * different Discord channels. Each channel reads its own env var
 * (`DISCORD_WEBHOOK_<CHANNEL>`) and falls back to `DISCORD_WEBHOOK_DEFAULT`
 * when that override isn't set. To add a new integration, add an entry to
 * `CHANNEL_ENV` and a matching env var — nothing else needs to change.
 *
 * All helpers fail soft: a missing webhook or a network/Discord error is
 * logged but never throws, so they can't break the flow that triggers them.
 */

export type DiscordChannel = "news" | "events";

const CHANNEL_ENV: Record<DiscordChannel, string> = {
  news: "DISCORD_WEBHOOK_NEWS",
  events: "DISCORD_WEBHOOK_EVENTS",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const GOLD = 0xE18D01;
const GREEN = 0x5cc08c;

type Embed = {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
};

function webhookFor(channel: DiscordChannel): string {
  return (
    process.env[CHANNEL_ENV[channel]] ||
    process.env.DISCORD_WEBHOOK_DEFAULT ||
    ""
  );
}

function absoluteUrl(path: string): string {
  if (!APP_URL) return path;
  return `${APP_URL.replace(/\/$/, "")}${path}`;
}

async function send(
  channel: DiscordChannel,
  payload: { content?: string; embeds?: Embed[] }
): Promise<boolean> {
  const webhook = webhookFor(channel);
  if (!webhook) {
    console.warn(
      `[discord] no webhook for "${channel}" (set ${CHANNEL_ENV[channel]} or DISCORD_WEBHOOK_DEFAULT) — skipping announcement`
    );
    return false;
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(
        `[discord] "${channel}" webhook responded ${res.status} ${res.statusText}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[discord] "${channel}" webhook request failed`, err);
    return false;
  }
}

/** Announce a freshly published news post. */
export async function announcePost(p: {
  title: string;
  excerpt?: string | null;
  slug: string;
}): Promise<boolean> {
  return send("news", {
    content: "📜 **New post on Mythical Mecca**",
    embeds: [
      {
        title: p.title,
        description: p.excerpt || undefined,
        url: absoluteUrl(`/news/${p.slug}`),
        color: GOLD,
      },
    ],
  });
}

/** Announce a freshly scheduled gathering/event. */
export async function announceEvent(e: {
  title: string;
  summary?: string | null;
  location?: string | null;
  startsAt: Date;
  slug: string;
}): Promise<boolean> {
  const fields: NonNullable<Embed["fields"]> = [
    {
      name: "When",
      // Discord renders this as a localized timestamp for each viewer.
      value: `<t:${Math.floor(e.startsAt.getTime() / 1000)}:F>`,
      inline: true,
    },
  ];
  if (e.location) fields.push({ name: "Where", value: e.location, inline: true });

  return send("events", {
    content: "🔥 **New gathering announced**",
    embeds: [
      {
        title: e.title,
        description: e.summary || undefined,
        url: absoluteUrl(`/events/${e.slug}`),
        color: GREEN,
        fields,
      },
    ],
  });
}
