import "server-only";
import { db } from "@/lib/db";
import { scavengerHunts, huntSteps, events, partners } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { tagUrl, appUrl, MissingSigningSecretError } from "@/lib/qr";
import { qrDataUrl } from "@/lib/qrcode";
import { parseSocials, type SocialLink } from "@/lib/socials";
import { toMediaSrc } from "@/lib/media";
import type { StepType, ClaimMode } from "@/lib/hunts";

const useDb = !!process.env.DATABASE_URL;

/**
 * The station pack — one printable A4 page per objective.
 *
 * Deliberately a separate read from `getQuestAdmin`. The pack needs the whole
 * partner record (logo, tagline, bio, socials) and a QR bitmap per page, none
 * of which the quest manager screen has any use for; loading them on every
 * admin page view would be waste for a page printed once an event.
 *
 * What is NOT here, on purpose: `huntSteps.config`. It holds riddle answers,
 * and these sheets are pinned up in public — the whole point is that they
 * double as signage. An answer key is a different artifact with a different
 * audience, and mixing the two is how an answer ends up on a wall.
 */

/** A social link reduced to what fits on paper: an icon and a short handle. */
export interface PrintSocial {
  icon: string;
  label: string;
  /** "@handle" where the platform has one, otherwise a bare hostname. */
  handle: string;
}

export interface PrintPage {
  id: string;
  index: number;
  type: StepType;
  claimMode: ClaimMode;
  title: string;
  prompt: string;
  points: number;
  locationHint: string | null;
  /** Title of the objective that must be cleared first, if any. */
  prerequisiteTitle: string | null;
  /** Present only for objectives claimed at the destination. */
  tagUrl: string | null;
  tagQr: string | null;
  partner: {
    name: string;
    tagline: string | null;
    bio: string | null;
    logoSrc: string | null;
    shopUrl: string | null;
    pageUrl: string;
    pageQr: string;
    socials: PrintSocial[];
  } | null;
}

export interface PrintPack {
  slug: string;
  title: string;
  description: string;
  sequential: boolean;
  eventTitle: string;
  eventLocation: string | null;
  eventStartsAt: Date | null;
  /** QR to the public quest page — the way back in, printed on every sheet. */
  questUrl: string;
  questQr: string;
  origin: string;
  /** The emblem, inlined. Only populated when `embedImages` is on. */
  logo: string | null;
  pages: PrintPage[];
}

/**
 * Turn a profile URL into something worth printing.
 *
 * A full URL on paper is dead weight — nobody types
 * `https://www.instagram.com/thing/` off a poster. The handle is what someone
 * searches for, so that is what gets the space.
 */
function toHandle(link: SocialLink): string {
  try {
    const url = new URL(link.url);
    if (link.key === "website") return url.hostname.replace(/^www\./, "");
    const first = url.pathname.split("/").filter(Boolean)[0];
    if (!first) return url.hostname.replace(/^www\./, "");
    return first.startsWith("@") ? first : `@${first}`;
  } catch {
    return link.label;
  }
}

/** Objectives claimed by turning up — the only ones a printed tag applies to. */
function needsTag(type: StepType): boolean {
  return type === "qr_scan";
}

/**
 * Inline an image as a data URL, for the PDF renderer.
 *
 * The HTML sheet can point an `<img>` at `/api/media?…` and let the browser
 * fetch it. A PDF has no browser and no session, so the bytes have to be in
 * hand at render time — and partner logos live in a private Blob store whose
 * URLs are not fetchable at all. Reading through the same SDK call the media
 * proxy uses avoids the server making an HTTP request to itself.
 *
 * Failure returns null rather than throwing: a missing logo should cost the
 * pack a logo, not the whole document.
 */
