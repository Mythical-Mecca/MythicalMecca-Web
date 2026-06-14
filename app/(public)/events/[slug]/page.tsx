import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, isEventStarted, isEventLive } from "@/lib/content";
import {
  getComments,
  getReviews,
  getReviewSummary,
} from "@/lib/events-social";
import { DivisionBadge, SimpleProse } from "@/components/content-ui";
import { EventActions } from "@/components/event-actions";
import { formatDateTime, formatDate } from "@/lib/format";
import { addComment, addReview } from "../actions";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cerror?: string; rerror?: string }>;
}) {
  const { slug } = await params;
  const { cerror, rerror } = await searchParams;
  const event = await getEvent(slug);
  if (!event) notFound();

  const [comments, reviews, summary] = await Promise.all([
    getComments(slug),
    getReviews(slug),
    getReviewSummary(slug),
  ]);
  const started = isEventStarted(event);
  const live = isEventLive(event);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/events"
        className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        ← All gatherings
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <DivisionBadge division={event.division} />
        {live && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--mm-live)] px-3 py-0.5 text-xs uppercase tracking-widest text-[var(--mm-live)]">
            <span className="mm-dot-live" /> Live now
          </span>
        )}
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

      <div className="mt-6">
        <EventActions
          slug={event.slug}
          title={event.title}
          startsAt={event.startsAt}
          endsAt={event.endsAt}
          summary={event.summary}
          location={event.location}
        />
      </div>

      <div className="mt-8">
        <SimpleProse text={event.bodyMd} />
      </div>

      {/* Comments */}
      <section id="comments" className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
          Comments ({comments.length})
        </h2>
        {cerror && (
          <p className="mt-2 text-sm text-[var(--mm-danger)]">
            Could not post comment.
          </p>
        )}
        <form action={addComment} className="mt-4 flex gap-2">
          <input type="hidden" name="slug" value={event.slug} />
          <input
            name="body"
            placeholder="Share a word…"
            className="flex-1 rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
          />
          <button className="mm-btn mm-btn-primary text-sm">Send</button>
        </form>
        <ul className="mt-6 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="mm-glass p-4">
              <div className="flex items-center justify-between text-xs text-[var(--mm-text-dim)]">
                <span className="text-[var(--mm-gold)]">{c.author}</span>
                <span>{formatDate(c.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm">{c.body}</p>
            </li>
          ))}
          {comments.length === 0 && (
            <li className="text-sm text-[var(--mm-text-dim)]">
              No comments yet — be the first.
            </li>
          )}
        </ul>
      </section>

      {/* Reviews — gated to day-of and after */}
      <section id="reviews" className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
            Reviews ({summary.count})
          </h2>
          {summary.count > 0 && (
            <span className="text-sm text-[var(--mm-gold)]">
              ★ {summary.avg} / 5
            </span>
          )}
        </div>

        {rerror === "locked" && (
          <p className="mt-2 text-sm text-[var(--mm-danger)]">
            Reviews unlock once the event begins.
          </p>
        )}

        {started ? (
          <form action={addReview} className="mt-4 space-y-3">
            <input type="hidden" name="slug" value={event.slug} />
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--mm-text-dim)]">Rating</label>
              <select
                name="rating"
                defaultValue="5"
                className="rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--mm-violet)]"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="body"
              rows={3}
              placeholder="How was the op?"
              className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--mm-violet)]"
            />
            <button className="mm-btn mm-btn-primary text-sm">
              Post review
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-2xl border border-[var(--mm-border)] p-4 text-sm text-[var(--mm-text-dim)]">
            Reviews open on the day of the gathering. Check back once it begins.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="mm-glass p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--mm-gold)]">{r.author}</span>
                <span className="text-[var(--mm-gold)]">{"★".repeat(r.rating)}</span>
              </div>
              {r.body && <p className="mt-2 text-sm">{r.body}</p>}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
