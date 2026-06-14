import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, getEvents } from "@/lib/content";
import { DivisionBadge, SimpleProse } from "@/components/content-ui";
import { formatDateTime } from "@/lib/format";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/events"
        className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        ← All ops
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <DivisionBadge division={event.division} />
        <span className="text-xs text-[var(--mm-text-dim)]">
          {formatDateTime(event.startsAt)}
        </span>
      </div>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight">
        {event.title}
      </h1>
      <p className="mt-3 text-lg text-[var(--mm-text-dim)]">{event.summary}</p>

      <div className="mm-glass mt-8 grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            When
          </p>
          <p className="mt-1 text-sm">
            {formatDateTime(event.startsAt)} → {formatDateTime(event.endsAt)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            Where
          </p>
          <p className="mt-1 text-sm">{event.location ?? "TBA"}</p>
        </div>
      </div>

      <div className="mt-8">
        <SimpleProse text={event.bodyMd} />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/login" className="mm-btn mm-btn-primary text-sm">
          Sign in to attend
        </Link>
        {/* Add-to-calendar, share, comments & reviews wire up in Phase 4. */}
        <span className="mm-btn mm-btn-ghost cursor-not-allowed text-sm opacity-50">
          Add to calendar (soon)
        </span>
      </div>
    </article>
  );
}