async function embedImage(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    if (src.startsWith("/api/media?")) {
      const pathname = new URL(src, "http://local").searchParams.get("pathname");
      if (!pathname) return null;
      const { get } = await import("@vercel/blob");
      const found = await get(pathname, { access: "private" });
      if (!found) return null;
      const bytes = Buffer.from(await new Response(found.stream).arrayBuffer());
      const mime = found.blob.contentType ?? "image/png";
      return `data:${mime};base64,${bytes.toString("base64")}`;
    }
    if (src.startsWith("/")) {
      const [fs, path] = await Promise.all([
        import("node:fs/promises"),
        import("node:path"),
      ]);
      const bytes = await fs.readFile(
        path.join(process.cwd(), "public", src.replace(/^\/+/, ""))
      );
      const ext = path.extname(src).slice(1).toLowerCase();
      const mime = ext === "jpg" ? "jpeg" : ext === "svg" ? "svg+xml" : ext;
      return `data:image/${mime};base64,${bytes.toString("base64")}`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPrintPack(
  slug: string,
  /**
   * Inline every image as a data URL. Costs a Blob read per partner logo, so
   * the HTML preview leaves it off and lets the browser fetch as usual; the
   * PDF renderer has no browser and needs it on.
   */
  opts: { embedImages?: boolean } = {}
): Promise<PrintPack | null> {
  if (!useDb) return null;
  try {
    const [row] = await db
      .select({
        h: scavengerHunts,
        eventTitle: events.title,
        eventLocation: events.location,
        eventStartsAt: events.startsAt,
      })
      .from(scavengerHunts)
      .innerJoin(events, eq(scavengerHunts.eventId, events.id))
      .where(eq(scavengerHunts.slug, slug))
      .limit(1);
    if (!row) return null;

    const steps = await db
      .select({ s: huntSteps, p: partners })
      .from(huntSteps)
      .leftJoin(partners, eq(huntSteps.partnerId, partners.id))
      .where(eq(huntSteps.huntId, row.h.id))
      .orderBy(asc(huntSteps.sort));

    // Prerequisites point at sibling steps, so the titles are already in hand —
    // no second query, and a dangling parentId simply yields no callout.
    const titleById = new Map(steps.map((r) => [r.s.id, r.s.title]));

    const origin = appUrl();
    const questUrl = `${origin}/quests/${row.h.slug}`;

    const pages: PrintPage[] = await Promise.all(
      steps.map(async (r, i) => {
        const tag = needsTag(r.s.type) ? tagUrl(r.s.id) : null;
        const partner = r.p;
        return {
          id: r.s.id,
          index: i + 1,
          type: r.s.type,
          claimMode: r.s.claimMode,
          title: r.s.title,
          prompt: r.s.prompt ?? "",
          points: r.s.points,
          locationHint: r.s.locationHint,
          prerequisiteTitle: r.s.parentId
            ? (titleById.get(r.s.parentId) ?? null)
            : null,
          tagUrl: tag,
          // 1000px keeps an 85mm print near 300dpi; the partner code is a
          // quarter the size on paper and does not need the same bitmap.
          tagQr: tag ? await qrDataUrl(tag, 1000) : null,
          partner: partner
            ? {
                name: partner.businessName,
                tagline: partner.tagline,
                bio: partner.bio,
                logoSrc: opts.embedImages
                  ? await embedImage(toMediaSrc(partner.logoUrl))
                  : toMediaSrc(partner.logoUrl),
                shopUrl: partner.shopUrl,
                pageUrl: `${origin}/partners/${partner.slug}`,
                pageQr: await qrDataUrl(
                  `${origin}/partners/${partner.slug}`,
                  600
                ),
                socials: parseSocials(partner.socials).map((l) => ({
                  icon: l.icon,
                  label: l.label,
                  handle: toHandle(l),
                })),
              }
            : null,
        };
      })
    );

    return {
      slug: row.h.slug,
      title: row.h.title,
      description: row.h.description ?? "",
      sequential: row.h.sequential,
      eventTitle: row.eventTitle,
      eventLocation: row.eventLocation,
      eventStartsAt: row.eventStartsAt,
      questUrl,
      questQr: await qrDataUrl(questUrl, 600),
      origin,
      logo: opts.embedImages ? await embedImage("/MMRefined2026.png") : null,
      pages,
    };
  } catch (e) {
    // Same reasoning as getQuestAdmin: an unset signing secret is a deployment
    // fault and must not be rendered as a missing quest.
    if (e instanceof MissingSigningSecretError) throw e;
    return null;
  }
}
