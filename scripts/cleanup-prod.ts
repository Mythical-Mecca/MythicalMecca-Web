import "dotenv/config";
import { neon } from "@neondatabase/serverless";

/**
 * One-off pre-launch tidy: strip the seed and test content, keep the real
 * stuff. Dry run by default — pass `--commit` to actually delete.
 *
 *   pnpm tsx scripts/cleanup-prod.ts            # show what would go
 *   pnpm tsx scripts/cleanup-prod.ts --commit   # do it
 *
 * Deleting an event or a quest takes its children with it via ON DELETE
 * CASCADE (steps, stations, progress, claim attempts, comments, reviews,
 * registrations, event gallery), so only the parent rows are named here.
 */

const KEEP_EVENT_SLUG = "geeks-work-winter-edition-ms6em5rq";
const KEEP_QUEST_SLUG = "test-quest-01-msa1cu4i";

/**
 * Deliberately NOT touched:
 *  - partners, partner_categories, partner_gallery_items — the vendors
 *  - user, account, session — every login
 *  - collab_submissions, partner_applications — these may be real enquiries
 *    from real people rather than seed data. Nothing here can bring them back,
 *    so they are left alone; delete them by hand if you know they're junk.
 */
const COMMIT = process.argv.includes("--commit");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — aborting.");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  const host = new URL(process.env.DATABASE_URL).host;
  console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} against ${host}\n`);

  const doomedEvents = await sql`
    select slug, title from events where slug <> ${KEEP_EVENT_SLUG} order by title`;
  const doomedQuests = await sql`
    select slug, title from scavenger_hunts where slug <> ${KEEP_QUEST_SLUG} order by title`;
  const [{ n: galleryCount }] = await sql`select count(*)::int n from gallery_items`;
  const [{ n: activityCount }] = await sql`select count(*)::int n from activity_log`;
  const [{ n: hitsCount }] = await sql`select count(*)::int n from page_hits`;
  const [{ n: errorCount }] = await sql`select count(*)::int n from error_log`;

  console.log(`Events to delete (${doomedEvents.length}):`);
  doomedEvents.forEach((e) => console.log(`   - ${e.title}  [${e.slug}]`));
  console.log(`\nQuests to delete (${doomedQuests.length}):`);
  doomedQuests.forEach((q) => console.log(`   - ${q.title}  [${q.slug}]`));
  console.log(`\nAlso clearing:`);
  console.log(`   - gallery_items   ${galleryCount}`);
  console.log(`   - activity_log    ${activityCount}`);
  console.log(`   - page_hits       ${hitsCount}`);
  console.log(`   - error_log       ${errorCount}`);
  console.log(`\nKeeping: event "${KEEP_EVENT_SLUG}", quest "${KEEP_QUEST_SLUG}",`);
  console.log(`         all partners, all users, collab_submissions, partner_applications`);

  if (!COMMIT) {
    console.log(`\nNothing changed. Re-run with --commit to apply.`);
    return;
  }

  // Quests first: a quest points at an event with ON DELETE SET NULL, so
  // removing events first would silently unlink a surviving quest.
  const q = await sql`
    delete from scavenger_hunts where slug <> ${KEEP_QUEST_SLUG} returning slug`;
  const e = await sql`
    delete from events where slug <> ${KEEP_EVENT_SLUG} returning slug`;
  await sql`delete from gallery_items`;
  await sql`delete from activity_log`;
  await sql`delete from page_hits`;
  await sql`delete from error_log`;

  console.log(`\nDeleted ${q.length} quest(s) and ${e.length} event(s), plus logs and gallery.`);

  const [{ n: events }] = await sql`select count(*)::int n from events`;
  const [{ n: quests }] = await sql`select count(*)::int n from scavenger_hunts`;
  const [{ n: steps }] = await sql`select count(*)::int n from hunt_steps`;
  const [{ n: partners }] = await sql`select count(*)::int n from partners`;
  const [{ n: users }] = await sql`select count(*)::int n from "user"`;
  console.log(
    `\nRemaining — events:${events} quests:${quests} steps:${steps} partners:${partners} users:${users}`
  );

  const [link] = await sql`
    select h.slug qslug, e.slug eslug
    from scavenger_hunts h left join events e on e.id = h.event_id`;
  console.log(
    `Quest link intact: ${link?.qslug ?? "(none)"} -> ${link?.eslug ?? "(NOT LINKED)"}`
  );
}

main().then(() => process.exit(0));
