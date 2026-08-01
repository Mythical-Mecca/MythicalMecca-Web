import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getQuestAdmin } from "@/lib/admin-quests";
import { qrDataUrl } from "@/lib/qrcode";
import { Icon } from "@/components/icon";

export const metadata = { title: "Quest tags — Mythical Mecca" };

/**
 * Tags are built from NEXT_PUBLIC_APP_URL, which is right: a printed tag has to
 * point at the public site, not at whatever machine printed it. But that also
 * means a stale value prints a sheet of dead QR codes, and you'd only find out
 * on the day. Cheap to check, expensive to miss.
 */
async function appUrlWarning(sampleUrl: string): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("host");
    if (!host) return null;
    const tagHost = new URL(sampleUrl).host;
    if (tagHost === host) return null;
    return `These tags point at ${tagHost}, but you're browsing ${host}. They'll only work if ${tagHost} is the live site — otherwise fix NEXT_PUBLIC_APP_URL before printing.`;
  } catch {
    return null;
  }
}

/**
 * The print sheet. One card per destination objective, each carrying the QR
 * that encodes that objective's tag URL — the same URL you'd write to an NFC
 * tag. Printing is safe: the tag identifies an objective and grants nothing.
 */
export default async function QuestTagsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quest = await getQuestAdmin(slug);
  if (!quest) notFound();

  const visitObjectives = quest.objectiveList.filter((o) => o.type === "qr_scan");
  const cards = await Promise.all(
    visitObjectives.map(async (o) => ({
      ...o,
      qr: await qrDataUrl(o.tagUrl),
    }))
  );
  const warning = cards[0] ? await appUrlWarning(cards[0].tagUrl) : null;

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
          href={`/admin/quests/${quest.slug}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={o.qr}
                alt={`Tag for ${o.title}`}
                width={220}
                height={220}
                className="mx-auto mt-4 rounded-xl"
              />
              <p className="mt-3 text-sm font-medium">Scan to check in</p>
              <code className="mt-2 block break-all text-[10px] text-[var(--mm-text-dim)]">
                {o.tagUrl}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
