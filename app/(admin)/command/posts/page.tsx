import { listPosts } from "@/lib/admin";
import { createPost } from "../../actions";

const DIVISIONS = ["tabletop", "arcade", "otaku", "maker"] as const;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const posts = await listPosts();
  const { created, error } = await searchParams;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Posts
      </h1>

      {created && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Post published.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not publish — check inputs.
        </div>
      )}

      <section className="mm-glass p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg">
          New transmission
        </h2>
        <form action={createPost} className="space-y-4">
          <input
            name="title"
            required
            placeholder="Title"
            className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
          />
          <input
            name="excerpt"
            placeholder="Excerpt (optional)"
            className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
          />
          <select
            name="division"
            defaultValue=""
            className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm capitalize outline-none focus:border-[var(--mm-violet)]"
          >
            <option value="">No division</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <textarea
            name="bodyMd"
            required
            rows={6}
            placeholder="Body (markdown-ish — blank lines separate paragraphs)"
            className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--mm-violet)]"
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            Publish post
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Published
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No posts yet.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="mm-glass flex items-center justify-between p-3 text-sm"
              >
                <span>{p.title}</span>
                <span className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                  {p.status} · {p.createdAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
