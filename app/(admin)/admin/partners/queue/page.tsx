import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { listPartnersForReview } from "@/lib/partner";
import { listMyGallery } from "@/lib/partner";
import { approvePartner, rejectPartner } from "../../../actions";
import { inputCls } from "@/components/form";
import { PartnerTabs } from "@/components/partner-tabs";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";

const ACCENT = "#E18D01";

export default async function AdminPartnerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const pending = await listPartnersForReview();
  const { done, error } = await searchParams;

  // Reviewers must see the actual content, not just the profile text —
  // otherwise approval is rubber-stamping something nobody looked at.
  const galleries = await Promise.all(
    pending.map((p) => listMyGallery(p.id))
  );

  return (
    <div className="space-y-8">
      <PageHeading
        size="md"
        title="Review queue"
        subtitle="Partner-created stalls waiting to go live."
        icon="mdi:clipboard-check-outline"
        accent={ACCENT}
      />

      <PartnerTabs active="/admin/partners/queue" />

      {done && <Flash>Verdict recorded.</Flash>}
      {error === "note" && (
        <Flash tone="error">
          Add a note — it&apos;s the only feedback the owner gets.
        </Flash>
      )}
      {error && error !== "note" && <Flash tone="error">Action failed.</Flash>}

      {pending.length === 0 ? (
        <p className="text-sm text-[var(--mm-text-dim)]">
          Nothing waiting. Self-serve stalls appear here when their owner
          submits them.
        </p>
      ) : (
        <div className="space-y-5">
          {pending.map((p, i) => {
            const gallery = galleries[i] ?? [];
            return (
              <article key={p.id} className="mm-glass p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-[family-name:var(--font-display)] text-lg">
                      {p.businessName}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {p.categoryName && (
                        <Badge color="var(--mm-violet)">{p.categoryName}</Badge>
                      )}
                      <Badge color="var(--mm-text-dim)" icon="mdi:account-multiple-outline">
                        {p.memberCount} {p.memberCount === 1 ? "member" : "members"}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href={`/partners/${p.slug}?preview=1`}
                    className="mm-btn mm-btn-ghost shrink-0 text-sm"
                  >
                    <Icon icon="mdi:eye-outline" width={16} /> Preview
                  </Link>
                </div>

                {p.tagline && (
                  <p className="mt-3 text-sm text-[var(--mm-text)]">{p.tagline}</p>
                )}
                <p className="mt-2 whitespace-pre-line text-sm text-[var(--mm-text-dim)]">
                  {p.bio || "No bio provided."}
                </p>

                {p.socialsRaw && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.socialsRaw.split("\n").map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mm-btn mm-btn-ghost text-xs"
                      >
                        <Icon icon="mdi:link-variant" width={14} /> {url}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                    Gallery ({gallery.length})
                  </p>
                  {gallery.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                      No images uploaded.
                    </p>
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {gallery.map((g) => (
                        <div
                          key={g.id}
                          className="relative aspect-square overflow-hidden rounded-lg border border-[var(--mm-border)]"
                        >
                          {g.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={g.imageUrl}
                              alt={g.caption ?? ""}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                              <Icon icon="mdi:image-off-outline" width={20} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-2 border-t border-[var(--mm-border)] pt-4">
                  <form action={approvePartner}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="mm-btn mm-btn-primary text-sm">
                      <Icon icon="mdi:check" width={16} /> Approve &amp; publish
                    </button>
                  </form>
                  <form
                    action={rejectPartner}
                    className="flex flex-1 flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <label className="min-w-48 flex-1">
                      <span className="mb-1 block text-xs text-[var(--mm-text-dim)]">
                        Reason for changes (required)
                      </span>
                      <input
                        name="note"
                        required
                        className={inputCls}
                        placeholder="What needs fixing before this goes live?"
                      />
                    </label>
                    <button className="mm-btn mm-btn-ghost text-sm">
                      <Icon icon="mdi:close" width={16} /> Request changes
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
