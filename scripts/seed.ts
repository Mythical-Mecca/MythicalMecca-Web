import "dotenv/config";
import { db } from "../lib/db";
import {
  posts,
  events,
  vendors,
  vendorGalleryItems,
  badges,
  games,
  seasons,
  scavengerHunts,
  huntSteps,
} from "../lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — aborting seed.");
    process.exit(1);
  }
  console.log("Seeding Mythic Mecha…");

  // Badges
  await db
    .insert(badges)
    .values([
      { code: "first_contact", name: "First Contact", tier: "bronze", description: "Logged in for the first time." },
      { code: "hunt_started", name: "Recon Initiate", tier: "bronze", description: "Cleared a hunt objective." },
      { code: "hunt_master", name: "Hunt Master", tier: "gold", description: "Completed a full hunt." },
      { code: "armorer", name: "Armorer", tier: "silver", description: "Approved as a vendor." },
    ])
    .onConflictDoNothing();

  // Arcade
  await db
    .insert(games)
    .values([
      { slug: "reaction", title: "Reaction Sim", description: "Wait for the lock, then fire. Fastest reflexes win." },
    ])
    .onConflictDoNothing();

  // Season
  await db
    .insert(seasons)
    .values([{ name: "Season 1 — Ignition", active: true }])
    .onConflictDoNothing();

  // Posts
  await db
    .insert(posts)
    .values([
      { slug: "the-doors-are-open", title: "The doors are open", excerpt: "Mythic Mecha is reborn.", bodyMd: "We rebuilt the hall from the foundation stones up.\n\nFour guilds, one hearth.", status: "published", publishedAt: new Date("2026-06-10") },
      { slug: "midsummer-revel-announced", title: "Midsummer Revel announced", excerpt: "Our grandest gathering yet.", bodyMd: "Mark your calendars, adventurers.", status: "published", publishedAt: new Date("2026-06-04") },
    ])
    .onConflictDoNothing();

  // Events
  await db
    .insert(events)
    .values([
      { slug: "opening-night-revel", title: "Opening Night Revel", summary: "An evening to christen the new hall.", bodyMd: "We're throwing open the doors.", location: "The Hall, Woodstock", startsAt: new Date("2026-06-14T18:00:00Z"), endsAt: new Date("2026-06-14T23:00:00Z"), status: "live" },
      { slug: "midsummer-revel-2026", title: "Midsummer Revel 2026", summary: "A full-day gathering.", bodyMd: "The grand gathering of the year.", location: "Cape Town — The Hall", startsAt: new Date("2026-07-18T09:00:00Z"), endsAt: new Date("2026-07-18T20:00:00Z"), status: "published" },
    ])
    .onConflictDoNothing();

  // Vendor + gallery
  const [vendor] = await db
    .insert(vendors)
    .values([{ slug: "neon-forge-minis", businessName: "Neon Forge Minis", tagline: "Hand-painted miniatures & 3D-printed terrain", bio: "A two-person studio.", socials: { raw: "https://instagram.com" } }])
    .onConflictDoNothing()
    .returning();
  if (vendor) {
    await db.insert(vendorGalleryItems).values([
      { vendorId: vendor.id, title: "Mech squad", caption: "32mm scale", sort: 0 },
      { vendorId: vendor.id, title: "Ruined city board", caption: "Modular terrain", sort: 1 },
    ]);
  }

  // Hunt + steps
  const [hunt] = await db
    .insert(scavengerHunts)
    .values([{ slug: "opening-night-quest", title: "Opening Night Quest", description: "Six trials to christen the new hall.", mode: "hybrid", active: true }])
    .onConflictDoNothing()
    .returning();
  if (hunt) {
    await db.insert(huntSteps).values([
      { huntId: hunt.id, sort: 0, type: "riddle", title: "The riddle lock", prompt: "I have keys but open no locks. What am I?", points: 10, config: { answer: "keyboard" } },
      { huntId: hunt.id, sort: 1, type: "unlock_code", title: "Gatehouse password", prompt: "Find the password near the artisans' market.", points: 10, config: { code: "ALPHA-7" } },
      { huntId: hunt.id, sort: 2, type: "trivia_gate", title: "Guild lore", prompt: "Which standing sits between Squire and Champion?", points: 15, config: { choices: ["Knight", "Novice", "Legend", "Warden"], correct: 0 } },
      { huntId: hunt.id, sort: 3, type: "geo_checkpoint", title: "Reach the waypoint", prompt: "Check in at the hall's coordinates.", points: 20, config: { lat: -33.9249, lng: 18.4241, radius_m: 50000 } },
      { huntId: hunt.id, sort: 4, type: "qr_scan", title: "The rune seal", prompt: "Find the rune seal at the training yard.", points: 20, config: {} },
      { huntId: hunt.id, sort: 5, type: "photo_proof", title: "Adventurer's portrait", prompt: "Upload a likeness with your token.", points: 15, config: { auto_approve: true } },
    ]);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
