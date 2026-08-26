import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  events,
  partners,
  partnerGalleryItems,
  scavengerHunts,
  huntSteps,
  users,
} from "../lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — aborting seed.");
    process.exit(1);
  }
  console.log("Seeding Mythic Mecca…");

  // Events
  await db
    .insert(events)
    .values([
      { slug: "opening-night-revel", title: "Opening Night Revel", summary: "An evening to christen the new hall.", bodyMd: "We're throwing open the doors.", location: "The Hall, Woodstock", startsAt: new Date("2026-06-14T18:00:00Z"), endsAt: new Date("2026-06-14T23:00:00Z"), status: "live" },
      { slug: "midsummer-revel-2026", title: "Midsummer Revel 2026", summary: "A full-day gathering.", bodyMd: "The grand gathering of the year.", location: "Cape Town — The Hall", startsAt: new Date("2026-07-18T09:00:00Z"), endsAt: new Date("2026-07-18T20:00:00Z"), status: "published" },
    ])
    .onConflictDoNothing();

  // Partner + gallery
  const [partner] = await db
    .insert(partners)
    // status: seeded partners are live — the column defaults to `draft`, which
    // would keep them off the public site until an admin approved them.
    .values([{ slug: "neon-forge-minis", businessName: "Neon Forge Minis", tagline: "Hand-painted miniatures & 3D-printed terrain", bio: "A two-person studio.", status: "approved", socials: { instagram: "https://instagram.com" } }])
    .onConflictDoNothing()
    .returning();
  if (partner) {
    await db.insert(partnerGalleryItems).values([
      { partnerId: partner.id, title: "Mech squad", caption: "32mm scale", sort: 0 },
      { partnerId: partner.id, title: "Ruined city board", caption: "Modular terrain", sort: 1 },
    ]);
  }

  // Origin-flavoured events: partner-hosted, external repost, pending community
  const [seedPartner] = partner
    ? [partner]
    : await db.select().from(partners).where(eq(partners.slug, "neon-forge-minis")).limit(1);
  const [firstUser] = await db.select().from(users).limit(1);
  await db
    .insert(events)
    .values([
      {
        slug: "paint-and-take-at-neon-forge",
        title: "Paint & Take at Neon Forge",
        summary: "Mini-painting evening at the Neon Forge studio — brushes provided.",
        bodyMd: "Bring nothing but enthusiasm. Paints, brushes and a free mini to take home are on the house.",
        location: "Neon Forge Studio, Woodstock",
        startsAt: new Date("2026-07-25T17:00:00Z"),
        endsAt: new Date("2026-07-25T21:00:00Z"),
        status: "published",
        origin: "partner",
        partnerId: seedPartner?.id,
      },
      {
        slug: "cape-town-geek-fest-2026",
        title: "Cape Town Geek Fest 2026",
        summary: "The Mother City's biggest pop-culture festival — cosplay, gaming, artists.",
        bodyMd: "Not one of ours, but the collective will be there in force.",
        location: "CTICC, Cape Town",
        startsAt: new Date("2026-08-15T09:00:00Z"),
        endsAt: new Date("2026-08-16T18:00:00Z"),
        status: "published",
        origin: "external",
        sourceName: "Cape Town Geek Fest",
        externalUrl: "https://example.com/geek-fest",
      },
      {
        slug: "saturday-board-game-meetup",
        title: "Saturday board-game meetup",
        summary: "Casual games afternoon at Railways Cafe — newcomers welcome.",
        bodyMd: "Bring a game or join a table. We usually start with quick fillers.",
        location: "Railways Cafe, Irene",
        startsAt: new Date("2026-07-19T12:00:00Z"),
        endsAt: new Date("2026-07-19T17:00:00Z"),
        status: "pending",
        origin: "community",
        createdBy: firstUser?.id,
      },
    ])
    .onConflictDoNothing();

  // Quest — a trail around the venue.
  //
  // Most objectives are `qr_scan`: walk to a stand and check in there. That's
  // the shape a real event quest takes. The in-app puzzle types are seeded once
  // each so the other paths are exercisable without building a quest by hand.
  const [openingEvent] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, "opening-night-revel"))
    .limit(1);

  const [hunt] = await db
    .insert(scavengerHunts)
    .values([
      {
        slug: "opening-night-quest",
        title: "Opening Night Trail",
        description:
          "Walk the hall, meet the makers, collect a seal at every stand.",
        mode: "in_person",
        eventId: openingEvent?.id,
        active: true,
      },
    ])
    .onConflictDoNothing()
    .returning();

  if (hunt) {
    await db.insert(huntSteps).values([
      {
        huntId: hunt.id,
        sort: 0,
        type: "qr_scan",
        title: "The armourer's stand",
        prompt: "Say hello and ask what they're working on.",
        points: 20,
        partnerId: seedPartner?.id,
        locationHint: "Hall A, stand 3",
        revealMode: "direct",
        claimMode: "live_code",
      },
      {
        huntId: hunt.id,
        sort: 1,
        type: "qr_scan",
        title: "The one who paints small things",
        // A clue objective hides the destination until it's claimed, so the
        // prompt has to be enough to find them on its own.
        prompt:
          "Seek the hand that makes giants of thimble-sized knights. Their table glitters under the west windows.",
        points: 25,
        locationHint: "Hall B, stand 14",
        revealMode: "clue",
        claimMode: "live_code",
      },
      {
        huntId: hunt.id,
        sort: 2,
        type: "riddle",
        title: "The riddle lock",
        prompt: "I have keys but open no locks. What am I?",
        points: 10,
        config: { answer: "keyboard" },
      },
      {
        huntId: hunt.id,
        sort: 3,
        type: "trivia_gate",
        title: "Guild lore",
        prompt: "Which standing sits between Squire and Champion?",
        points: 15,
        config: { choices: ["Knight", "Novice", "Legend", "Warden"], correct: 0 },
      },
      {
        huntId: hunt.id,
        sort: 4,
        type: "photo_proof",
        title: "Adventurer's portrait",
        prompt: "Upload a likeness of you somewhere in the hall.",
        points: 15,
        config: { auto_approve: true },
      },
    ]);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
