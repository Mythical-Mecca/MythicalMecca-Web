import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuestAdmin } from "@/lib/admin-quests";
import { qrDataUrl } from "@/lib/qrcode";
import { Icon } from "@/components/icon";
import { tagHostWarning } from "@/lib/app-url";
import { forwardReturn } from "@/lib/return-to";

export const metadata = { title: "Quest tags · Admin" };

/** Filename-safe label so downloaded PNGs are identifiable without opening. */
function slugifyForFile(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tag"
  );
}

export default async function QuestTagsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; fromLabel?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const quest = await getQuestAdmin(slug);
  if (!quest) notFound();

  const visitObjectives = quest.objectiveList.filter((o) => o.type === "qr_scan");
  const cards = await Promise.all(
    visitObjectives.map(async (o) => ({
      ...o,
      qr: await qrDataUrl(o.tagUrl),
    }))
  );
  const warning = cards[0] ? await tagHostWarning(cards[0].tagUrl) : null;

  return (
    <div className="space-y-6">
      {warning && (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm print:hidden">
          <Icon
            icon="mdi:alert-outline"
            width={16}
            className="mr-1.5 inline text-[var(--mm-gold)]"
          />
          {warning}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={forwardReturn(`/admin/quests/${quest.slug}`, sp)}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
        >
          <Icon icon="mdi:chevron-left" width={16} /> Back to {quest.title}
        </Link>
        <p className="text-sm text-[var(--mm-text-dim)]">
          {cards.length} tag{cards.length === 1 ? "" : "s"} · print this page, or
          write each URL to an NFC tag
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-[var(--mm-text-dim)]">
          No destination objectives yet — only ones set to &ldquo;check in at the
          destination&rdquo; need a tag.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((o) => (
            <div
              key={o.id}
              id={`tag-${o.id}`}
              className="mm-glass break-inside-avoid p-5 text-center print:border print:border-black"
            >
              <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
                {quest.title}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl">
                {o.partnerName ?? o.title}
              </h2>
              {o.locationHint && (
                <p className="text-sm text-[var(--mm-text-dim)]">
                  {o.locationHint}
                </p>
              )}
              {/* White plate, and the rounding is on the wrapper — a rounded
                  <img> clips the QR's finder patterns and hurts read rate. */}
              <div className="mx-auto mt-4 w-fit overflow-hidden rounded-xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.qr}
                  alt={`Tag for ${o.title}`}
                  width={220}
                  height={220}
                  className="block"
                />
              </div>
              <p className="mt-3 text-sm font-medium">Scan to check in</p>
              <code className="mt-2 block break-all text-[10px] text-[var(--mm-text-dim)]">
                {o.tagUrl}
              </code>

              <div className="mt-3 flex flex-wrap justify-center gap-2 print:hidden">
                {/* A plain anchor with `download` saves the data URL straight
                    to disk — no JavaScript needed. */}
                <a
                  href={o.qr}
                  download={`${quest.slug}-${slugifyForFile(
                    o.partnerName ?? o.title
                  )}.png`}
                  className="mm-btn mm-btn-ghost text-xs"
                >
                  <Icon icon="mdi:download" width={14} /> Download PNG
                </a>
                {o.claimMode === "live_code" && (
                  <Link
                    href={`/partner-hub/station/${o.id}`}
                    className="mm-btn mm-btn-ghost text-xs"
                  >
                    <Icon icon="mdi:monitor-dashboard" width={14} /> Station
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
