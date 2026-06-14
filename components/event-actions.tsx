"use client";

import { useState } from "react";

export function EventActions({
  slug,
  title,
  startsAt,
  endsAt,
  summary,
  location,
}: {
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  location: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const fmt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const googleUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${fmt(startsAt)}/${fmt(endsAt)}` +
    `&details=${encodeURIComponent(summary)}` +
    `&location=${encodeURIComponent(location ?? "")}`;

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, text: summary, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mm-btn mm-btn-ghost text-sm"
      >
        Add to Google
      </a>
      <a
        href={`/api/events/${slug}/ics`}
        className="mm-btn mm-btn-ghost text-sm"
      >
        Download .ics
      </a>
      <button onClick={share} className="mm-btn mm-btn-primary text-sm">
        {copied ? "Link copied!" : "Share"}
      </button>
    </div>
  );
}
