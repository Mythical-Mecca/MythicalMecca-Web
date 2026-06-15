import Link from "next/link";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const metadata = { title: "News — Mythical Mecha" };

export default async function NewsPage() {
  const posts = await getPosts();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        <span className="mm-gradient-text">Transmissions</span>
      </h1>
      <p className="mt-3 text-[var(--mm-text-dim)]">
        News and dispatches from across the hall.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/news/${p.slug}`}
            className="mm-glass group p-6 transition hover:border-[var(--mm-violet)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-[var(--mm-text-dim)]">
                {formatDate(p.publishedAt)}
              </span>
            </div>
            <h2 className="text-lg font-medium group-hover:text-[var(--mm-gold)]">
              {p.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
