import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/content";
import { DivisionBadge, SimpleProse } from "@/components/content-ui";
import { formatDate } from "@/lib/format";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/news"
        className="text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
      >
        ← All news
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <DivisionBadge division={post.division} />
        <span className="text-xs text-[var(--mm-text-dim)]">
          {formatDate(post.publishedAt)}
        </span>
      </div>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight">
        {post.title}
      </h1>
      <div className="mt-8">
        <SimpleProse text={post.bodyMd} />
      </div>
    </article>
  );
}
