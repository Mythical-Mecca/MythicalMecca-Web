import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrintPack, type PrintPage } from "@/lib/print-pack";
import { tagHostWarning } from "@/lib/app-url";
import { forwardReturn } from "@/lib/return-to";
import { PrintPackToolbar } from "@/components/print-pack-toolbar";
import { Icon } from "@/components/icon";
import type { StepType, ClaimMode } from "@/lib/hunts";

export const metadata = { title: "Station pack · Admin" };

/**
 * What the person standing at this objective needs to know. Written for a
 * vendor or a marshal, not for a player — the sheet is pinned at the stand.
 */
const TYPE_NOTE: Record<StepType, string> = {
  qr_scan: "Adventurers scan the code above to check in here.",
  riddle: "Adventurers solve this in the app — nothing to do at the stand.",
  cipher: "Adventurers solve this in the app — nothing to do at the stand.",
  crossword: "Adventurers solve this in the app — nothing to do at the stand.",
  trivia_gate: "Adventurers answer this in the app.",
  photo_proof: "Adventurers upload a photo in the app.",
  geo_checkpoint: "Checks in automatically once an adventurer is close enough.",
  unlock_code: "Adventurers type a code into the app.",
};

const CLAIM_NOTE: Record<ClaimMode, string> = {
  live_code:
    "Staffed stand. Keep the station screen open — adventurers read the rolling four-digit code from it, or show a pass for you to scan.",
  sealed_tag: "Tap the NFC tag. Each tap signs itself, so nothing to staff.",
  open_tag:
    "Open tag. Anyone can scan it, so the check-in is confirmed by location instead.",
};

/* ── sheet furniture ─────────────────────────────────────────────────────── */

function BandHeader({
  questTitle,
  eventTitle,
}: {
  questTitle: string;
  eventTitle: string;
}) {
  return (
    <>
      <header
        className="flex shrink-0 items-center justify-between gap-6 px-[14mm]"
        style={{
          height: "24mm",
          background: "var(--pp-band)",
          color: "var(--pp-band-ink)",
        }}
      >
        <span className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/MMRefined2026.png"
            alt=""
            width={120}
            height={120}
            style={{ height: "12mm", width: "12mm" }}
            className="object-contain"
          />
          <span
            className="font-[family-name:var(--font-display)] tracking-[0.18em]"
            style={{ fontSize: "5mm" }}
          >
            MYTHICAL MECCA
          </span>
        </span>
        <span className="min-w-0 text-right">
          <span
            className="block truncate font-[family-name:var(--font-display)] tracking-wide"
            style={{ fontSize: "4mm", color: "var(--pp-gold)" }}
          >
            {questTitle}
          </span>
          <span
            className="block truncate opacity-70"
            style={{ fontSize: "2.9mm" }}
          >
            {eventTitle}
          </span>
        </span>
      </header>
      <div style={{ height: "1.4mm", background: "var(--pp-gold)" }} />
    </>
  );
}

