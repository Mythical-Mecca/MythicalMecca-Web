import { listPosts } from "@/lib/admin";
import { createPost } from "../../actions";
import {
  TextField,
  TextareaField,
  FormCard,
  PageHeader,
} from "@/components/form";
import { Icon } from "@/components/icon";

const ACCENT = "#f2b441";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const posts = await listPosts();
  const { created, error } = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tidings"
        sub="News & posts — write and publish to the homepage feed."
        icon="game-icons:scroll-unfurled"
        accent={ACCENT}
      />

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

      <FormCard title="New post" icon="mdi:plus" accent={ACCENT}>
        <form action={createPost} className="space-y-5">
          <TextField
            name="title"
            label="Title"
            icon="mdi:format-title"
            required
            placeholder="Headline"
          />
          <TextField
            name="excerpt"
            label="Excerpt"
            hint="optional"
            icon="mdi:text-short"
            description="A one-line summary shown in listings."
            placeholder="One-line summary"
          />
          <TextareaField
            name="bodyMd"
            label="Body"
            icon="mdi:text-long"
            hint="blank lines = paragraphs"
            required
            rows={6}
            placeholder="Write the post…"
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:send" width={16} /> Publish post
          </button>
        </form>
      </FormCard>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <Icon icon="mdi:format-list-bulleted" width={20} className="text-[var(--mm-text-dim)]" />
          Published <span className="text-sm text-[var(--mm-text-dim)]">({posts.length})</span>
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">No posts yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <div key={p.id} className="mm-glass p-4">
                <div className="mb-2 flex items-center justify-end">
                  <span className="text-[11px] uppercase tracking-widest text-[var(--mm-text-dim)]">
                    {p.status}
                  </span>
                </div>
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-xs text-[var(--mm-text-dim)]">{p.createdAt}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