function BandFooter({ origin, questQr }: { origin: string; questQr: string }) {
  const host = origin.replace(/^https?:\/\//, "");
  return (
    <footer
      className="flex shrink-0 items-center justify-between gap-6 px-[14mm]"
      style={{
        height: "25mm",
        background: "var(--pp-band)",
        color: "var(--pp-band-ink)",
      }}
    >
      <span>
        <span
          className="block font-[family-name:var(--font-display)] tracking-[0.18em]"
          style={{ fontSize: "3.6mm", color: "var(--pp-gold)" }}
        >
          FOLLOW THE TRAIL
        </span>
        <span className="block opacity-80" style={{ fontSize: "3mm" }}>
          Every stand, every objective, live standings — {host}
        </span>
      </span>
      {/* This code carries most of the sheet's practical weight: it is the way
          back in for someone who closed the tab halfway round the hall, and the
          way in for someone who has never opened it. The label has to serve
          both — "join the hunt" only spoke to the second, and the person who
          has lost their place is the one standing here reading a poster.

          The QR needs its white quiet zone even inside a dark band, so it gets
          a plate rather than sitting straight on the navy. 18mm reads from
          roughly 180mm — arm's length at the stand. */}
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="text-right opacity-80" style={{ fontSize: "2.7mm" }}>
          Open or resume
          <br />
          the quest
        </span>
        <span className="block bg-white" style={{ padding: "1.2mm" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={questQr}
            alt=""
            style={{ height: "18mm", width: "18mm" }}
            className="block"
          />
        </span>
      </span>
    </footer>
  );
}

/* ── the two body treatments ─────────────────────────────────────────────── */

/** Destination objectives: the code is the page. */
function HeroCode({ page }: { page: PrintPage }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      {/* 85mm answers the 10:1 rule for a scan across a counter (~850mm). The
          plate is white and unrounded — a rounded corner clips the finder
          patterns and costs read rate exactly where it matters. */}
      <div className="bg-white" style={{ padding: "4mm" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.tagQr!}
          alt={`Check-in code for ${page.title}`}
          style={{ height: "85mm", width: "85mm" }}
          className="block"
        />
      </div>
      <p
        className="mt-[6mm] font-[family-name:var(--font-display)] tracking-[0.12em]"
        style={{ fontSize: "6mm", color: "var(--pp-gold-text)" }}
      >
        SCAN TO CHECK IN
      </p>
      <p
        className="mt-[2mm] text-center"
        style={{ fontSize: "3mm", color: "var(--pp-ink-dim)" }}
      >
        {CLAIM_NOTE[page.claimMode]}
      </p>
    </div>
  );
}

/** Everything else: the objective's own words, given room to be read. */
function NotesPanel({ page }: { page: PrintPage }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <div
        style={{
          border: "0.4mm solid var(--pp-rule)",
          borderRadius: "3mm",
          padding: "10mm",
        }}
      >
        <p
          className="font-[family-name:var(--font-display)] tracking-[0.14em]"
          style={{ fontSize: "3.4mm", color: "var(--pp-gold-text)" }}
        >
          THE OBJECTIVE
        </p>
        {page.prompt ? (
          /* The sheet is a fixed frame that clips rather than spilling onto a
             second page, so a long riddle steps down a size instead of losing
             its last lines. Past ~600 characters no type size saves it, and
             that is a briefing that wants editing, not a smaller font. */
          <p
            className="mt-[5mm] leading-relaxed"
            style={{
              fontSize:
                page.prompt.length > 600
                  ? "3.6mm"
                  : page.prompt.length > 320
                    ? "4.4mm"
                    : "5.4mm",
            }}
          >
            {page.prompt}
          </p>
        ) : (
          <p
            className="mt-[5mm] italic"
            style={{ fontSize: "4.4mm", color: "var(--pp-ink-dim)" }}
          >
            No briefing text set for this objective.
          </p>
        )}
      </div>
      <p
        className="mt-[6mm] text-center"
        style={{ fontSize: "3.2mm", color: "var(--pp-ink-dim)" }}
      >
        {TYPE_NOTE[page.type]}
      </p>
    </div>
  );
}

/* ── the vendor's half of the deal ───────────────────────────────────────── */

function VendorBlock({ partner }: { partner: NonNullable<PrintPage["partner"]> }) {
  return (
    <section
      className="shrink-0"
      style={{
        borderTop: "0.4mm solid var(--pp-rule)",
        padding: "7mm 14mm",
      }}
    >
      <div className="flex items-start gap-[6mm]">
        {partner.logoSrc && (
          <span
            className="block shrink-0 overflow-hidden bg-white"
            style={{ height: "24mm", width: "24mm", borderRadius: "2mm" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={partner.logoSrc}
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p
            className="font-[family-name:var(--font-display)] tracking-[0.14em]"
            style={{ fontSize: "3mm", color: "var(--pp-gold-text)" }}
          >
            YOU ARE AT
          </p>
          <h3
            className="truncate font-[family-name:var(--font-display)] leading-tight"
            style={{ fontSize: "6.5mm" }}
          >
            {partner.name}
          </h3>
          {partner.tagline && (
            <p
              className="truncate"
              style={{ fontSize: "3.4mm", color: "var(--pp-ink-dim)" }}
            >
              {partner.tagline}
            </p>
          )}

          {partner.socials.length > 0 && (
            <ul className="mt-[3mm] flex flex-wrap items-center gap-x-[5mm] gap-y-[1.5mm]">
              {partner.socials.map((s) => (
                <li
                  key={s.handle + s.label}
                  className="flex items-center gap-[1.5mm]"
                  style={{ fontSize: "3.2mm" }}
                >
                  <Icon
                    icon={s.icon}
                    width={13}
                    style={{ color: "var(--pp-gold-text)" }}
                  />
                  <span>{s.handle}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <span className="shrink-0 text-center">
          <span className="block bg-white" style={{ padding: "1.5mm" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={partner.pageQr}
              alt={`${partner.name} on Mythical Mecca`}
              style={{ height: "24mm", width: "24mm" }}
              className="block"
            />
          </span>
          <span
            className="mt-[1.5mm] block"
            style={{ fontSize: "2.6mm", color: "var(--pp-ink-dim)" }}
          >
            Their stall page
          </span>
        </span>
      </div>
    </section>
  );
}

/** No partner attached — the space goes to the hunt itself rather than blank. */
function HouseBlock({ description }: { description: string }) {
  return (
    <section
      className="shrink-0"
      style={{ borderTop: "0.4mm solid var(--pp-rule)", padding: "7mm 14mm" }}
    >
      <p
        className="font-[family-name:var(--font-display)] tracking-[0.14em]"
        style={{ fontSize: "3mm", color: "var(--pp-gold-text)" }}
      >
        A MYTHICAL MECCA TRAIL
      </p>
      <p className="mt-[1.5mm]" style={{ fontSize: "3.6mm" }}>
        {description ||
          "Collect every stand on the trail, climb the standings, and claim the hoard."}
      </p>
    </section>
  );
}

/* ── one A4 sheet ────────────────────────────────────────────────────────── */

function Sheet({
  page,
  pack,
}: {
  page: PrintPage;
  pack: Awaited<ReturnType<typeof getPrintPack>>;
}) {
  if (!pack) return null;
  return (
    <article className="mm-sheet-page">
      <BandHeader questTitle={pack.title} eventTitle={pack.eventTitle} />

      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ padding: "12mm 14mm 8mm" }}
      >
        <div className="flex shrink-0 items-start gap-[5mm]">
          <span
            className="grid shrink-0 place-items-center font-[family-name:var(--font-display)]"
            style={{
              height: "16mm",
              width: "16mm",
              borderRadius: "9999px",
              background: "var(--pp-gold)",
              color: "#10182c",
              fontSize: "8mm",
            }}
          >
            {page.index}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="font-[family-name:var(--font-display)] leading-tight"
              style={{ fontSize: "9mm" }}
            >
              {page.title}
            </h2>
            {page.locationHint && (
              <p
                className="mt-[1mm] flex items-center gap-[1.5mm]"
                style={{ fontSize: "3.8mm", color: "var(--pp-ink-dim)" }}
              >
                <Icon icon="mdi:map-marker-outline" width={15} />
                {page.locationHint}
              </p>
            )}
          </div>
          <span
            className="shrink-0 font-[family-name:var(--font-display)] text-right"
            style={{ fontSize: "6mm", color: "var(--pp-gold-text)" }}
          >
            +{page.points}
            <span
              className="block tracking-[0.12em]"
              style={{ fontSize: "2.6mm", color: "var(--pp-ink-dim)" }}
            >
              POINTS
            </span>
          </span>
        </div>

        {page.prerequisiteTitle && (
          /* The one thing that stops a queue forming at the wrong stand: say
             what has to happen first, in the words an adventurer would use. */
          <div
            className="mt-[7mm] flex shrink-0 items-start gap-[3mm]"
            style={{
              border: `0.4mm dashed var(--pp-gold)`,
              borderRadius: "2.5mm",
              padding: "4mm 5mm",
            }}
          >
            <Icon
              icon="mdi:flag-outline"
              width={17}
              style={{ color: "var(--pp-gold-text)", flexShrink: 0 }}
            />
            <p style={{ fontSize: "3.8mm" }}>
              <strong>Have you done “{page.prerequisiteTitle}” yet?</strong>{" "}
              This one only opens once that is cleared.
            </p>
          </div>
        )}

        {page.tagQr ? <HeroCode page={page} /> : <NotesPanel page={page} />}
      </div>

      {page.partner ? (
        <VendorBlock partner={page.partner} />
      ) : (
        <HouseBlock description={pack.description} />
      )}

      <BandFooter origin={pack.origin} questQr={pack.questQr} />
    </article>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default async function QuestPrintPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; fromLabel?: string; only?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pack = await getPrintPack(slug);
  if (!pack) notFound();

  const stationsOnly = sp.only === "stations";
  const pages = stationsOnly
    ? pack.pages.filter((p) => p.tagQr)
    : pack.pages;

  const firstTag = pack.pages.find((p) => p.tagUrl)?.tagUrl;
  const warning = firstTag ? await tagHostWarning(firstTag) : null;

  const base = `/admin/quests/${pack.slug}/print`;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        {warning && (
          <div className="mm-glass mb-4 border-[var(--mm-gold)] p-4 text-sm">
            <Icon
              icon="mdi:alert-outline"
              width={16}
              className="mr-1.5 inline text-[var(--mm-gold)]"
            />
            {warning}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={forwardReturn(`/admin/quests/${pack.slug}`, sp)}
            className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--mm-text-dim)] hover:text-[var(--mm-text)]"
          >
            <Icon icon="mdi:chevron-left" width={16} /> Back to {pack.title}
          </Link>
          <div className="flex gap-2">
            <Link
              href={forwardReturn(base, sp)}
              aria-current={!stationsOnly ? "page" : undefined}
              className={`mm-btn text-sm ${
                stationsOnly ? "mm-btn-ghost" : "mm-btn-primary"
              }`}
            >
              Every objective ({pack.pages.length})
            </Link>
            <Link
              href={forwardReturn(`${base}?only=stations`, sp)}
              aria-current={stationsOnly ? "page" : undefined}
              className={`mm-btn text-sm ${
                stationsOnly ? "mm-btn-primary" : "mm-btn-ghost"
              }`}
            >
              Stands only ({pack.pages.filter((p) => p.tagQr).length})
            </Link>
          </div>
        </div>

        <p className="mb-4 text-sm text-[var(--mm-text-dim)]">
          One A4 sheet per objective, sized for the printer&apos;s Save as PDF.
          Print at 100% with margins set to none — the sheets carry their own.
          Answers are never printed: these go on a wall.
        </p>

        <PrintPackToolbar pageCount={pages.length} />
      </div>

      {pages.length === 0 ? (
        <p className="text-sm text-[var(--mm-text-dim)] print:hidden">
          {stationsOnly
            ? "No objectives are set to check in at a destination yet, so there is nothing with a code to print."
            : "This quest has no objectives yet."}
        </p>
      ) : (
        <div className="mm-pack" data-pack-theme="paper">
          {pages.map((p) => (
            <Sheet key={p.id} page={p} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}
